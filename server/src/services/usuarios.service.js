/**
 * Usuarios del panel de administración.
 */
"use strict";

const bcrypt = require("bcryptjs");
const { consultar, unaFila } = require("../db/pool");
const { ErrorHttp, texto } = require("../lib/validar");

const MIN_PASSWORD = 8;

async function buscarPorUsuario(usuario) {
  return unaFila(
    "SELECT id, usuario, password_hash, nombre, rol, activo FROM usuarios WHERE usuario = ?",
    [usuario]
  );
}

/**
 * Verifica credenciales. Devuelve el usuario sin el hash, o null.
 * Siempre compara contra un hash (aunque el usuario no exista) para no
 * revelar por tiempo de respuesta si el usuario es válido.
 */
const HASH_FALSO = bcrypt.hashSync("usuario-inexistente", 12);

async function verificarCredenciales(usuario, password) {
  const fila = await buscarPorUsuario(usuario);
  const hash = fila && fila.activo ? fila.password_hash : HASH_FALSO;
  const coincide = await bcrypt.compare(password, hash);

  if (!fila || !fila.activo || !coincide) return null;

  await consultar("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?", [fila.id]);
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
}

async function cambiarPassword(id, passwordActual, passwordNueva) {
  const fila = await unaFila("SELECT id, password_hash FROM usuarios WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "El usuario no existe.");

  const correcta = await bcrypt.compare(passwordActual, fila.password_hash);
  if (!correcta) throw new ErrorHttp(401, "La contraseña actual no es correcta.");

  const nueva = texto(passwordNueva, "contraseña nueva", { max: 100, min: MIN_PASSWORD });
  if (nueva.length < MIN_PASSWORD) {
    throw new ErrorHttp(400, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (nueva === passwordActual) {
    throw new ErrorHttp(400, "La contraseña nueva debe ser distinta de la actual.");
  }

  const hash = await bcrypt.hash(nueva, 12);
  await consultar("UPDATE usuarios SET password_hash = ? WHERE id = ?", [hash, id]);
  return { id };
}

module.exports = { buscarPorUsuario, verificarCredenciales, cambiarPassword, MIN_PASSWORD };
