/**
 * API del panel de administración. Todas las rutas exigen sesión.
 */
"use strict";

const express = require("express");
const menu = require("../services/menu.service");
const sucursales = require("../services/sucursales.service");
const configuracion = require("../services/configuracion.service");
const destacados = require("../services/destacados.service");
const { exigirSesion } = require("../middleware/auth");
const { subir, urlPublica, borrarImagen } = require("../middleware/subidas");
const { entero } = require("../lib/validar");

const router = express.Router();
router.use(exigirSesion);

/** Envuelve un handler async para que los errores lleguen al middleware. */
const asincrono = (handler) => (req, res, next) => handler(req, res, next).catch(next);
const idDe = (req) => entero(req.params.id, "id", { min: 1 });

/* ---------- Menú completo (vista del panel) ---------- */
router.get(
  "/menu",
  asincrono(async (req, res) => {
    res.json({ ok: true, menu: await menu.menuCompleto(false) });
  })
);

/* ---------- Categorías ---------- */
router.get(
  "/categorias",
  asincrono(async (req, res) => {
    res.json({ ok: true, categorias: await menu.listarCategorias() });
  })
);

router.post(
  "/categorias",
  asincrono(async (req, res) => {
    res.status(201).json({ ok: true, ...(await menu.crearCategoria(req.body)) });
  })
);

router.put(
  "/categorias/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, ...(await menu.actualizarCategoria(idDe(req), req.body)) });
  })
);

router.delete(
  "/categorias/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, ...(await menu.eliminarCategoria(idDe(req))) });
  })
);

/* ---------- Productos ---------- */
router.get(
  "/productos/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, producto: await menu.obtenerProducto(idDe(req)) });
  })
);

router.post(
  "/productos",
  asincrono(async (req, res) => {
    res.status(201).json({ ok: true, ...(await menu.crearProducto(req.body)) });
  })
);

router.put(
  "/productos/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, ...(await menu.actualizarProducto(idDe(req), req.body)) });
  })
);

router.delete(
  "/productos/:id",
  asincrono(async (req, res) => {
    const id = idDe(req);
    const producto = await menu.obtenerProducto(id);
    await menu.eliminarProducto(id);
    borrarImagen(producto.imagen);
    res.json({ ok: true, id });
  })
);

/* ---------- Sucursales ---------- */
router.get(
  "/sucursales",
  asincrono(async (req, res) => {
    res.json({ ok: true, sucursales: await sucursales.listar(false) });
  })
);

router.get(
  "/sucursales/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, sucursal: await sucursales.obtener(idDe(req)) });
  })
);

router.post(
  "/sucursales",
  asincrono(async (req, res) => {
    res.status(201).json({ ok: true, ...(await sucursales.crear(req.body)) });
  })
);

router.put(
  "/sucursales/:id",
  asincrono(async (req, res) => {
    res.json({ ok: true, ...(await sucursales.actualizar(idDe(req), req.body)) });
  })
);

router.delete(
  "/sucursales/:id",
  asincrono(async (req, res) => {
    const id = idDe(req);
    const sucursal = await sucursales.obtener(id);
    await sucursales.eliminar(id);
    borrarImagen(sucursal.imagen);
    res.json({ ok: true, id });
  })
);

/* ---------- Destacados de la portada ---------- */
router.get(
  "/destacados",
  asincrono(async (req, res) => {
    res.json({ ok: true, destacados: await destacados.paraPanel() });
  })
);

router.put(
  "/destacados/hero",
  asincrono(async (req, res) => {
    res.json({ ok: true, ...(await destacados.guardarHero(req.body)) });
  })
);

router.put(
  "/destacados/promos",
  asincrono(async (req, res) => {
    const lista = Array.isArray(req.body) ? req.body : req.body.promos;
    res.json({ ok: true, ...(await destacados.guardarPromos(lista)) });
  })
);

/* ---------- Configuración ---------- */
router.get(
  "/configuracion",
  asincrono(async (req, res) => {
    res.json({ ok: true, configuracion: await configuracion.listar() });
  })
);

router.put(
  "/configuracion",
  asincrono(async (req, res) => {
    const guardadas = await configuracion.guardar(req.body);
    res.json({ ok: true, guardadas });
  })
);

/* ---------- Subida de imágenes ---------- */
router.post("/subidas", subir.single("imagen"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: "No llegó ninguna imagen." });
  }
  return res.status(201).json({ ok: true, url: urlPublica(req, req.file) });
});

module.exports = router;
