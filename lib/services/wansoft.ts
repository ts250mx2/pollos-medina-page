import { consultar, unaFila, enTransaccion } from "../db";
import { ErrorHttp, texto, textoOpcional, entero, malaPeticion } from "../validar";

// ============================================================
//  Servicio del dashboard Wansoft
//  - Catálogo de sucursales (el combo del reporte)
//  - Ventas por sucursal y día (UPSERT idempotente)
//  - Importación masiva
//  - Agregaciones para los dashboards
// ============================================================

// Campos de importe que aceptamos por fila de venta.
const CAMPOS_IMPORTE = [
  "venta_bruta",
  "descuentos",
  "cortesias",
  "cancelaciones",
  "venta_neta",
  "impuestos",
  "propinas",
  "venta_total",
  "efectivo",
  "tarjeta",
  "otros_pago",
  "ticket_promedio",
] as const;

const CAMPOS_CONTEO = ["cuentas", "comensales"] as const;

export interface SucursalWansoft {
  id: number;
  clave: string | null;
  nombre: string;
  orden: number;
  activo: boolean;
}

// ---------- Utilidades de conversión ----------

const num = (v: any): number => {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Convierte "$1,234.50", "1.234,50", " 1 234.5 " → número. */
export function aNumero(valor: any): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  let s = String(valor).trim();
  if (!s) return null;
  s = s.replace(/[^0-9.,\-]/g, ""); // quita $, espacios, %, letras
  if (!s) return null;
  const tieneComa = s.includes(",");
  const tienePunto = s.includes(".");
  if (tieneComa && tienePunto) {
    // El último separador es el decimal.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (tieneComa) {
    // Coma sola: decimal si hay 1-2 dígitos después; si no, miles.
    const partes = s.split(",");
    s = partes.length === 2 && partes[1].length <= 2 ? s.replace(",", ".") : s.replace(/,/g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizarVenta(fila: any) {
  return {
    ...fila,
    venta_bruta: fila.venta_bruta === null ? null : Number(fila.venta_bruta),
    descuentos: fila.descuentos === null ? null : Number(fila.descuentos),
    cortesias: fila.cortesias === null ? null : Number(fila.cortesias),
    cancelaciones: fila.cancelaciones === null ? null : Number(fila.cancelaciones),
    venta_neta: fila.venta_neta === null ? null : Number(fila.venta_neta),
    impuestos: fila.impuestos === null ? null : Number(fila.impuestos),
    propinas: fila.propinas === null ? null : Number(fila.propinas),
    venta_total: fila.venta_total === null ? null : Number(fila.venta_total),
    efectivo: fila.efectivo === null ? null : Number(fila.efectivo),
    tarjeta: fila.tarjeta === null ? null : Number(fila.tarjeta),
    otros_pago: fila.otros_pago === null ? null : Number(fila.otros_pago),
    ticket_promedio: fila.ticket_promedio === null ? null : Number(fila.ticket_promedio),
    cuentas: fila.cuentas === null ? null : Number(fila.cuentas),
    comensales: fila.comensales === null ? null : Number(fila.comensales),
    metricas: typeof fila.metricas === "string" ? safeJson(fila.metricas) : fila.metricas || null,
  };
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

// ============================================================
//  Sucursales
// ============================================================

export async function listarSucursales(soloActivas = false): Promise<SucursalWansoft[]> {
  const filas = await consultar(
    `SELECT id, clave, nombre, alias, orden, activo FROM wansoft_sucursales
     ${soloActivas ? "WHERE activo = 1" : ""} ORDER BY orden, nombre`
  );
  return filas.map((f: any) => ({ ...f, activo: Boolean(f.activo), display: f.alias || f.nombre }));
}

export async function crearSucursal(datos: any): Promise<{ id: number }> {
  const nombre = texto(datos.nombre, "nombre de la sucursal", { max: 160 });
  const clave = textoOpcional(datos.clave, "clave", { max: 80 });
  const orden = entero(datos.orden ?? 0, "orden", { min: 0, max: 9999 });
  const existe = await unaFila("SELECT id FROM wansoft_sucursales WHERE nombre = ?", [nombre]);
  if (existe) throw new ErrorHttp(409, `Ya existe una sucursal llamada "${nombre}".`);
  const r: any = await consultar(
    "INSERT INTO wansoft_sucursales (clave, nombre, orden, activo) VALUES (?, ?, ?, 1)",
    [clave, nombre, orden]
  );
  return { id: r.insertId };
}

/** Devuelve la sucursal por nombre; la crea si no existe (para importaciones). */
export async function obtenerOCrearSucursalPorNombre(nombre: string): Promise<number> {
  const limpio = texto(nombre, "nombre de la sucursal", { max: 160 });
  const fila = await unaFila<{ id: number }>("SELECT id FROM wansoft_sucursales WHERE nombre = ?", [limpio]);
  if (fila) return fila.id;
  const r: any = await consultar(
    "INSERT INTO wansoft_sucursales (nombre, orden, activo) VALUES (?, 999, 1)",
    [limpio]
  );
  return r.insertId;
}

export async function actualizarSucursal(id: number, datos: any): Promise<{ id: number }> {
  const actual = await unaFila("SELECT id FROM wansoft_sucursales WHERE id = ?", [id]);
  if (!actual) throw new ErrorHttp(404, "La sucursal no existe.");
  const nombre = texto(datos.nombre, "nombre de la sucursal", { max: 160 });
  const alias = textoOpcional(datos.alias, "alias", { max: 160 });
  const clave = textoOpcional(datos.clave, "clave", { max: 80 });
  const orden = entero(datos.orden ?? 0, "orden", { min: 0, max: 9999 });
  const activo = datos.activo === false || datos.activo === 0 || datos.activo === "0" ? 0 : 1;
  await consultar(
    "UPDATE wansoft_sucursales SET nombre = ?, alias = ?, clave = ?, orden = ?, activo = ? WHERE id = ?",
    [nombre, alias, clave, orden, activo, id]
  );
  return { id };
}

export async function eliminarSucursal(id: number): Promise<{ id: number }> {
  const fila = await unaFila("SELECT id FROM wansoft_sucursales WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "La sucursal no existe.");
  await consultar("DELETE FROM wansoft_sucursales WHERE id = ?", [id]);
  return { id };
}

// ============================================================
//  Ventas — UPSERT idempotente por (sucursal, fecha)
// ============================================================

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function validarFecha(valor: any): string {
  const s = String(valor || "").trim().slice(0, 10);
  if (!RE_FECHA.test(s)) throw malaPeticion(`La fecha "${valor}" debe tener formato AAAA-MM-DD.`);
  return s;
}

export interface EntradaVenta {
  sucursal_id?: number;
  sucursal?: string; // nombre alternativo (se resuelve/crea)
  fecha: string;
  origen?: "sync" | "importado" | "manual" | "demo";
  notas?: string;
  metricas?: any;
  [k: string]: any;
}

/**
 * Inserta o actualiza un día de ventas de una sucursal.
 * Devuelve la acción realizada.
 */
export async function guardarVenta(entrada: EntradaVenta): Promise<{ sucursal_id: number; fecha: string; accion: "insertado" | "actualizado" }> {
  const fecha = validarFecha(entrada.fecha);

  let sucursalId = entrada.sucursal_id ? Number(entrada.sucursal_id) : 0;
  if (!sucursalId && entrada.sucursal) {
    sucursalId = await obtenerOCrearSucursalPorNombre(String(entrada.sucursal));
  }
  if (!sucursalId) throw malaPeticion("Falta la sucursal (id o nombre).");

  const suc = await unaFila("SELECT id FROM wansoft_sucursales WHERE id = ?", [sucursalId]);
  if (!suc) throw new ErrorHttp(404, `La sucursal ${sucursalId} no existe.`);

  const valores: Record<string, any> = {};
  for (const c of CAMPOS_IMPORTE) valores[c] = c in entrada ? aNumero(entrada[c]) : null;
  for (const c of CAMPOS_CONTEO) {
    const v = c in entrada ? aNumero(entrada[c]) : null;
    valores[c] = v === null ? null : Math.round(v);
  }

  // Ticket promedio: si no viene, se calcula.
  if (valores.ticket_promedio === null && valores.venta_neta && valores.cuentas) {
    valores.ticket_promedio = Math.round((valores.venta_neta / valores.cuentas) * 100) / 100;
  }

  const origen = ["sync", "importado", "manual", "demo"].includes(entrada.origen as string)
    ? entrada.origen
    : "manual";
  const notas = textoOpcional(entrada.notas, "notas", { max: 255 });
  const metricas = entrada.metricas ? JSON.stringify(entrada.metricas).slice(0, 60000) : null;

  const existe = await unaFila<{ id: number }>(
    "SELECT id FROM wansoft_ventas_diarias WHERE sucursal_id = ? AND fecha = ?",
    [sucursalId, fecha]
  );

  const cols = [...CAMPOS_IMPORTE, ...CAMPOS_CONTEO];
  const params = cols.map((c) => valores[c]);

  if (existe) {
    await consultar(
      `UPDATE wansoft_ventas_diarias SET
         ${cols.map((c) => `${c} = ?`).join(", ")},
         origen = ?, notas = ?, metricas = ?
       WHERE id = ?`,
      [...params, origen, notas, metricas, existe.id]
    );
    return { sucursal_id: sucursalId, fecha, accion: "actualizado" };
  }

  await consultar(
    `INSERT INTO wansoft_ventas_diarias
       (sucursal_id, fecha, ${cols.join(", ")}, origen, notas, metricas)
     VALUES (?, ?, ${cols.map(() => "?").join(", ")}, ?, ?, ?)`,
    [sucursalId, fecha, ...params, origen, notas, metricas]
  );
  return { sucursal_id: sucursalId, fecha, accion: "insertado" };
}

/** Importa muchas filas. Devuelve conteos. */
export async function importarVentas(
  filas: EntradaVenta[],
  origen: EntradaVenta["origen"] = "importado"
): Promise<{ insertados: number; actualizados: number; errores: { fila: number; error: string }[] }> {
  if (!Array.isArray(filas) || !filas.length) throw malaPeticion("No se recibieron filas para importar.");
  if (filas.length > 5000) throw malaPeticion("Demasiadas filas (máx. 5000 por importación).");

  let insertados = 0;
  let actualizados = 0;
  const errores: { fila: number; error: string }[] = [];

  for (let i = 0; i < filas.length; i++) {
    try {
      const r = await guardarVenta({ ...filas[i], origen: filas[i].origen || origen });
      if (r.accion === "insertado") insertados++;
      else actualizados++;
    } catch (e: any) {
      errores.push({ fila: i + 1, error: e.message || "Error" });
    }
  }
  return { insertados, actualizados, errores };
}

export async function eliminarVenta(sucursalId: number, fecha: string): Promise<{ ok: true }> {
  await consultar("DELETE FROM wansoft_ventas_diarias WHERE sucursal_id = ? AND fecha = ?", [
    sucursalId,
    validarFecha(fecha),
  ]);
  return { ok: true };
}

// ============================================================
//  Consultas / tabla
// ============================================================

export async function listarVentas(filtros: {
  desde?: string;
  hasta?: string;
  sucursalId?: number;
  limite?: number;
}): Promise<any[]> {
  const cond: string[] = [];
  const params: any[] = [];
  if (filtros.desde) {
    cond.push("v.fecha >= ?");
    params.push(validarFecha(filtros.desde));
  }
  if (filtros.hasta) {
    cond.push("v.fecha <= ?");
    params.push(validarFecha(filtros.hasta));
  }
  if (filtros.sucursalId) {
    cond.push("v.sucursal_id = ?");
    params.push(filtros.sucursalId);
  }
  const where = cond.length ? `WHERE ${cond.join(" AND ")}` : "";
  const limite = Math.min(Math.max(Number(filtros.limite) || 2000, 1), 10000);
  const filas = await consultar(
    `SELECT v.*, s.nombre AS sucursal_nombre
     FROM wansoft_ventas_diarias v
     JOIN wansoft_sucursales s ON s.id = v.sucursal_id
     ${where}
     ORDER BY v.fecha DESC, s.nombre
     LIMIT ${limite}`,
    params
  );
  return filas.map(normalizarVenta);
}

// ============================================================
//  Dashboard — agregaciones
// ============================================================

function rangoMes(mes?: string): { desde: string; hasta: string; etiqueta: string } {
  // mes = "YYYY-MM"; por defecto el mes en curso (zona del servidor).
  let anio: number;
  let m: number;
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    [anio, m] = mes.split("-").map(Number);
  } else {
    const hoy = new Date();
    anio = hoy.getUTCFullYear();
    m = hoy.getUTCMonth() + 1;
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  return {
    desde: `${anio}-${pad(m)}-01`,
    hasta: `${anio}-${pad(m)}-${pad(ultimoDia)}`,
    etiqueta: `${anio}-${pad(m)}`,
  };
}

async function totalesRango(desde: string, hasta: string, sucursalId?: number) {
  const cond = ["fecha BETWEEN ? AND ?"];
  const params: any[] = [desde, hasta];
  if (sucursalId) {
    cond.push("sucursal_id = ?");
    params.push(sucursalId);
  }
  const fila = await unaFila<any>(
    `SELECT
        COALESCE(SUM(venta_neta),0)   AS venta_neta,
        COALESCE(SUM(venta_total),0)  AS venta_total,
        COALESCE(SUM(venta_bruta),0)  AS venta_bruta,
        COALESCE(SUM(descuentos),0)   AS descuentos,
        COALESCE(SUM(cortesias),0)    AS cortesias,
        COALESCE(SUM(cancelaciones),0) AS cancelaciones,
        COALESCE(SUM(impuestos),0)    AS impuestos,
        COALESCE(SUM(propinas),0)     AS propinas,
        COALESCE(SUM(efectivo),0)     AS efectivo,
        COALESCE(SUM(tarjeta),0)      AS tarjeta,
        COALESCE(SUM(otros_pago),0)   AS otros_pago,
        COALESCE(SUM(cuentas),0)      AS cuentas,
        COALESCE(SUM(comensales),0)   AS comensales,
        COUNT(DISTINCT fecha)         AS dias_con_datos
     FROM wansoft_ventas_diarias
     WHERE ${cond.join(" AND ")}`,
    params
  );
  const t: Record<string, number> = {};
  for (const k of Object.keys(fila)) t[k] = num(fila[k]);
  t.ticket_promedio = t.cuentas ? Math.round((t.venta_neta / t.cuentas) * 100) / 100 : 0;
  return t;
}

const RE_FECHA_D = /^\d{4}-\d{2}-\d{2}$/;
const aFecha = (s: string) => new Date(s + "T00:00:00Z");
const aISO = (d: Date) => d.toISOString().slice(0, 10);

/** Periodo inmediatamente anterior, del mismo largo, terminando el día antes de `desde`. */
function periodoAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const d0 = aFecha(desde);
  const d1 = aFecha(hasta);
  const largoMs = d1.getTime() - d0.getTime();
  const prevHasta = new Date(d0.getTime() - 86400000);
  const prevDesde = new Date(prevHasta.getTime() - largoMs);
  return { desde: aISO(prevDesde), hasta: aISO(prevHasta) };
}

export async function dashboard(desde: string, hasta: string, sucursalId?: number) {
  if (!RE_FECHA_D.test(desde) || !RE_FECHA_D.test(hasta)) {
    const m = rangoMes();
    desde = desde && RE_FECHA_D.test(desde) ? desde : m.desde;
    hasta = hasta && RE_FECHA_D.test(hasta) ? hasta : m.hasta;
  }
  if (desde > hasta) [desde, hasta] = [hasta, desde];
  const prev = periodoAnterior(desde, hasta);

  const [totales, totalesPrev] = await Promise.all([
    totalesRango(desde, hasta, sucursalId),
    totalesRango(prev.desde, prev.hasta, sucursalId),
  ]);

  // Serie diaria (sumada por día)
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const paramsBase = sucursalId ? [desde, hasta, sucursalId] : [desde, hasta];

  const serie = (
    await consultar<any>(
      `SELECT fecha,
              COALESCE(SUM(venta_neta),0)  AS venta_neta,
              COALESCE(SUM(venta_total),0) AS venta_total,
              COALESCE(SUM(cuentas),0)     AS cuentas
       FROM wansoft_ventas_diarias
       WHERE fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY fecha ORDER BY fecha`,
      paramsBase
    )
  ).map((f) => ({
    fecha: f.fecha,
    venta_neta: num(f.venta_neta),
    venta_total: num(f.venta_total),
    cuentas: num(f.cuentas),
  }));

  // Por sucursal
  const porSucursal = (
    await consultar<any>(
      `SELECT s.id, s.nombre, s.alias,
              COALESCE(SUM(v.venta_neta),0)  AS venta_neta,
              COALESCE(SUM(v.venta_total),0) AS venta_total,
              COALESCE(SUM(v.cuentas),0)     AS cuentas,
              COALESCE(SUM(v.comensales),0)  AS comensales,
              COUNT(DISTINCT v.fecha)        AS dias
       FROM wansoft_sucursales s
       LEFT JOIN wansoft_ventas_diarias v
         ON v.sucursal_id = s.id AND v.fecha BETWEEN ? AND ?
       ${sucursalId ? "WHERE s.id = ?" : ""}
       GROUP BY s.id, s.nombre, s.alias
       ORDER BY venta_neta DESC`,
      sucursalId ? [desde, hasta, sucursalId] : [desde, hasta]
    )
  ).map((f) => ({
    id: f.id,
    nombre: f.alias || f.nombre,
    wansoft: f.nombre,
    venta_neta: num(f.venta_neta),
    venta_total: num(f.venta_total),
    cuentas: num(f.cuentas),
    comensales: num(f.comensales),
    dias: num(f.dias),
    ticket_promedio: num(f.cuentas) ? Math.round((num(f.venta_neta) / num(f.cuentas)) * 100) / 100 : 0,
  }));

  const totalNeta = totales.venta_neta || 0;
  porSucursal.forEach((s: any) => {
    s.participacion = totalNeta ? Math.round((s.venta_neta / totalNeta) * 1000) / 10 : 0;
  });

  // Treemap: ventas por tipo de producto (NETO, para que cuadre con la venta neta)
  const tipos = (
    await consultar<any>(
      `SELECT nombre, COALESCE(SUM(subtotal),0) AS total
       FROM wansoft_ventas_categorias
       WHERE nivel = 'tipo' AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY nombre ORDER BY total DESC`,
      paramsBase
    )
  ).map((f) => ({ nombre: f.nombre, total: num(f.total) }));
  const totalTipos = tipos.reduce((s: number, t: any) => s + t.total, 0);
  tipos.forEach((t: any) => (t.participacion = totalTipos ? Math.round((t.total / totalTipos) * 1000) / 10 : 0));

  // Ranking de productos (NETO)
  const productos = (
    await consultar<any>(
      `SELECT producto, MIN(categoria) AS categoria,
              COALESCE(SUM(subtotal),0) AS total,
              COALESCE(SUM(cantidad),0) AS cantidad
       FROM wansoft_ventas_productos
       WHERE fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY producto ORDER BY total DESC LIMIT 500`,
      paramsBase
    )
  ).map((f) => ({
    producto: f.producto,
    categoria: f.categoria || null,
    total: num(f.total),
    cantidad: num(f.cantidad),
  }));
  const totalProd = productos.reduce((s: number, p: any) => s + p.total, 0);
  productos.forEach((p: any) => (p.participacion = totalProd ? Math.round((p.total / totalProd) * 1000) / 10 : 0));

  // Reportes dimensionales (grupo, tipo de orden, usuario, terminal, modificador, forma de pago)
  const [grupos, tiposOrden, usuarios, terminales, modificadores, formasPagoDet, mapaCalor] = await Promise.all([
    dimension("grupo", desde, hasta, sucursalId),
    dimension("tipo_orden", desde, hasta, sucursalId),
    dimension("usuario", desde, hasta, sucursalId),
    dimension("terminal", desde, hasta, sucursalId),
    dimension("modificador", desde, hasta, sucursalId, "cantidad"),
    dimension("forma_pago", desde, hasta, sucursalId, "total"),
    heatmapHoras(desde, hasta, sucursalId),
  ]);

  const mejorDia = serie.reduce(
    (mx, d) => (d.venta_neta > (mx?.venta_neta ?? -1) ? d : mx),
    null as null | { fecha: string; venta_neta: number }
  );

  const cambioNeta =
    totalesPrev.venta_neta > 0
      ? Math.round(((totales.venta_neta - totalesPrev.venta_neta) / totalesPrev.venta_neta) * 1000) / 10
      : null;

  const diasTranscurridos = serie.length;
  const promedioDiario = diasTranscurridos ? Math.round((totales.venta_neta / diasTranscurridos) * 100) / 100 : 0;

  return {
    rango: { desde, hasta },
    sucursalId: sucursalId || null,
    totales,
    comparativo: {
      periodoPrev: prev,
      venta_neta_prev: totalesPrev.venta_neta,
      cambio_neta_pct: cambioNeta,
    },
    promedioDiario,
    mejorDia,
    serie,
    porSucursal,
    tipos,
    productos,
    grupos,
    tiposOrden,
    usuarios,
    terminales,
    modificadores,
    formasPagoDet,
    mapaCalor,
    formasPago: {
      efectivo: totales.efectivo,
      tarjeta: totales.tarjeta,
      otros: totales.otros_pago,
    },
  };
}

/** Agregación genérica de un reporte dimensional (group by etiqueta). */
export async function dimension(
  reporte: string,
  desde: string,
  hasta: string,
  sucursalId?: number,
  medida: "subtotal" | "total" | "cantidad" = "subtotal"
) {
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const params = sucursalId ? [reporte, desde, hasta, sucursalId] : [reporte, desde, hasta];
  const filas = await consultar<any>(
    `SELECT etiqueta, MIN(etiqueta2) AS etiqueta2,
            COALESCE(SUM(subtotal),0) AS subtotal,
            COALESCE(SUM(total),0)    AS total,
            COALESCE(SUM(cantidad),0) AS cantidad,
            COALESCE(SUM(cantidad2),0) AS cantidad2
     FROM wansoft_reportes
     WHERE reporte = ? AND fecha BETWEEN ? AND ? ${condSuc}
     GROUP BY etiqueta
     ORDER BY ${medida === "cantidad" ? "cantidad" : medida} DESC`,
    params
  );
  const lista = filas.map((f) => ({
    etiqueta: f.etiqueta,
    etiqueta2: f.etiqueta2 || null,
    subtotal: num(f.subtotal),
    total: num(f.total),
    cantidad: num(f.cantidad),
    cantidad2: num(f.cantidad2),
    valor: num(f[medida]),
  }));
  const suma = lista.reduce((s, r) => s + r.valor, 0);
  lista.forEach((r: any) => (r.participacion = suma ? Math.round((r.valor / suma) * 1000) / 10 : 0));
  return lista;
}

/** Mapa de calor: ventas netas promedio por día de la semana (0=Dom) × hora. */
export async function heatmapHoras(desde: string, hasta: string, sucursalId?: number) {
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const params = sucursalId ? [desde, hasta, sucursalId] : [desde, hasta];
  const filas = await consultar<any>(
    `SELECT (DAYOFWEEK(fecha) - 1) AS dow, etiqueta AS hora,
            COALESCE(SUM(subtotal),0) AS total,
            COUNT(DISTINCT fecha)     AS dias
     FROM wansoft_reportes
     WHERE reporte = 'hora' AND fecha BETWEEN ? AND ? ${condSuc}
     GROUP BY dow, etiqueta`,
    params
  );
  const horas = Array.from(new Set(filas.map((f) => f.hora))).sort();
  const celdas: Record<string, number> = {};
  let maximo = 0;
  for (const f of filas) {
    const prom = num(f.dias) ? num(f.total) / num(f.dias) : 0;
    celdas[`${f.dow}|${f.hora}`] = prom;
    if (prom > maximo) maximo = prom;
  }
  return { horas, celdas, maximo };
}

/** Detalle de un producto en el periodo: serie diaria + por sucursal. */
export async function productoDetalle(producto: string, desde: string, hasta: string, sucursalId?: number) {
  if (!RE_FECHA_D.test(desde) || !RE_FECHA_D.test(hasta)) throw malaPeticion("Rango de fechas inválido.");
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const params = sucursalId ? [producto, desde, hasta, sucursalId] : [producto, desde, hasta];

  const serie = (
    await consultar<any>(
      `SELECT fecha, COALESCE(SUM(subtotal),0) AS total, COALESCE(SUM(cantidad),0) AS cantidad
       FROM wansoft_ventas_productos
       WHERE producto = ? AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY fecha ORDER BY fecha`,
      params
    )
  ).map((f) => ({ fecha: f.fecha, total: num(f.total), cantidad: num(f.cantidad) }));

  const porSucursal = (
    await consultar<any>(
      `SELECT COALESCE(s.alias, s.nombre) AS nombre, COALESCE(SUM(p.subtotal),0) AS total, COALESCE(SUM(p.cantidad),0) AS cantidad
       FROM wansoft_ventas_productos p
       JOIN wansoft_sucursales s ON s.id = p.sucursal_id
       WHERE p.producto = ? AND p.fecha BETWEEN ? AND ? ${condSuc.replace("sucursal_id", "p.sucursal_id")}
       GROUP BY s.id, s.alias, s.nombre ORDER BY total DESC`,
      params
    )
  ).map((f) => ({ nombre: f.nombre, total: num(f.total), cantidad: num(f.cantidad) }));

  const total = serie.reduce((s, d) => s + d.total, 0);
  const cantidad = serie.reduce((s, d) => s + d.cantidad, 0);
  return { titulo: producto, total, cantidad, serie, porSucursal };
}

/** Detalle de un tipo de producto: serie diaria, por sucursal y sus productos. */
export async function tipoDetalle(tipo: string, desde: string, hasta: string, sucursalId?: number) {
  if (!RE_FECHA_D.test(desde) || !RE_FECHA_D.test(hasta)) throw malaPeticion("Rango de fechas inválido.");
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const params = sucursalId ? [tipo, desde, hasta, sucursalId] : [tipo, desde, hasta];

  const serie = (
    await consultar<any>(
      `SELECT fecha, COALESCE(SUM(subtotal),0) AS total
       FROM wansoft_ventas_categorias
       WHERE nivel = 'tipo' AND nombre = ? AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY fecha ORDER BY fecha`,
      params
    )
  ).map((f) => ({ fecha: f.fecha, total: num(f.total), cantidad: 0 }));

  const porSucursal = (
    await consultar<any>(
      `SELECT COALESCE(s.alias, s.nombre) AS nombre, COALESCE(SUM(c.subtotal),0) AS total
       FROM wansoft_ventas_categorias c
       JOIN wansoft_sucursales s ON s.id = c.sucursal_id
       WHERE c.nivel = 'tipo' AND c.nombre = ? AND c.fecha BETWEEN ? AND ? ${condSuc.replace("sucursal_id", "c.sucursal_id")}
       GROUP BY s.id, s.alias, s.nombre ORDER BY total DESC`,
      params
    )
  ).map((f) => ({ nombre: f.nombre, total: num(f.total), cantidad: 0 }));

  // Productos que pertenecen a este tipo (si el dato lo trae)
  const productos = (
    await consultar<any>(
      `SELECT producto, COALESCE(SUM(subtotal),0) AS total, COALESCE(SUM(cantidad),0) AS cantidad
       FROM wansoft_ventas_productos
       WHERE categoria = ? AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY producto ORDER BY total DESC LIMIT 20`,
      params
    )
  ).map((f) => ({ producto: f.producto, total: num(f.total), cantidad: num(f.cantidad) }));

  const total = serie.reduce((s, d) => s + d.total, 0);
  return { titulo: tipo, total, cantidad: 0, serie, porSucursal, productos };
}

/** Detalle de un grupo de producto: serie diaria, por sucursal y sus productos. */
export async function grupoDetalle(grupo: string, desde: string, hasta: string, sucursalId?: number) {
  if (!RE_FECHA_D.test(desde) || !RE_FECHA_D.test(hasta)) throw malaPeticion("Rango de fechas inválido.");
  const condSuc = sucursalId ? "AND sucursal_id = ?" : "";
  const params = sucursalId ? [grupo, desde, hasta, sucursalId] : [grupo, desde, hasta];

  const serie = (
    await consultar<any>(
      `SELECT fecha, COALESCE(SUM(subtotal),0) AS total
       FROM wansoft_reportes
       WHERE reporte = 'grupo' AND etiqueta = ? AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY fecha ORDER BY fecha`,
      params
    )
  ).map((f) => ({ fecha: f.fecha, total: num(f.total), cantidad: 0 }));

  const porSucursal = (
    await consultar<any>(
      `SELECT COALESCE(s.alias, s.nombre) AS nombre, COALESCE(SUM(r.subtotal),0) AS total
       FROM wansoft_reportes r
       JOIN wansoft_sucursales s ON s.id = r.sucursal_id
       WHERE r.reporte = 'grupo' AND r.etiqueta = ? AND r.fecha BETWEEN ? AND ? ${condSuc.replace("sucursal_id", "r.sucursal_id")}
       GROUP BY s.id, s.alias, s.nombre ORDER BY total DESC`,
      params
    )
  ).map((f) => ({ nombre: f.nombre, total: num(f.total), cantidad: 0 }));

  const productos = (
    await consultar<any>(
      `SELECT producto, COALESCE(SUM(subtotal),0) AS total, COALESCE(SUM(cantidad),0) AS cantidad
       FROM wansoft_ventas_productos
       WHERE categoria = ? AND fecha BETWEEN ? AND ? ${condSuc}
       GROUP BY producto ORDER BY total DESC LIMIT 20`,
      params
    )
  ).map((f) => ({ producto: f.producto, total: num(f.total), cantidad: num(f.cantidad) }));

  const total = serie.reduce((s, d) => s + d.total, 0);
  return { titulo: grupo, total, cantidad: 0, serie, porSucursal, productos };
}

/** Meses que tienen datos (para el selector). */
export async function mesesDisponibles(): Promise<string[]> {
  const filas = await consultar<any>(
    `SELECT DISTINCT DATE_FORMAT(fecha, '%Y-%m') AS mes
     FROM wansoft_ventas_diarias ORDER BY mes DESC`
  );
  return filas.map((f) => f.mes);
}

// ============================================================
//  Bitácora de sync
// ============================================================

export async function ultimasSync(limite = 10): Promise<any[]> {
  return consultar(
    `SELECT id, iniciado_en, terminado_en, estado, desde, hasta, dias, filas, mensaje
     FROM wansoft_sync_log ORDER BY iniciado_en DESC LIMIT ${Math.min(Math.max(limite, 1), 100)}`
  );
}

export async function estadoSesionWansoft(): Promise<{
  configurada: boolean;
  estado: string;
  actualizado_en: string | null;
}> {
  const fila = await unaFila<any>(
    `SELECT (cookie IS NOT NULL AND cookie <> '') AS configurada, estado, actualizado_en
     FROM wansoft_credenciales WHERE id = 1 LIMIT 1`
  );
  return fila
    ? { configurada: Boolean(fila.configurada), estado: fila.estado, actualizado_en: fila.actualizado_en }
    : { configurada: false, estado: "sin_configurar", actualizado_en: null };
}

export async function guardarSesionWansoft(cookieEntrada: unknown): Promise<void> {
  const cookie = String(cookieEntrada ?? "").trim();
  if (cookie.length < 10 || cookie.length > 60_000 || /[\r\n]/.test(cookie)) {
    throw new ErrorHttp(400, "La cookie de Wansoft no es válida.");
  }
  await consultar(
    `INSERT INTO wansoft_credenciales (id, cookie, estado)
     VALUES (1, ?, 'activa')
     ON DUPLICATE KEY UPDATE cookie = VALUES(cookie), estado = 'activa'`,
    [cookie]
  );
}

/** Días que todavía no tienen una fila sincronizada para cada sucursal activa. */
export async function diasPendientesSync(desde: string, hasta: string): Promise<string[]> {
  const inicio = new Date(`${desde}T00:00:00Z`);
  const fin = new Date(`${hasta}T00:00:00Z`);
  if (Number.isNaN(inicio.valueOf()) || Number.isNaN(fin.valueOf()) || inicio > fin) {
    throw new ErrorHttp(400, "Rango de fechas inválido.");
  }

  const sucursales = await consultar<any>(
    `SELECT id FROM wansoft_sucursales
     WHERE activo = 1 AND clave IS NOT NULL AND clave <> ''`
  );
  if (!sucursales.length) return [];

  const conteos = await consultar<any>(
    `SELECT v.fecha, COUNT(DISTINCT v.sucursal_id) AS completas
     FROM wansoft_ventas_diarias v
     JOIN wansoft_sucursales s ON s.id = v.sucursal_id
     WHERE v.fecha BETWEEN ? AND ? AND v.origen = 'sync'
       AND s.activo = 1 AND s.clave IS NOT NULL AND s.clave <> ''
     GROUP BY v.fecha`,
    [desde, hasta]
  );
  const porFecha = new Map(conteos.map((f) => [String(f.fecha), Number(f.completas)]));
  const pendientes: string[] = [];
  const cursor = new Date(inicio);
  for (let i = 0; cursor <= fin && i < 400; i++, cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const fecha = cursor.toISOString().slice(0, 10);
    if ((porFecha.get(fecha) || 0) < sucursales.length) pendientes.push(fecha);
  }
  if (cursor <= fin) throw new ErrorHttp(400, "El rango no puede superar 400 días.");
  return pendientes;
}
