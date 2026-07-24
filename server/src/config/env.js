/**
 * Carga y valida las variables de entorno.
 * Si falta algo crítico, el servidor no arranca (fail fast).
 */
"use strict";

const path = require("path");
const dotenv = require("dotenv");

const RAIZ = path.resolve(__dirname, "..", "..", "..");
dotenv.config({ path: path.join(RAIZ, ".env") });

const OBLIGATORIAS = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];

function validar() {
  const faltantes = OBLIGATORIAS.filter((clave) => !process.env[clave]);
  if (faltantes.length) {
    throw new Error(
      `Faltan variables de entorno: ${faltantes.join(", ")}.\n` +
        "Copia .env.example como .env y llena los valores."
    );
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 caracteres.");
  }
}

validar();

const entero = (valor, porDefecto) => {
  const n = Number.parseInt(valor, 10);
  return Number.isFinite(n) ? n : porDefecto;
};

const obtenerPuerto = () => {
  const indiceArg = process.argv.findIndex((arg) => arg === "-p" || arg === "--port");
  if (indiceArg !== -1 && process.argv[indiceArg + 1]) {
    const valor = entero(process.argv[indiceArg + 1]);
    if (valor) return valor;
  }
  return entero(process.env.PORT, 3000);
};

module.exports = {
  raiz: RAIZ,
  rutaPublica: path.join(RAIZ, "public"),
  rutaAdmin: path.join(RAIZ, "admin"),
  rutaSubidas: path.join(RAIZ, "public", "uploads"),

  puerto: obtenerPuerto(),
  entorno: process.env.NODE_ENV || "development",
  esProduccion: process.env.NODE_ENV === "production",

  db: {
    host: process.env.DB_HOST,
    port: entero(process.env.DB_PORT, 3306),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionLimit: entero(process.env.DB_CONNECTION_LIMIT, 10),
  },

  jwt: {
    secreto: process.env.JWT_SECRET,
    expira: process.env.JWT_EXPIRA || "8h",
    cookie: "pm_sesion",
  },

  adminInicial: {
    usuario: process.env.ADMIN_USUARIO || "admin",
    password: process.env.ADMIN_PASSWORD,
    nombre: process.env.ADMIN_NOMBRE || "Administrador",
  },

  subidas: {
    maxBytes: entero(process.env.SUBIDA_MAX_MB, 5) * 1024 * 1024,
    tiposPermitidos: ["image/jpeg", "image/png", "image/webp", "image/avif"],
  },
};
