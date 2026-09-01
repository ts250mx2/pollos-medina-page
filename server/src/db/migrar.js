/**
 * Crea las tablas en la base de datos.
 *   npm run db:migrar            → crea lo que falte (no borra nada)
 *   npm run db:migrar -- --forzar → BORRA las tablas y las vuelve a crear
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { pool } = require("./pool");
const config = require("../config/env");

const TABLAS_EN_ORDEN_INVERSO = [
  "producto_elecciones",
  "producto_opciones",
  "productos",
  "categorias",
  "sucursales",
  "configuracion",
  "usuarios",
];

/** Agrega una columna solo si aún no existe (idempotente en bases ya creadas). */
async function asegurarColumna(conexion, tabla, columna, definicion) {
  const [filas] = await conexion.query(
    `SELECT COUNT(*) AS n FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [config.db.database, tabla, columna]
  );
  if (filas[0].n === 0) {
    await conexion.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
    console.log(`  + columna ${tabla}.${columna}`);
  }
}

async function migrar({ forzar }) {
  const conexion = await pool.getConnection();
  try {
    console.log(`→ Base de datos: ${config.db.database} en ${config.db.host}`);

    if (forzar) {
      console.log("→ --forzar activado: eliminando tablas existentes…");
      await conexion.query("SET FOREIGN_KEY_CHECKS = 0");
      for (const tabla of TABLAS_EN_ORDEN_INVERSO) {
        await conexion.query(`DROP TABLE IF EXISTS \`${tabla}\``);
        console.log(`  ✗ ${tabla}`);
      }
      await conexion.query("SET FOREIGN_KEY_CHECKS = 1");
    }

    // Tablas reemplazadas por el catálogo global (terminales / usuarios_plataforma).
    await conexion.query("DROP TABLE IF EXISTS sucursal_terminales");
    await conexion.query("DROP TABLE IF EXISTS sucursal_usuarios_wansoft");

    const sql = fs.readFileSync(path.join(__dirname, "esquema.sql"), "utf8");
    const sinComentarios = sql
      .split(/\r?\n/)
      .filter((linea) => !linea.trim().startsWith("--"))
      .join("\n");
    const sentencias = sinComentarios
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const sentencia of sentencias) {
      await conexion.query(sentencia);
      const nombre = /CREATE TABLE IF NOT EXISTS (\w+)/i.exec(sentencia);
      if (nombre) console.log(`  ✓ ${nombre[1]}`);
    }

    // Columnas agregadas después de la creación inicial de una tabla.
    // CREATE TABLE IF NOT EXISTS no toca tablas existentes, así que aquí
    // añadimos, de forma idempotente, las columnas que falten en bases viejas.
    await asegurarColumna(conexion, "wansoft_sucursales", "alias", "VARCHAR(160) NULL AFTER nombre");
    await asegurarColumna(conexion, "terminales", "notas", "VARCHAR(500) NULL AFTER cuenta");
    await asegurarColumna(conexion, "usuarios_plataforma", "nombre", "VARCHAR(160) NULL AFTER id");

    const [tablas] = await conexion.query("SHOW TABLES");
    console.log(`\n✅ Listo. La base tiene ${tablas.length} tablas.`);
  } finally {
    conexion.release();
    await pool.end();
  }
}

migrar({ forzar: process.argv.includes("--forzar") }).catch((error) => {
  console.error("\n❌ Error al migrar:", error.message);
  process.exit(1);
});
