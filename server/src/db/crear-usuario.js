/**
 * Crea o actualiza un usuario del panel desde la terminal.
 *   npm run usuario:crear -- <usuario> <password> ["Nombre visible"]
 */
"use strict";

const bcrypt = require("bcryptjs");
const { pool } = require("./pool");

async function principal() {
  const [usuario, password, nombre] = process.argv.slice(2);

  if (!usuario || !password) {
    console.error('Uso: npm run usuario:crear -- <usuario> <password> ["Nombre visible"]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("La contraseña debe tener al menos 8 caracteres.");
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 12);
  await pool.execute(
    `INSERT INTO usuarios (usuario, password_hash, nombre, rol)
     VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), nombre = VALUES(nombre), activo = 1`,
    [usuario, hash, nombre || usuario]
  );

  console.log(`✅ Usuario "${usuario}" listo. Ya puedes entrar al panel.`);
  await pool.end();
}

principal().catch((error) => {
  console.error("❌", error.message);
  process.exit(1);
});
