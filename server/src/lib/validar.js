/**
 * Validación de entradas. Todo lo que llega del cliente pasa por aquí.
 */
"use strict";

class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

const malaPeticion = (mensaje) => new ErrorHttp(400, mensaje);

/** Texto obligatorio, recortado y con longitud máxima. */
function texto(valor, campo, { max = 255, min = 1 } = {}) {
  const limpio = String(valor == null ? "" : valor).trim();
  if (limpio.length < min) throw malaPeticion(`El campo "${campo}" es obligatorio.`);
  if (limpio.length > max) throw malaPeticion(`El campo "${campo}" no puede pasar de ${max} caracteres.`);
  return limpio;
}

/** Texto opcional: devuelve null si viene vacío. */
function textoOpcional(valor, campo, { max = 255 } = {}) {
  const limpio = String(valor == null ? "" : valor).trim();
  if (!limpio) return null;
  if (limpio.length > max) throw malaPeticion(`El campo "${campo}" no puede pasar de ${max} caracteres.`);
  return limpio;
}

/** Número decimal no negativo. */
function numero(valor, campo, { min = 0, max = 999999 } = {}) {
  const n = Number(valor);
  if (!Number.isFinite(n)) throw malaPeticion(`El campo "${campo}" debe ser un número.`);
  if (n < min || n > max) throw malaPeticion(`El campo "${campo}" debe estar entre ${min} y ${max}.`);
  return Math.round(n * 100) / 100;
}

/** Entero (orden, ids). */
function entero(valor, campo, { min = 0, max = 999999 } = {}) {
  const n = Number.parseInt(valor, 10);
  if (!Number.isInteger(n)) throw malaPeticion(`El campo "${campo}" debe ser un número entero.`);
  if (n < min || n > max) throw malaPeticion(`El campo "${campo}" debe estar entre ${min} y ${max}.`);
  return n;
}

/** Booleano tolerante ("1", "true", true, 1). */
function booleano(valor, porDefecto = true) {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  return valor === true || valor === 1 || valor === "1" || valor === "true";
}

/** Convierte un texto en slug seguro para URLs e identificadores. */
function aSlug(valor, campo) {
  const base = String(valor == null ? "" : valor)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!base) throw malaPeticion(`No se pudo generar un identificador para "${campo}".`);
  return base;
}

/** URL http/https opcional. */
function urlOpcional(valor, campo) {
  const limpio = textoOpcional(valor, campo, { max: 500 });
  if (!limpio) return null;
  try {
    const url = new URL(limpio);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return limpio;
  } catch {
    throw malaPeticion(`El campo "${campo}" debe ser una dirección web válida (https://…).`);
  }
}

/** Coordenada geográfica opcional. */
function coordenadaOpcional(valor, campo, limite) {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || Math.abs(n) > limite) {
    throw malaPeticion(`El campo "${campo}" no es una coordenada válida.`);
  }
  return n;
}

module.exports = {
  ErrorHttp,
  malaPeticion,
  texto,
  textoOpcional,
  numero,
  entero,
  booleano,
  aSlug,
  urlOpcional,
  coordenadaOpcional,
};
