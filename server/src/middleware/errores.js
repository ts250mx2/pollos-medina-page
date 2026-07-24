/**
 * Manejo central de errores. Al cliente le llega un mensaje claro;
 * el detalle técnico se queda en el log del servidor.
 */
"use strict";

const multer = require("multer");
const config = require("../config/env");

function noEncontrado(req, res) {
  res.status(404).json({ ok: false, error: "Ruta no encontrada." });
}

// eslint-disable-next-line no-unused-vars
function manejarErrores(error, req, res, next) {
  const estado = error.estado || estadoSegunError(error);

  if (estado >= 500) {
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, error);
  }

  res.status(estado).json({
    ok: false,
    error: estado >= 500 ? "Ocurrió un error en el servidor. Intenta de nuevo." : error.message,
    ...(config.esProduccion || estado < 500 ? {} : { detalle: error.message }),
  });
}

function estadoSegunError(error) {
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
  }
  if (error.code === "ER_DUP_ENTRY") return 409;
  if (error.code === "ER_ROW_IS_REFERENCED_2") return 409;
  if (error.code === "ECONNREFUSED" || error.code === "PROTOCOL_CONNECTION_LOST") return 503;
  return 500;
}

module.exports = { noEncontrado, manejarErrores };
