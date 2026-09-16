/**
 * Cliente de HL Servidor: de ahí salen el proveedor, el modelo y la llave del
 * agente Pollito. Del .env SOLO se leen los datos para hablar con HL:
 *   HL_URL           = http://localhost:3055        (sin diagonal final)
 *   HL_API_KEY       = hl_ + 48 hex                 (key de acceso de esta app)
 *   HL_AGENTE_POYITO = UUID del agente Pollito en HL
 *   HL_TTL_MIN       = 30                            (opcional, minutos de cache)
 *
 * Cambiar de modelo o rotar la llave se hace en el portal de HL; se toma al
 * vencer el cache (HL_TTL_MIN) o al llamar limpiarCacheLlave(). Adaptado de
 * vidaurri-ia/src/lib/hl-cliente.ts a un solo agente.
 */

export type AgenteHl = "poyito";

export type EntornoHl = Record<string, string | undefined>;

/**
 * UUID del agente en HL. Este sitio tiene un solo agente, así que se usa la
 * variable estándar HL_AGENTE (como el hl-servidor original); se acepta también
 * HL_AGENTE_POYITO por si se prefiere el nombre explícito.
 */
function uuidAgente(env: EntornoHl): string {
  return (env.HL_AGENTE_POYITO ?? env.HL_AGENTE ?? "").trim();
}

/** ¿Tiene UUID en el entorno? */
export function agenteConfigurado(_agente: AgenteHl, env: EntornoHl = process.env): boolean {
  return uuidAgente(env) !== "";
}

/** ¿Están todos los datos para hablar con HL y pedir la llave del agente? */
export function hlConfigurado(agente: AgenteHl, env: EntornoHl = process.env): boolean {
  return (env.HL_URL ?? "").trim() !== "" && (env.HL_API_KEY ?? "").trim() !== "" && agenteConfigurado(agente, env);
}

/** Con qué SDK se habla el proveedor, según HL. */
export type ApiIA = "anthropic" | "openai" | "gemini";

export interface LlaveIA {
  uuid: string;
  agente: string;
  proveedor: "claude" | "openai" | "gemini" | "otro" | string;
  /** API (SDK) que habla el proveedor; HL lo manda desde 2026-09. Sin él se deduce por el nombre. */
  api?: ApiIA | null;
  modelo: string;
  llave: string;
  caducidad: string | null;
}

export interface HlClienteConfig {
  url: string;
  key: string;
  agente: string;
  ttlMinutos: number;
  timeoutMs: number;
}

export interface OpcionesLlave {
  forzar?: boolean;
  env?: EntornoHl;
  fetch?: typeof fetch;
  ahora?: () => number;
}

export class HlClienteError extends Error {
  readonly status: number | null;
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "HlClienteError";
    this.status = status;
  }
}

const DEFAULT_TTL_MINUTOS = 30;
const DEFAULT_TIMEOUT_MS = 10_000;
const MS_POR_MINUTO = 60_000;
const KEY_FORMAT = /^hl_[0-9a-f]{48}$/;
const UUID_FORMAT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function leerConfigHl(_agente: AgenteHl, env: EntornoHl = process.env): HlClienteConfig {
  const url = (env.HL_URL ?? "").trim().replace(/\/+$/, "");
  const key = (env.HL_API_KEY ?? "").trim();
  const uuid = uuidAgente(env);
  const ttl = Number(env.HL_TTL_MIN);

  if (!url) throw new HlClienteError("Falta HL_URL en el entorno");
  if (!KEY_FORMAT.test(key)) throw new HlClienteError("HL_API_KEY ausente o con formato inválido (hl_ + 48 hex)");
  if (!UUID_FORMAT.test(uuid)) throw new HlClienteError("HL_AGENTE (o HL_AGENTE_POYITO) ausente o no es un UUID válido");

  return {
    url,
    key,
    agente: uuid,
    ttlMinutos: Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MINUTOS,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
}

function esTexto(valor: unknown): valor is string {
  return typeof valor === "string" && valor.trim() !== "";
}

function validarLlave(data: unknown): LlaveIA | null {
  if (typeof data !== "object" || data === null) return null;
  const d = data as Record<string, unknown>;
  if (!esTexto(d.proveedor) || !esTexto(d.modelo) || !esTexto(d.llave)) return null;
  return {
    uuid: typeof d.uuid === "string" ? d.uuid : "",
    agente: typeof d.agente === "string" ? d.agente : "",
    proveedor: d.proveedor.trim().toLowerCase(),
    api: d.api === "anthropic" || d.api === "openai" || d.api === "gemini" ? d.api : undefined,
    modelo: d.modelo.trim(),
    llave: d.llave.trim(),
    caducidad: typeof d.caducidad === "string" ? d.caducidad : null,
  };
}

async function consultarWs(config: HlClienteConfig, pedir: typeof fetch): Promise<LlaveIA> {
  const url = `${config.url}/api/ws/llave/${config.agente}`;
  let response: Response;
  try {
    response = await pedir(url, {
      headers: { "X-HL-Key": config.key, Accept: "application/json" },
      signal: AbortSignal.timeout(config.timeoutMs),
      cache: "no-store",
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : "error de red";
    throw new HlClienteError(`No se pudo conectar con HL Servidor (${url}): ${detalle}`);
  }

  let body: { success?: unknown; data?: unknown; error?: unknown };
  try {
    body = (await response.json()) as typeof body;
  } catch {
    throw new HlClienteError(`HL Servidor respondió ${response.status} sin JSON válido`, response.status);
  }

  if (!response.ok || body.success !== true) {
    const mensaje = esTexto(body.error) ? body.error : `HL Servidor respondió ${response.status}`;
    throw new HlClienteError(mensaje, response.status);
  }
  const llave = validarLlave(body.data);
  if (!llave) throw new HlClienteError("HL Servidor respondió sin proveedor, modelo o llave", response.status);
  return llave;
}

interface EntradaCache { valor: LlaveIA; expira: number }
const cache = new Map<string, EntradaCache>();
const enCurso = new Map<string, Promise<LlaveIA>>();

/**
 * Proveedor, modelo y llave del agente. Cachea en memoria durante HL_TTL_MIN
 * minutos y junta las peticiones simultáneas del mismo agente en una sola. Si
 * el refresco falla y hay un valor previo, lo reutiliza.
 */
export async function obtenerLlave(agente: AgenteHl, opciones: OpcionesLlave = {}): Promise<LlaveIA> {
  const config = leerConfigHl(agente, opciones.env ?? process.env);
  const ahora = opciones.ahora ?? Date.now;
  const clave = config.agente;

  const guardada = cache.get(clave);
  if (!opciones.forzar && guardada && guardada.expira > ahora()) return guardada.valor;
  const pendiente = enCurso.get(clave);
  if (pendiente) return pendiente;

  const peticion = consultarWs(config, opciones.fetch ?? fetch)
    .then((valor) => {
      cache.set(clave, { valor, expira: ahora() + config.ttlMinutos * MS_POR_MINUTO });
      return valor;
    })
    .catch((error: unknown) => {
      const previa = cache.get(clave);
      if (previa) {
        console.error(`[hl] falló el refresco de la llave de ${agente}; se reutiliza la anterior.`, error);
        return previa.valor;
      }
      throw error;
    })
    .finally(() => {
      enCurso.delete(clave);
    });
  enCurso.set(clave, peticion);
  return peticion;
}

/** Descarta el cache. Útil tras rotar la llave o cambiar el modelo en el portal. */
export function limpiarCacheLlave(): void {
  cache.clear();
}
