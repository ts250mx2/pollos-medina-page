import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { obtenerLlave, HlClienteError, type ApiIA, type RespaldoIA } from "../hl-cliente";
import { menuCompleto } from "../services/menu";
import { paraSitio as sucursalesParaSitio } from "../services/sucursales";
import { crearPedido, type Pedido } from "../services/pedidos";
import { cotizarEnvio } from "../services/envio";

// ============================================================
//  "poyito": agente de ventas (function-calling) que toma pedidos.
//  El PROVEEDOR, el modelo y la llave salen de HL Servidor (hl-cliente),
//  NO del .env. Según el proveedor que asigne HL corre Claude u OpenAI
//  (mismo juego de herramientas). La llave nunca llega al navegador; para
//  cambiar el modelo se ajusta el agente en el portal de HL.
// ============================================================

const MAX_PASOS = 8;

const SISTEMA = `Eres "poyito", el asistente de ventas de Pollo Medina, la pollería de pollo asado al carbón
("Pura Vitamina desde 1989"). Hablas español de México, cálido, entusiasta y breve, buen vendedor sin ser
pesado (un 🐔 ocasional está bien). Tu meta es que el cliente arme un pedido rico y completo, y registrarlo.

CÓMO VENDES:
- Consulta el menú con ver_menu antes de ofrecer nada. SOLO ofreces productos y PRECIOS que estén en el menú;
  nunca inventes.
- Sé visual: cuando presentes opciones, el producto principal o sugerencias, llama a mostrar_productos con
  sus nombres para que se vean con foto.
- Haz upsell natural: si piden pollo, sugiere complementos reales del menú (papitas, tortillas, salsas,
  refrescos, postres). Ofrece 1-3 sugerencias con mostrar_productos; no insistas si dicen que no.
- Si un producto tiene opciones/variantes, pregúntalas. El precio_unitario = precio base + extras elegidos.

RECOGER O DOMICILIO:
- Pregunta si es para recoger en sucursal o a domicilio.
- Domicilio: pide que comparta su ubicación (en el chat hay un botón "Compartir ubicación"). Cuando recibas
  coordenadas (lat, lng), llama a cotizar_envio para saber la sucursal más cercana, la distancia y el costo
  de envío. Si está fuera de cobertura, avísale con amabilidad y ofrece que lo recoja. Suma el envío al total.
- Recoger: puedes preguntar de qué sucursal con ver_sucursales.

CERRAR:
- Pregunta la forma de pago: efectivo, tarjeta (terminal al recibir/recoger) o transferencia. Si es efectivo,
  puedes preguntar con cuánto paga para llevar cambio y anótalo en notas.
- Antes de registrar, confirma el resumen: productos, envío (si aplica), total y forma de pago.
- Con la confirmación, llama a crear_pedido incluyendo items, tipo, datos del cliente (nombre y teléfono),
  forma_pago, y si es domicilio: direccion, sucursal y envio (el costo que devolvió cotizar_envio).
- Al terminar da el folio y di que en el mostrador ya ven su pedido. El pago es al recibir/recoger; NO pidas
  números de tarjeta ni datos bancarios, solo cómo va a pagar.`;

// Definición canónica de herramientas (una sola vez). De aquí se derivan los
// formatos de OpenAI (function tools) y de Anthropic (input_schema).
interface HerramientaBase { name: string; description: string; schema: Record<string, any> }

const TOOLS_BASE: HerramientaBase[] = [
  {
    name: "ver_menu",
    description: "Menú de Pollo Medina: categorías, productos, precios y opciones. Úsalo antes de ofrecer productos.",
    schema: { type: "object", properties: { buscar: { type: "string", description: "Opcional: filtra por texto." } } },
  },
  {
    name: "mostrar_productos",
    description: "Muestra productos con su foto en el chat (tarjetas visuales). Úsalo para presentar opciones, el producto elegido o sugerencias de complementos. Pasa los NOMBRES tal como están en el menú.",
    schema: {
      type: "object",
      properties: { productos: { type: "array", items: { type: "string" }, description: "Nombres de productos del menú a mostrar." } },
      required: ["productos"],
    },
  },
  {
    name: "ver_sucursales",
    description: "Lista las sucursales (nombre, ciudad, dirección) para pedidos a recoger.",
    schema: { type: "object", properties: {} },
  },
  {
    name: "cotizar_envio",
    description: "Calcula la sucursal más cercana, la distancia y el costo de envío a domicilio a partir de las coordenadas del cliente.",
    schema: { type: "object", properties: { lat: { type: "number" }, lng: { type: "number" } }, required: ["lat", "lng"] },
  },
  {
    name: "crear_pedido",
    description: "Registra el pedido ya confirmado por el cliente.",
    schema: {
      type: "object",
      properties: {
        cliente_nombre: { type: "string" },
        cliente_telefono: { type: "string" },
        tipo: { type: "string", enum: ["domicilio", "recoger"] },
        direccion: { type: "string", description: "Requerida si tipo = domicilio." },
        sucursal: { type: "string", description: "Nombre de la sucursal." },
        envio: { type: "number", description: "Costo de envío (de cotizar_envio). 0 si recoger." },
        forma_pago: { type: "string", description: "efectivo | tarjeta | transferencia" },
        notas: { type: "string" },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              producto: { type: "string" },
              cantidad: { type: "number" },
              precio_unitario: { type: "number", description: "Precio base + extras de las opciones." },
              opciones: { type: "string" },
              notas: { type: "string" },
            },
            required: ["producto", "cantidad", "precio_unitario"],
          },
        },
      },
      required: ["cliente_nombre", "tipo", "items"],
    },
  },
];

// Responses API: las function tools van planas (name/parameters al nivel del item).
const TOOLS_OPENAI: OpenAI.Responses.FunctionTool[] = TOOLS_BASE.map((t) => ({
  type: "function",
  name: t.name,
  description: t.description,
  parameters: t.schema,
  strict: false,
}));

const TOOLS_CLAUDE: Anthropic.Tool[] = TOOLS_BASE.map((t) => ({
  name: t.name,
  description: t.description,
  input_schema: t.schema as Anthropic.Tool.InputSchema,
}));

const money = (n: number) => `$${Number(n || 0).toFixed(0)}`;

export interface Tarjeta { nombre: string; precio: number; img: string | null; desc?: string | null }

async function productosPlanos() {
  const cats = await menuCompleto(true);
  const out: any[] = [];
  for (const c of cats) for (const p of c.productos || []) out.push({ ...p, categoria: c.nombre });
  return out;
}

async function textoMenu(buscar?: string): Promise<string> {
  const cats = await menuCompleto(true);
  const q = (buscar || "").trim().toLowerCase();
  const lineas: string[] = [];
  for (const c of cats) {
    const prods = (c.productos || []).filter((p: any) => !q || `${p.nombre} ${p.desc || ""}`.toLowerCase().includes(q));
    if (!prods.length) continue;
    lineas.push(`## ${c.nombre}`);
    for (const p of prods) {
      let l = `- ${p.nombre} — ${money(p.precio)}`;
      const ops = (p.opciones || []) as any[];
      if (ops.length) {
        l += `  [opciones: ${ops.map((o) => `${o.etiqueta}: ${(o.elecciones || []).map((e: any) => e.extra ? `${e.etiqueta} (+${money(e.extra)})` : e.etiqueta).join(" / ")}`).join("; ")}]`;
      }
      lineas.push(l);
    }
  }
  return lineas.length ? lineas.join("\n") : "No se encontraron productos.";
}

interface ResultadoTool { text: string; error?: boolean; pedido?: Pedido; tarjetas?: Tarjeta[] }

async function ejecutarTool(nombre: string, input: any): Promise<ResultadoTool> {
  try {
    if (nombre === "ver_menu") return { text: await textoMenu(input?.buscar) };

    if (nombre === "ver_sucursales") {
      const suc = await sucursalesParaSitio();
      return { text: suc.length ? suc.map((s: any) => `- ${s.nombre}${s.direccion ? ` — ${s.direccion}` : ""}`).join("\n") : "Sin sucursales." };
    }

    if (nombre === "mostrar_productos") {
      const nombres: string[] = Array.isArray(input?.productos) ? input.productos : [];
      const todos = await productosPlanos();
      const tarjetas: Tarjeta[] = [];
      for (const n of nombres) {
        const q = String(n).trim().toLowerCase();
        const m = todos.find((p) => p.nombre.toLowerCase() === q) || todos.find((p) => p.nombre.toLowerCase().includes(q));
        if (m && !tarjetas.some((t) => t.nombre === m.nombre)) {
          tarjetas.push({ nombre: m.nombre, precio: Number(m.precio), img: m.img || null, desc: m.desc || null });
        }
      }
      if (!tarjetas.length) return { text: "No se encontraron esos productos en el menú.", error: true };
      return { text: `Mostrando: ${tarjetas.map((t) => t.nombre).join(", ")}.`, tarjetas };
    }

    if (nombre === "cotizar_envio") {
      const c = await cotizarEnvio(Number(input?.lat), Number(input?.lng));
      return { text: `${c.mensaje} (sucursal_id=${c.sucursal_id ?? ""}, km=${c.km}, cubre=${c.cubre}, envio=${c.precio})` };
    }

    if (nombre === "crear_pedido") {
      const pedido = await crearPedido({ ...input, origen: "pollito" });
      return { pedido, text: `Pedido registrado. Folio ${pedido.folio}. Subtotal ${money(pedido.subtotal)}, envío ${money(pedido.envio)}, total ${money(pedido.total)}.` };
    }

    return { text: `Herramienta desconocida: ${nombre}`, error: true };
  } catch (e: any) {
    return { text: `Error: ${e?.message || "no se pudo completar"}`, error: true };
  }
}

export interface TurnoPollito {
  reply: string;
  /** Proveedor y modelo de IA que atendieron el turno (según HL Console). */
  ia?: { proveedor: string; modelo: string };
  pedido?: { folio: string; total: number } | null;
  tarjetas?: Tarjeta[];
}

type MensajeVisible = { role: "user" | "assistant"; content: string };

/** Acumula pedido/tarjetas mientras corre el loop de cualquier proveedor. */
interface Acumulador { pedido: { folio: string; total: number } | null; tarjetas: Tarjeta[] }

function aplicarResultado(acc: Acumulador, out: ResultadoTool) {
  if (out.pedido) acc.pedido = { folio: out.pedido.folio, total: out.pedido.total };
  if (out.tarjetas) for (const t of out.tarjetas) if (!acc.tarjetas.some((x) => x.nombre === t.nombre)) acc.tarjetas.push(t);
}

/**
 * Ejecuta un turno del agente. El proveedor/modelo/llave vienen de HL: según el
 * proveedor asignado corre Claude u OpenAI, con el mismo juego de herramientas.
 * `mensajes` es el historial visible (user/assistant, texto).
 */
/** Proveedores que hablan el API de OpenAI: se corren con el SDK de OpenAI apuntando a su baseURL. */
const COMPATIBLES_OPENAI = new Set(["openai", "deepseek", "groq", "mistral", "xai", "openrouter", "kimi", "qwen", "glm"]);

/** Con qué SDK se corre el proveedor: manda el campo `api` de HL; sin él, se deduce del nombre. */
function sdkPara(proveedor: string, api?: ApiIA | null): "claude" | "openai" | null {
  if (api === "anthropic") return "claude";
  if (api === "openai") return "openai";
  if (api) return null;
  const limpio = proveedor.trim().toLowerCase();
  if (limpio === "claude") return "claude";
  return COMPATIBLES_OPENAI.has(limpio) ? "openai" : null;
}

export async function correrPollito(mensajes: MensajeVisible[]): Promise<TurnoPollito> {
  const cred = await obtenerLlave("poyito");
  const visibles = mensajes.filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim()
  );

  const correr = async (c: Pick<RespaldoIA, "proveedor" | "api" | "modelo" | "llave">): Promise<TurnoPollito> => {
    const sdk = sdkPara(c.proveedor, c.api);
    const ia = { proveedor: c.proveedor.trim().toLowerCase(), modelo: c.modelo };
    if (sdk === "openai") return { ...(await loopOpenAI(c.modelo, c.llave, visibles)), ia };
    if (sdk === "claude") return { ...(await loopClaude(c.modelo, c.llave, visibles)), ia };
    throw new HlClienteError(`HL asignó a poyito el proveedor "${c.proveedor}", que este agente no sabe correr (solo los que hablan el API de Anthropic o de OpenAI).`);
  };

  try {
    return await correr(cred);
  } catch (error) {
    // Llave de respaldo (configurada en HL): solo si el fallo es del servicio o de la cuenta, no de nuestra peticion.
    if (!cred.respaldo || !esFalloDelServicio(error)) throw error;
    console.warn(`[poyito] ${cred.modelo} falló (${describirError(error)}); se repite con la llave de respaldo "${cred.respaldo.nombre}" (${cred.respaldo.modelo})`);
    return correr(cred.respaldo);
  }
}

/** Sin conexion, timeout, limite (429), llave invalida o sin saldo (401/402/403) y errores 5xx: vale la pena reintentar con el respaldo. */
function esFalloDelServicio(error: unknown): boolean {
  if (error instanceof OpenAI.APIConnectionError || error instanceof Anthropic.APIConnectionError) return true;
  const status = error instanceof OpenAI.APIError || error instanceof Anthropic.APIError ? error.status : undefined;
  if (typeof status !== "number") return false;
  return status === 401 || status === 402 || status === 403 || status === 408 || status === 429 || status >= 500;
}

function describirError(error: unknown): string {
  if (error instanceof OpenAI.APIError || error instanceof Anthropic.APIError) return `${error.status ?? "sin conexión"}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

// ---------- OpenAI (Responses API + function tools) ----------
// Se usa /v1/responses y no chat/completions: los modelos con razonamiento (gpt-5.x)
// solo aceptan herramientas junto con razonamiento en este endpoint. Se corre sin
// almacenar la conversacion en OpenAI (store: false); el razonamiento cifrado se
// pide de vuelta para poder reenviarlo entre pasos del mismo turno.
async function loopOpenAI(modelo: string, llave: string, visibles: MensajeVisible[]): Promise<TurnoPollito> {
  const client = new OpenAI({ apiKey: llave });
  const input: OpenAI.Responses.ResponseInputItem[] = visibles.map((m) => ({ role: m.role, content: m.content }));
  const acc: Acumulador = { pedido: null, tarjetas: [] };

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const res = await client.responses.create({
      model: modelo,
      instructions: SISTEMA,
      input,
      tools: TOOLS_OPENAI,
      tool_choice: "auto",
      max_output_tokens: 1500,
      store: false,
      include: ["reasoning.encrypted_content"],
    });
    // Todo lo que produjo el modelo (mensajes, llamadas y razonamiento) vuelve como contexto del siguiente paso.
    input.push(...(res.output as OpenAI.Responses.ResponseInputItem[]));

    const llamadas = res.output.filter((o): o is OpenAI.Responses.ResponseFunctionToolCall => o.type === "function_call");
    if (llamadas.length > 0) {
      for (const tc of llamadas) {
        let args: any = {};
        try { args = JSON.parse(tc.arguments || "{}"); } catch { /* argumentos vacíos */ }
        const out = await ejecutarTool(tc.name, args);
        aplicarResultado(acc, out);
        input.push({ type: "function_call_output", call_id: tc.call_id, output: out.text });
      }
      continue;
    }

    const reply = (res.output_text || "").trim();
    return { reply: reply || "¿Me repites, porfa?", pedido: acc.pedido, tarjetas: acc.tarjetas };
  }
  return { reply: "Uy, me enredé tantito. ¿Me repites tu pedido?", pedido: acc.pedido, tarjetas: acc.tarjetas };
}

// ---------- Claude (messages + tool_use / tool_result) ----------
async function loopClaude(modelo: string, llave: string, visibles: MensajeVisible[]): Promise<TurnoPollito> {
  const client = new Anthropic({ apiKey: llave });
  const msgs: Anthropic.MessageParam[] = visibles.map((m) => ({ role: m.role, content: m.content }));
  const acc: Acumulador = { pedido: null, tarjetas: [] };

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const res = await client.messages.create({
      model: modelo,
      max_tokens: 1500,
      system: SISTEMA,
      tools: TOOLS_CLAUDE,
      messages: msgs,
    });
    msgs.push({ role: "assistant", content: res.content });

    if (res.stop_reason === "tool_use") {
      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const bloque of res.content) {
        if (bloque.type !== "tool_use") continue;
        const out = await ejecutarTool(bloque.name, bloque.input);
        aplicarResultado(acc, out);
        resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: out.text, is_error: out.error === true });
      }
      msgs.push({ role: "user", content: resultados });
      continue;
    }

    const reply = res.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("\n").trim();
    return { reply: reply || "¿Me repites, porfa?", pedido: acc.pedido, tarjetas: acc.tarjetas };
  }
  return { reply: "Uy, me enredé tantito. ¿Me repites tu pedido?", pedido: acc.pedido, tarjetas: acc.tarjetas };
}
