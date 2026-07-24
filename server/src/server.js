/**
 * Arranque del servidor.
 */
"use strict";

const app = require("./app");
const config = require("./config/env");
const { verificarConexion, pool } = require("./db/pool");

async function arrancar() {
  try {
    const info = await verificarConexion();
    console.log(`✓ MySQL ${info.version} conectado (${info.base})`);
  } catch (error) {
    console.error("✗ No se pudo conectar a la base de datos:", error.message);
    console.error("  Revisa DB_HOST, DB_USER y DB_PASSWORD en el archivo .env");
    process.exit(1);
  }

  const servidor = app.listen(config.puerto, () => {
    console.log("");
    console.log("  🍗  Pollo Medina");
    console.log(`  Sitio:  http://localhost:${config.puerto}`);
    console.log(`  Panel:  http://localhost:${config.puerto}/admin`);
    console.log(`  Modo:   ${config.entorno}`);
    console.log("");
  });

  const apagar = (senal) => async () => {
    console.log(`\n${senal} recibido, cerrando…`);
    servidor.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", apagar("SIGINT"));
  process.on("SIGTERM", apagar("SIGTERM"));
}

arrancar();
