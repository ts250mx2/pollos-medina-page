/**
 * Subida de imágenes desde el panel.
 * Se guardan en public/uploads/<carpeta>/ con un nombre generado,
 * nunca con el nombre que manda el navegador (evita path traversal).
 */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const config = require("../config/env");

const CARPETAS_VALIDAS = ["menu", "sucursales"];
const EXTENSION_POR_TIPO = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

function carpetaDestino(req) {
  const pedida = String(req.query.carpeta || req.body.carpeta || "menu").toLowerCase();
  return CARPETAS_VALIDAS.includes(pedida) ? pedida : "menu";
}

const almacenamiento = multer.diskStorage({
  destination(req, archivo, cb) {
    const destino = path.join(config.rutaSubidas, carpetaDestino(req));
    fs.mkdirSync(destino, { recursive: true });
    cb(null, destino);
  },
  filename(req, archivo, cb) {
    const extension = EXTENSION_POR_TIPO[archivo.mimetype] || ".jpg";
    const nombre = crypto.randomBytes(10).toString("hex") + "-" + Date.now() + extension;
    cb(null, nombre);
  },
});

function filtro(req, archivo, cb) {
  if (!config.subidas.tiposPermitidos.includes(archivo.mimetype)) {
    const error = new Error("Solo se aceptan imágenes JPG, PNG, WEBP o AVIF.");
    error.estado = 400;
    return cb(error);
  }
  return cb(null, true);
}

const subir = multer({
  storage: almacenamiento,
  fileFilter: filtro,
  limits: { fileSize: config.subidas.maxBytes, files: 1 },
});

/** Ruta pública de un archivo ya guardado. */
function urlPublica(req, archivo) {
  return "/uploads/" + carpetaDestino(req) + "/" + archivo.filename;
}

/** Borra una imagen subida previamente (ignora rutas externas). */
function borrarImagen(rutaPublica) {
  if (!rutaPublica || !rutaPublica.startsWith("/uploads/")) return false;
  const relativa = rutaPublica.replace("/uploads/", "");
  const completa = path.join(config.rutaSubidas, relativa);
  if (!completa.startsWith(config.rutaSubidas)) return false; // fuera de la carpeta permitida
  try {
    fs.unlinkSync(completa);
    return true;
  } catch {
    return false;
  }
}

module.exports = { subir, urlPublica, borrarImagen, CARPETAS_VALIDAS };
