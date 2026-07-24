/**
 * Llena la base con los datos iniciales (usuario admin, configuración,
 * sucursales y menú). Es idempotente: si un registro ya existe, no lo duplica.
 *   npm run db:sembrar
 */
"use strict";

const bcrypt = require("bcryptjs");
const { pool } = require("./pool");
const config = require("../config/env");
const { CONFIGURACION, SUCURSALES, CATEGORIAS } = require("./datos-iniciales");

async function sembrarUsuario(cx) {
  if (!config.adminInicial.password) {
    console.log("⚠  ADMIN_PASSWORD no está en el .env: se omite el usuario inicial.");
    return;
  }
  const [existe] = await cx.execute("SELECT id FROM usuarios WHERE usuario = ?", [
    config.adminInicial.usuario,
  ]);
  if (existe.length) {
    console.log(`  · usuario "${config.adminInicial.usuario}" ya existe`);
    return;
  }
  const hash = await bcrypt.hash(config.adminInicial.password, 12);
  await cx.execute(
    "INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, 'admin')",
    [config.adminInicial.usuario, hash, config.adminInicial.nombre]
  );
  console.log(`  ✓ usuario "${config.adminInicial.usuario}" creado`);
}

async function sembrarConfiguracion(cx) {
  for (const fila of CONFIGURACION) {
    await cx.execute(
      `INSERT INTO configuracion (clave, valor, descripcion, grupo) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), grupo = VALUES(grupo)`,
      [fila.clave, fila.valor, fila.descripcion, fila.grupo]
    );
  }
  console.log(`  ✓ ${CONFIGURACION.length} claves de configuración`);
}

async function sembrarSucursales(cx) {
  for (const s of SUCURSALES) {
    await cx.execute(
      `INSERT INTO sucursales (slug, nombre, direccion, colonia, ciudad, telefono, horario, mapa_url, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [s.slug, s.nombre, s.direccion, s.colonia, s.ciudad, s.telefono, s.horario, s.mapa_url, s.orden]
    );
  }
  console.log(`  ✓ ${SUCURSALES.length} sucursales`);
}

async function sembrarMenu(cx) {
  let productos = 0;
  for (const categoria of CATEGORIAS) {
    await cx.execute(
      `INSERT INTO categorias (slug, nombre, emoji, orden) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE id = id`,
      [categoria.slug, categoria.nombre, categoria.emoji, categoria.orden]
    );
    const [[fila]] = await cx.execute("SELECT id FROM categorias WHERE slug = ?", [categoria.slug]);

    for (const p of categoria.productos) {
      await cx.execute(
        `INSERT INTO productos (categoria_id, slug, nombre, descripcion, precio, etiqueta, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [fila.id, p.slug, p.nombre, p.descripcion, p.precio, p.etiqueta || null, p.orden]
      );
      const [[prod]] = await cx.execute("SELECT id FROM productos WHERE slug = ?", [p.slug]);
      productos += 1;

      for (const [i, opcion] of (p.opciones || []).entries()) {
        await cx.execute(
          `INSERT INTO producto_opciones (producto_id, slug, etiqueta, orden) VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE id = id`,
          [prod.id, opcion.slug, opcion.etiqueta, i + 1]
        );
        const [[op]] = await cx.execute(
          "SELECT id FROM producto_opciones WHERE producto_id = ? AND slug = ?",
          [prod.id, opcion.slug]
        );

        for (const [j, eleccion] of opcion.elecciones.entries()) {
          await cx.execute(
            `INSERT INTO producto_elecciones (opcion_id, slug, etiqueta, extra, orden)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE id = id`,
            [op.id, eleccion.slug, eleccion.etiqueta, eleccion.extra, j + 1]
          );
        }
      }
    }
  }
  console.log(`  ✓ ${CATEGORIAS.length} categorías y ${productos} productos`);
}

async function sembrar() {
  const cx = await pool.getConnection();
  try {
    console.log(`→ Sembrando ${config.db.database}…`);
    await sembrarUsuario(cx);
    await sembrarConfiguracion(cx);
    await sembrarSucursales(cx);
    await sembrarMenu(cx);
    console.log("\n✅ Datos iniciales listos.");
    console.log(`   Entra al panel en /admin con el usuario "${config.adminInicial.usuario}".`);
  } finally {
    cx.release();
    await pool.end();
  }
}

sembrar().catch((error) => {
  console.error("\n❌ Error al sembrar:", error.message);
  process.exit(1);
});
