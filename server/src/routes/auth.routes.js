/**
 * Inicio y cierre de sesión del panel.
 */
"use strict";

const express = require("express");
const rateLimit = require("express-rate-limit");
const usuarios = require("../services/usuarios.service");
const { emitirToken, ponerCookie, quitarCookie, exigirSesion } = require("../middleware/auth");

const router = express.Router();

/** Máximo 8 intentos de login cada 10 minutos por IP. */
const limiteLogin = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { ok: false, error: "Demasiados intentos. Espera 10 minutos e inténtalo de nuevo." },
});

router.post("/login", limiteLogin, async (req, res, next) => {
  try {
    const usuario = String(req.body.usuario || "").trim();
    const password = String(req.body.password || "");

    if (!usuario || !password) {
      return res.status(400).json({ ok: false, error: "Escribe tu usuario y contraseña." });
    }

    const encontrado = await usuarios.verificarCredenciales(usuario, password);
    if (!encontrado) {
      return res.status(401).json({ ok: false, error: "Usuario o contraseña incorrectos." });
    }

    ponerCookie(res, emitirToken(encontrado));
    return res.json({ ok: true, usuario: encontrado });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => {
  quitarCookie(res);
  res.json({ ok: true });
});

router.get("/yo", exigirSesion, (req, res) => {
  res.json({ ok: true, usuario: req.usuario });
});

router.put("/password", exigirSesion, async (req, res, next) => {
  try {
    await usuarios.cambiarPassword(
      req.usuario.id,
      String(req.body.actual || ""),
      String(req.body.nueva || "")
    );
    quitarCookie(res);
    res.json({ ok: true, mensaje: "Contraseña actualizada. Vuelve a iniciar sesión." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
