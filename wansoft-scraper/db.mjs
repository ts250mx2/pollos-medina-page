// Acceso a MySQL (BDPollosMedinaMenu): escribe en las mismas tablas que lee el
// dashboard del panel — wansoft_sucursales y wansoft_ventas_diarias — con UPSERT
// idempotente por (sucursal, fecha). También registra en wansoft_sync_log.
import mysql from "mysql2/promise";

/** Lee una variable obligatoria; sin valores por defecto para no filtrar secretos. */
function requerido(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}. Defínela en wansoft-scraper/.env`);
  }
  return valor;
}

export async function getConnection() {
  return mysql.createConnection({
    host: requerido("DB_HOST"),
    user: requerido("DB_USER"),
    password: requerido("DB_PASSWORD"),
    database: requerido("DB_NAME"),
    port: Number(process.env.DB_PORT) || 3306,
    timezone: "-06:00",
  });
}

/** Resuelve (o crea) la sucursal por su id de Wansoft; devuelve el id local. */
export async function resolveBranch(conn, wansoftId, nombre) {
  // Primero por clave (id de Wansoft), luego por nombre.
  const [porClave] = await conn.execute(
    "SELECT id FROM wansoft_sucursales WHERE clave = ? LIMIT 1",
    [String(wansoftId)]
  );
  if (porClave.length) {
    if (nombre) await conn.execute("UPDATE wansoft_sucursales SET nombre = ? WHERE id = ?", [nombre, porClave[0].id]).catch(() => {});
    return porClave[0].id;
  }
  const [porNombre] = await conn.execute(
    "SELECT id FROM wansoft_sucursales WHERE nombre = ? LIMIT 1",
    [nombre]
  );
  if (porNombre.length) {
    await conn.execute("UPDATE wansoft_sucursales SET clave = ? WHERE id = ?", [String(wansoftId), porNombre[0].id]);
    return porNombre[0].id;
  }
  const [ins] = await conn.execute(
    "INSERT INTO wansoft_sucursales (clave, nombre, orden, activo) VALUES (?, ?, 999, 1)",
    [String(wansoftId), nombre]
  );
  return ins.insertId;
}

/** UPSERT de un día de ventas de una sucursal (origen = 'sync'). */
export async function upsertVenta(conn, sucursalId, row) {
  const sql = `
    INSERT INTO wansoft_ventas_diarias
      (sucursal_id, fecha, venta_bruta, descuentos, cortesias, cancelaciones,
       venta_neta, impuestos, venta_total, metricas, origen)
    VALUES (?,?,?,?,?,?,?,?,?,?, 'sync')
    ON DUPLICATE KEY UPDATE
      venta_bruta=VALUES(venta_bruta), descuentos=VALUES(descuentos),
      cortesias=VALUES(cortesias), cancelaciones=VALUES(cancelaciones),
      venta_neta=VALUES(venta_neta), impuestos=VALUES(impuestos),
      venta_total=VALUES(venta_total), metricas=VALUES(metricas), origen='sync';
  `;
  await conn.execute(sql, [
    sucursalId,
    row.fecha,
    row.venta_bruta,
    row.descuentos,
    row.cortesias,
    row.cancelaciones,
    row.venta_neta,
    row.impuestos,
    row.venta_total,
    JSON.stringify(row.metricas || {}),
  ]);
}

// ---------- Bitácora ----------

export async function logInicio(conn, desde, hasta) {
  const [r] = await conn.execute(
    "INSERT INTO wansoft_sync_log (iniciado_en, estado, desde, hasta) VALUES (NOW(), 'corriendo', ?, ?)",
    [desde, hasta]
  );
  return r.insertId;
}

export async function logFin(conn, id, estado, dias, filas, mensaje) {
  await conn.execute(
    "UPDATE wansoft_sync_log SET terminado_en = NOW(), estado = ?, dias = ?, filas = ?, mensaje = ? WHERE id = ?",
    [estado, dias, filas, String(mensaje || "").slice(0, 60000), id]
  );
}

/** UPSERT de un producto/platillo (origen = 'sync'). */
export async function upsertProducto(conn, sucursalId, fecha, r) {
  await conn.execute(
    `INSERT INTO wansoft_ventas_productos
       (sucursal_id, fecha, producto, categoria, cantidad, subtotal, total, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'sync')
     ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad), categoria=VALUES(categoria),
       subtotal=VALUES(subtotal), total=VALUES(total), origen='sync'`,
    [sucursalId, fecha, r.producto, r.categoria ?? null, r.cantidad ?? null, r.subtotal ?? null, r.total ?? null]
  );
}

/** UPSERT de un tipo de producto (nivel='tipo', origen='sync'). */
export async function upsertCategoria(conn, sucursalId, fecha, r) {
  await conn.execute(
    `INSERT INTO wansoft_ventas_categorias
       (sucursal_id, fecha, nivel, nombre, subtotal, iva, total, origen)
     VALUES (?, ?, 'tipo', ?, ?, ?, ?, 'sync')
     ON DUPLICATE KEY UPDATE subtotal=VALUES(subtotal), iva=VALUES(iva), total=VALUES(total), origen='sync'`,
    [sucursalId, fecha, r.nombre, r.subtotal ?? null, r.iva ?? null, r.total ?? null]
  );
}

/** UPSERT de un renglón de reporte dimensional (origen = 'sync'). */
export async function upsertReporte(conn, sucursalId, fecha, r) {
  await conn.execute(
    `INSERT INTO wansoft_reportes
       (sucursal_id, fecha, reporte, etiqueta, etiqueta2, cantidad, cantidad2, subtotal, iva, total, porcentaje, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sync')
     ON DUPLICATE KEY UPDATE cantidad=VALUES(cantidad), cantidad2=VALUES(cantidad2),
       subtotal=VALUES(subtotal), iva=VALUES(iva), total=VALUES(total),
       porcentaje=VALUES(porcentaje), origen='sync'`,
    [sucursalId, fecha, r.reporte, r.etiqueta, r.etiqueta2 ?? "", r.cantidad ?? null, r.cantidad2 ?? null,
     r.subtotal ?? null, r.iva ?? null, r.total ?? null, r.porcentaje ?? null]
  );
}
