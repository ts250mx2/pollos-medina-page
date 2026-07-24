/**
 * Sesión del panel: token JWT guardado en una cookie httpOnly.
 */
"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config/env");

function emitirToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre, rol: usuario.rol },
    config.jwt.secreto,
    { expiresIn: config.jwt.expira }
  );
}

function ponerCookie(res, token) {
  res.cookie(config.jwt.cookie, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: config.esProduccion,
    maxAge: 8 * 60 * 60 * 1000,
    path: "/",
  });
}

function quitarCookie(res) {
  res.clearCookie(config.jwt.cookie, { path: "/" });
}

/** Bloquea la petición si no hay sesión válida. */
function exigirSesion(req, res, next) {
  const token = req.cookies ? req.cookies[config.jwt.cookie] : null;
  if (!token) {
    return res.status(401).json({ ok: false, error: "Necesitas iniciar sesión." });
  }
  try {
    const datos = jwt.verify(token, config.jwt.secreto);
    req.usuario = { id: datos.sub, usuario: datos.usuario, nombre: datos.nombre, rol: datos.rol };
    return next();
  } catch {
    quitarCookie(res);
    return res.status(401).json({ ok: false, error: "Tu sesión expiró. Vuelve a entrar." });
  }
}

module.exports = { emitirToken, ponerCookie, quitarCookie, exigirSesion };
