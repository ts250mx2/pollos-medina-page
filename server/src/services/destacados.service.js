/**
 * Destacados de la portada:
 *   - hero:  el producto de la foto principal (uno solo)
 *   - promo: los productos de "Promociones de la semana" (varios, en orden)
 *
 * Cada destacado referencia un producto existente; el nombre, precio, foto y
 * descripción se toman del producto. Así se edita en un solo lugar.
 */
"use strict";

const { consultar, unaFila, enTransaccion } = require("../db/pool");
const { ErrorHttp, entero, textoOpcional } = require("../lib/validar");

const MAX_PROMOS = 6;

const SELECT_RESUELTO = `
  SELECT d.id, d.seccion, d.producto_id, d.etiqueta, d.subtitulo, d.orden, d.activo,
         p.slug, p.nombre, p.descripcion, p.precio, p.imagen, p.activo AS producto_activo
  FROM destacados d
  JOIN productos p ON p.id = d.producto_id
`;

function mapear(fila) {
  return {
    id: fila.id,
    productoId: fila.producto_id,
    slug: fila.slug,
    nombre: fila.nombre,
    desc: fila.descripcion || "",
    precio: Number(fila.precio),
    img: fila.imagen || null,
    etiqueta: fila.etiqueta || null,
    subtitulo: fila.subtitulo || null,
    orden: fila.orden,
  };
}

/** Lo que consume el sitio público: hero (o null) y lista de promos. */
async function paraSitio() {
  const filas = await consultar(
    `${SELECT_RESUELTO} WHERE d.activo = 1 AND p.activo = 1 ORDER BY d.seccion, d.orden, d.id`
  );
  const hero = filas.find((f) => f.seccion === "hero");
  const promos = filas.filter((f) => f.seccion === "promo").map(mapear);
  return { hero: hero ? mapear(hero) : null, promos };
}

/** Estado actual para el panel (incluye referencias aunque el producto esté oculto). */
async function paraPanel() {
  const filas = await consultar(`${SELECT_RESUELTO} ORDER BY d.seccion, d.orden, d.id`);
  const hero = filas.find((f) => f.seccion === "hero");
  const promos = filas.filter((f) => f.seccion === "promo").map(mapear);
  return { hero: hero ? mapear(hero) : null, promos };
}

/** Verifica que el producto exista antes de destacarlo. */
async function exigirProducto(id) {
  const fila = await unaFila("SELECT id FROM productos WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "El producto elegido ya no existe.");
  return fila;
}

/**
 * Define la foto principal. Si producto_id viene vacío, quita el hero
 * (el sitio vuelve al panel de marca por defecto).
 */
async function guardarHero(datos) {
  const productoId = datos.producto_id ? entero(datos.producto_id, "producto", { min: 1 }) : null;
  const etiqueta = textoOpcional(datos.etiqueta, "cinta", { max: 60 });
  const subtitulo = textoOpcional(datos.subtitulo, "subtítulo", { max: 120 });

  return enTransaccion(async (cx) => {
    await cx.execute("DELETE FROM destacados WHERE seccion = 'hero'");
    if (!productoId) return { hero: null };

    await exigirProductoEn(cx, productoId);
    await cx.execute(
      "INSERT INTO destacados (seccion, producto_id, etiqueta, subtitulo, orden) VALUES ('hero', ?, ?, ?, 0)",
      [productoId, etiqueta, subtitulo]
    );
    return { hero: productoId };
  });
}

/**
 * Reemplaza toda la lista de promos por la enviada (en el orden recibido).
 * Cada elemento: { producto_id, etiqueta }.
 */
async function guardarPromos(lista) {
  if (!Array.isArray(lista)) throw new ErrorHttp(400, "Se esperaba una lista de promociones.");
  if (lista.length > MAX_PROMOS) {
    throw new ErrorHttp(400, `Máximo ${MAX_PROMOS} promociones en la portada.`);
  }

  const limpias = lista.map((item, i) => ({
    productoId: entero(item.producto_id, "producto", { min: 1 }),
    etiqueta: textoOpcional(item.etiqueta, "insignia", { max: 60 }),
    orden: i + 1,
  }));

  return enTransaccion(async (cx) => {
    await cx.execute("DELETE FROM destacados WHERE seccion = 'promo'");
    for (const p of limpias) {
      await exigirProductoEn(cx, p.productoId);
      await cx.execute(
        "INSERT INTO destacados (seccion, producto_id, etiqueta, orden) VALUES ('promo', ?, ?, ?)",
        [p.productoId, p.etiqueta, p.orden]
      );
    }
    return { promos: limpias.length };
  });
}

async function exigirProductoEn(cx, id) {
  const [filas] = await cx.execute("SELECT id FROM productos WHERE id = ?", [id]);
  if (!filas.length) throw new ErrorHttp(404, `El producto #${id} ya no existe.`);
}

module.exports = { paraSitio, paraPanel, guardarHero, guardarPromos, MAX_PROMOS };
