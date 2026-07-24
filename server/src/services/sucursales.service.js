/**
 * Sucursales del negocio.
 */
"use strict";

const { consultar, unaFila } = require("../db/pool");
const {
  ErrorHttp,
  texto,
  textoOpcional,
  entero,
  booleano,
  aSlug,
  urlOpcional,
  coordenadaOpcional,
} = require("../lib/validar");

const CAMPOS = `id, slug, nombre, direccion, colonia, ciudad, telefono, whatsapp,
                horario, mapa_url, lat, lng, imagen, orden, activo`;

/** Listado. Con soloActivas=true devuelve lo que ve el público. */
async function listar(soloActivas = true) {
  const filas = await consultar(
    `SELECT ${CAMPOS} FROM sucursales ${soloActivas ? "WHERE activo = 1" : ""}
     ORDER BY orden, nombre`
  );
  return filas.map(normalizar);
}

/** Forma que consume el sitio público. */
async function paraSitio() {
  const filas = await listar(true);
  return filas.map((s) => ({
    id: s.slug,
    nombre: s.nombre,
    direccion: [s.direccion, s.colonia, s.ciudad].filter(Boolean).join(", "),
    telefono: s.telefono || "",
    horario: s.horario || "",
    mapa: s.mapa_url || "",
    imagen: s.imagen || "",
  }));
}

async function obtener(id) {
  const fila = await unaFila(`SELECT ${CAMPOS} FROM sucursales WHERE id = ?`, [id]);
  if (!fila) throw new ErrorHttp(404, "La sucursal no existe.");
  return normalizar(fila);
}

function normalizar(fila) {
  return {
    ...fila,
    lat: fila.lat === null ? null : Number(fila.lat),
    lng: fila.lng === null ? null : Number(fila.lng),
    activo: Boolean(fila.activo),
  };
}

function leerDatos(datos) {
  const nombre = texto(datos.nombre, "nombre", { max: 140 });
  return {
    nombre,
    slug: aSlug(datos.slug || nombre, "nombre"),
    direccion: texto(datos.direccion, "dirección", { max: 255 }),
    colonia: textoOpcional(datos.colonia, "colonia", { max: 120 }),
    ciudad: textoOpcional(datos.ciudad, "ciudad", { max: 120 }),
    telefono: textoOpcional(datos.telefono, "teléfono", { max: 40 }),
    whatsapp: textoOpcional(datos.whatsapp, "whatsapp", { max: 40 }),
    horario: textoOpcional(datos.horario, "horario", { max: 180 }),
    mapa_url: urlOpcional(datos.mapa_url, "enlace del mapa"),
    lat: coordenadaOpcional(datos.lat, "latitud", 90),
    lng: coordenadaOpcional(datos.lng, "longitud", 180),
    imagen: textoOpcional(datos.imagen, "imagen", { max: 255 }),
    orden: entero(datos.orden ?? 99, "orden"),
    activo: booleano(datos.activo) ? 1 : 0,
  };
}

async function crear(datos) {
  const s = leerDatos(datos);
  const repetido = await unaFila("SELECT id FROM sucursales WHERE slug = ?", [s.slug]);
  if (repetido) throw new ErrorHttp(409, `Ya existe una sucursal con el identificador "${s.slug}".`);

  const resultado = await consultar(
    `INSERT INTO sucursales (slug, nombre, direccion, colonia, ciudad, telefono, whatsapp,
                             horario, mapa_url, lat, lng, imagen, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.slug, s.nombre, s.direccion, s.colonia, s.ciudad, s.telefono, s.whatsapp,
     s.horario, s.mapa_url, s.lat, s.lng, s.imagen, s.orden, s.activo]
  );
  return { id: resultado.insertId, slug: s.slug };
}

async function actualizar(id, datos) {
  const actual = await unaFila("SELECT id, slug FROM sucursales WHERE id = ?", [id]);
  if (!actual) throw new ErrorHttp(404, "La sucursal no existe.");

  const s = leerDatos({ ...datos, slug: datos.slug || actual.slug });
  const repetido = await unaFila("SELECT id FROM sucursales WHERE slug = ? AND id <> ?", [s.slug, id]);
  if (repetido) throw new ErrorHttp(409, `Ya existe otra sucursal con el identificador "${s.slug}".`);

  await consultar(
    `UPDATE sucursales SET slug = ?, nombre = ?, direccion = ?, colonia = ?, ciudad = ?,
            telefono = ?, whatsapp = ?, horario = ?, mapa_url = ?, lat = ?, lng = ?,
            imagen = ?, orden = ?, activo = ?
     WHERE id = ?`,
    [s.slug, s.nombre, s.direccion, s.colonia, s.ciudad, s.telefono, s.whatsapp,
     s.horario, s.mapa_url, s.lat, s.lng, s.imagen, s.orden, s.activo, id]
  );
  return { id, slug: s.slug };
}

async function eliminar(id) {
  const fila = await unaFila("SELECT id FROM sucursales WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "La sucursal no existe.");
  await consultar("DELETE FROM sucursales WHERE id = ?", [id]);
  return { id };
}

module.exports = { listar, paraSitio, obtener, crear, actualizar, eliminar };
