/**
 * API pública (sin autenticación) que consume el sitio web.
 */
"use strict";

const express = require("express");
const menu = require("../services/menu.service");
const sucursales = require("../services/sucursales.service");
const configuracion = require("../services/configuracion.service");
const destacados = require("../services/destacados.service");

const router = express.Router();

/** Todo lo que la página necesita en una sola llamada. */
router.get("/sitio", async (req, res, next) => {
  try {
    const [config, listaMenu, listaSucursales, portada] = await Promise.all([
      configuracion.paraSitio(),
      menu.menuCompleto(true),
      sucursales.paraSitio(),
      destacados.paraSitio(),
    ]);

    res.set("Cache-Control", "public, max-age=60");
    res.json({
      ok: true,
      config: { ...config, sucursales: listaSucursales },
      menu: limpiarMenu(listaMenu),
      destacados: portada,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/menu", async (req, res, next) => {
  try {
    res.json({ ok: true, menu: limpiarMenu(await menu.menuCompleto(true)) });
  } catch (error) {
    next(error);
  }
});

router.get("/sucursales", async (req, res, next) => {
  try {
    res.json({ ok: true, sucursales: await sucursales.paraSitio() });
  } catch (error) {
    next(error);
  }
});

/** Quita los campos internos que el sitio público no necesita. */
function limpiarMenu(categorias) {
  return categorias.map((c) => ({
    id: c.id,
    nombre: c.nombre,
    emoji: c.emoji,
    productos: c.productos.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      desc: p.desc,
      precio: p.precio,
      tag: p.tag,
      img: p.img,
      opciones: p.opciones,
    })),
  }));
}

module.exports = router;
