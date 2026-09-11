import { consultar, unaFila } from "../db";
import { ErrorHttp, texto, textoOpcional, malaPeticion } from "../validar";

// ============================================================
//  Pedidos — creados por el agente Pollito, gestionados en /pedidos
// ============================================================

export type EstadoPedido = "nuevo" | "preparando" | "listo" | "entregado" | "cancelado";
export const ESTADOS: EstadoPedido[] = ["nuevo", "preparando", "listo", "entregado", "cancelado"];

export interface ItemPedido {
  producto: string;
  cantidad: number;
  precio_unitario: number;
  opciones?: string | null;
  notas?: string | null;
}

export interface Pedido {
  id: number;
  folio: string;
  cliente_nombre: string;
  cliente_telefono: string | null;
  tipo: "domicilio" | "recoger";
  direccion: string | null;
  sucursal_id: number | null;
  sucursal_nombre?: string | null;
  items: ItemPedido[];
  subtotal: number;
  envio: number;
  total: number;
  forma_pago: string | null;
  notas: string | null;
  estado: EstadoPedido;
  origen: string;
  creado_en: string;
  actualizado_en: string;
}

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function folioNuevo(): string {
  // PM-XXXX: cuatro caracteres alfanuméricos sin ambiguos (0/O, 1/I).
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += abc[Math.floor(Math.random() * abc.length)];
  return `PM-${s}`;
}

function leerItems(lista: any): ItemPedido[] {
  if (!Array.isArray(lista) || !lista.length) {
    throw malaPeticion("El pedido no tiene productos.");
  }
  return lista.map((it, i) => {
    const producto = texto(it?.producto, `producto #${i + 1}`, { max: 200 });
    const cantidad = Math.max(1, Math.min(999, Math.round(num(it?.cantidad)) || 1));
    const precio_unitario = Math.max(0, num(it?.precio_unitario));
    return {
      producto,
      cantidad,
      precio_unitario,
      opciones: textoOpcional(it?.opciones, "opciones", { max: 300 }),
      notas: textoOpcional(it?.notas, "notas del producto", { max: 300 }),
    };
  });
}

function normalizar(fila: any): Pedido {
  const items = typeof fila.items === "string" ? JSON.parse(fila.items || "[]") : fila.items || [];
  return {
    ...fila,
    sucursal_id: fila.sucursal_id ?? null,
    items,
    subtotal: num(fila.subtotal),
    envio: num(fila.envio),
    total: num(fila.total),
  };
}

/** Crea un pedido. Calcula el total en el servidor (no se confía en el cliente). */
export async function crearPedido(datos: any): Promise<Pedido> {
  const cliente_nombre = texto(datos?.cliente_nombre, "nombre del cliente", { max: 160 });
  const cliente_telefono = textoOpcional(datos?.cliente_telefono, "teléfono", { max: 40 });
  const tipo = datos?.tipo === "domicilio" ? "domicilio" : "recoger";
  const direccion = textoOpcional(datos?.direccion, "dirección", { max: 400 });
  const forma_pago = textoOpcional(datos?.forma_pago, "forma de pago", { max: 40 });
  const notas = textoOpcional(datos?.notas, "notas", { max: 600 });
  const items = leerItems(datos?.items);

  if (tipo === "domicilio" && !direccion) {
    throw malaPeticion("Para envío a domicilio se necesita la dirección.");
  }

  // Sucursal opcional: acepta id numérico o nombre.
  let sucursal_id: number | null = null;
  if (datos?.sucursal_id && Number(datos.sucursal_id) > 0) {
    sucursal_id = Number(datos.sucursal_id);
  } else if (datos?.sucursal) {
    const fila = await unaFila<{ id: number }>(
      "SELECT id FROM sucursales WHERE nombre = ? OR slug = ? LIMIT 1",
      [String(datos.sucursal), String(datos.sucursal)]
    );
    sucursal_id = fila ? fila.id : null;
  }

  const subtotal = items.reduce((s, it) => s + it.precio_unitario * it.cantidad, 0);
  const envio = tipo === "domicilio" ? Math.max(0, num(datos?.envio)) : 0;
  const total = subtotal + envio;

  // Reintenta si el folio choca (muy improbable, pero el folio es UNIQUE).
  for (let intento = 0; intento < 5; intento++) {
    const folio = folioNuevo();
    try {
      const r: any = await consultar(
        `INSERT INTO pedidos
           (folio, cliente_nombre, cliente_telefono, tipo, direccion, sucursal_id, items, subtotal, envio, total, forma_pago, notas, origen)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?)`,
        [folio, cliente_nombre, cliente_telefono, tipo, direccion, sucursal_id,
          JSON.stringify(items), subtotal, envio, total, forma_pago, notas, datos?.origen === "manual" ? "manual" : "pollito"]
      );
      return (await obtenerPedido(r.insertId))!;
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY" && intento < 4) continue;
      throw e;
    }
  }
  throw new ErrorHttp(500, "No se pudo generar el folio del pedido.");
}

const CAMPOS = `p.id, p.folio, p.cliente_nombre, p.cliente_telefono, p.tipo, p.direccion,
                p.sucursal_id, s.nombre AS sucursal_nombre, p.items, p.subtotal, p.envio, p.total,
                p.forma_pago, p.notas, p.estado, p.origen, p.creado_en, p.actualizado_en`;

export async function listarPedidos(estado?: string): Promise<Pedido[]> {
  const cond = estado && ESTADOS.includes(estado as EstadoPedido) ? "WHERE p.estado = ?" : "";
  const params = cond ? [estado] : [];
  const filas = await consultar<any>(
    `SELECT ${CAMPOS} FROM pedidos p
     LEFT JOIN sucursales s ON s.id = p.sucursal_id
     ${cond} ORDER BY p.creado_en DESC LIMIT 300`,
    params
  );
  return filas.map(normalizar);
}

export async function obtenerPedido(id: number): Promise<Pedido | null> {
  const fila = await unaFila<any>(
    `SELECT ${CAMPOS} FROM pedidos p LEFT JOIN sucursales s ON s.id = p.sucursal_id WHERE p.id = ?`,
    [id]
  );
  return fila ? normalizar(fila) : null;
}

export async function cambiarEstado(id: number, estado: string): Promise<{ id: number; estado: EstadoPedido }> {
  if (!ESTADOS.includes(estado as EstadoPedido)) throw malaPeticion("Estado no válido.");
  const fila = await unaFila("SELECT id FROM pedidos WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "El pedido no existe.");
  await consultar("UPDATE pedidos SET estado = ? WHERE id = ?", [estado, id]);
  return { id, estado: estado as EstadoPedido };
}
