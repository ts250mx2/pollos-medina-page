import { consultar, unaFila, enTransaccion } from "../db";
import {
  ErrorHttp,
  texto,
  textoOpcional,
  numero,
  entero,
  booleano,
  aSlug,
} from "../validar";

export interface Election {
  id: string;
  label: string;
  extra: number;
}

export interface Option {
  id: string;
  label: string;
  elecciones: Election[];
}

export interface ProductPublic {
  id: string;
  idNumerico: number;
  nombre: string;
  desc: string;
  precio: number;
  tag: string | null;
  img: string | null;
  orden: number;
  activo: boolean;
  opciones: Option[];
}

export interface CategoryPublic {
  id: string;
  idNumerico: number;
  nombre: string;
  emoji: string;
  orden: number;
  activo: boolean;
  productos: ProductPublic[];
}

export async function menuCompleto(soloActivos = true): Promise<CategoryPublic[]> {
  const filtroCat = soloActivos ? "WHERE c.activo = 1" : "";
  const filtroProd = soloActivos ? "AND p.activo = 1" : "";

  const categorias = await consultar<any>(
    `SELECT c.id, c.slug, c.nombre, c.emoji, c.orden, c.activo
     FROM categorias c ${filtroCat}
     ORDER BY c.orden, c.nombre`
  );
  if (!categorias.length) return [];

  const productos = await consultar<any>(
    `SELECT p.id, p.categoria_id, p.slug, p.nombre, p.descripcion, p.precio,
            p.etiqueta, p.imagen, p.orden, p.activo
     FROM productos p
     WHERE 1 = 1 ${filtroProd}
     ORDER BY p.orden, p.nombre`
  );
  const opciones = await consultar<any>(
    `SELECT o.id, o.producto_id, o.slug, o.etiqueta, o.orden
     FROM producto_opciones o ORDER BY o.orden, o.id`
  );
  const elecciones = await consultar<any>(
    `SELECT e.id, e.opcion_id, e.slug, e.etiqueta, e.extra, e.orden
     FROM producto_elecciones e ORDER BY e.orden, e.id`
  );

  const eleccionesPorOpcion = agrupar(elecciones, "opcion_id");
  const opcionesPorProducto = agrupar(opciones, "producto_id");
  const productosPorCategoria = agrupar(productos, "categoria_id");

  return categorias.map((c: any) => ({
    id: c.slug,
    idNumerico: c.id,
    nombre: c.nombre,
    emoji: c.emoji,
    orden: c.orden,
    activo: Boolean(c.activo),
    productos: (productosPorCategoria[c.id] || []).map((p: any) => ({
      id: p.slug,
      idNumerico: p.id,
      nombre: p.nombre,
      desc: p.descripcion || "",
      precio: Number(p.precio),
      tag: p.etiqueta || null,
      img: p.imagen || null,
      orden: p.orden,
      activo: Boolean(p.activo),
      opciones: (opcionesPorProducto[p.id] || []).map((o: any) => ({
        id: o.slug,
        label: o.etiqueta,
        elecciones: (eleccionesPorOpcion[o.id] || []).map((e: any) => ({
          id: e.slug,
          label: e.etiqueta,
          extra: Number(e.extra),
        })),
      })),
    })),
  }));
}

function agrupar(filas: any[], campo: string): Record<string, any[]> {
  return filas.reduce((acc, fila) => {
    const clave = fila[campo];
    (acc[clave] = acc[clave] || []).push(fila);
    return acc;
  }, {} as Record<string, any[]>);
}

/* ============================================================
   Categorías
   ============================================================ */

export async function listarCategorias(): Promise<any[]> {
  return consultar(
    `SELECT c.id, c.slug, c.nombre, c.emoji, c.orden, c.activo,
            (SELECT COUNT(*) FROM productos p WHERE p.categoria_id = c.id) AS total_productos
     FROM categorias c ORDER BY c.orden, c.nombre`
  );
}

export async function crearCategoria(datos: any): Promise<{ id: number; slug: string }> {
  const nombre = texto(datos.nombre, "nombre", { max: 120 });
  const slug = aSlug(datos.slug || nombre, "nombre");
  const emoji = textoOpcional(datos.emoji, "emoji", { max: 16 }) || "";
  const orden = entero(datos.orden ?? 99, "orden");

  const repetido = await unaFila("SELECT id FROM categorias WHERE slug = ?", [slug]);
  if (repetido) throw new ErrorHttp(409, `Ya existe una categoría con el identificador "${slug}".`);

  const filas = await consultar<any>(
    "INSERT INTO categorias (slug, nombre, emoji, orden, activo) VALUES (?, ?, ?, ?, ?)",
    [slug, nombre, emoji, orden, booleano(datos.activo) ? 1 : 0]
  ) as any;
  return { id: filas.insertId, slug };
}

export async function actualizarCategoria(id: number, datos: any): Promise<{ id: number; nombre: string }> {
  await exigirCategoria(id);
  const nombre = texto(datos.nombre, "nombre", { max: 120 });
  await consultar(
    "UPDATE categorias SET nombre = ?, emoji = ?, orden = ?, activo = ? WHERE id = ?",
    [
      nombre,
      textoOpcional(datos.emoji, "emoji", { max: 16 }) || "",
      entero(datos.orden ?? 0, "orden"),
      booleano(datos.activo) ? 1 : 0,
      id,
    ]
  );
  return { id, nombre };
}

export async function eliminarCategoria(id: number): Promise<{ id: number }> {
  await exigirCategoria(id);
  await consultar("DELETE FROM categorias WHERE id = ?", [id]);
  return { id };
}

async function exigirCategoria(id: number) {
  const fila = await unaFila("SELECT id FROM categorias WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "La categoría no existe.");
  return fila;
}

/* ============================================================
   Productos
   ============================================================ */

export async function obtenerProducto(id: number): Promise<any> {
  const producto = await unaFila(
    `SELECT id, categoria_id, slug, nombre, descripcion, precio, etiqueta, imagen, orden, activo
     FROM productos WHERE id = ?`,
    [id]
  );
  if (!producto) throw new ErrorHttp(404, "El producto no existe.");

  const opciones = await consultar<any>(
    "SELECT id, slug, etiqueta, orden FROM producto_opciones WHERE producto_id = ? ORDER BY orden, id",
    [id]
  );
  for (const opcion of opciones) {
    opcion.elecciones = await consultar(
      "SELECT id, slug, etiqueta, extra, orden FROM producto_elecciones WHERE opcion_id = ? ORDER BY orden, id",
      [opcion.id]
    );
  }
  return { ...producto, precio: Number(producto.precio), opciones };
}

function leerDatosProducto(datos: any) {
  const nombre = texto(datos.nombre, "nombre", { max: 140 });
  return {
    categoria_id: entero(datos.categoria_id, "categoría"),
    nombre,
    slug: aSlug(datos.slug || nombre, "nombre"),
    descripcion: textoOpcional(datos.descripcion, "descripción", { max: 600 }),
    precio: numero(datos.precio, "precio"),
    etiqueta: textoOpcional(datos.etiqueta, "etiqueta", { max: 40 }),
    imagen: textoOpcional(datos.imagen, "imagen", { max: 255 }),
    orden: entero(datos.orden ?? 99, "orden"),
    activo: booleano(datos.activo) ? 1 : 0,
  };
}

export async function crearProducto(datos: any): Promise<{ id: number; slug: string }> {
  const p = leerDatosProducto(datos);
  await exigirCategoria(p.categoria_id);

  const repetido = await unaFila("SELECT id FROM productos WHERE slug = ?", [p.slug]);
  if (repetido) throw new ErrorHttp(409, `Ya existe un producto con el identificador "${p.slug}".`);

  return enTransaccion(async (cx) => {
    const [resultado] = await cx.execute(
      `INSERT INTO productos (categoria_id, slug, nombre, descripcion, precio, etiqueta, imagen, orden, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [p.categoria_id, p.slug, p.nombre, p.descripcion, p.precio, p.etiqueta, p.imagen, p.orden, p.activo]
    ) as any;
    await reemplazarOpciones(cx, resultado.insertId, datos.opciones);
    return { id: resultado.insertId, slug: p.slug };
  });
}

export async function actualizarProducto(id: number, datos: any): Promise<{ id: number; slug: string }> {
  const actual = await unaFila("SELECT id, slug FROM productos WHERE id = ?", [id]);
  if (!actual) throw new ErrorHttp(404, "El producto no existe.");

  const p = leerDatosProducto({ ...datos, slug: datos.slug || actual.slug });
  await exigirCategoria(p.categoria_id);

  const repetido = await unaFila("SELECT id FROM productos WHERE slug = ? AND id <> ?", [p.slug, id]);
  if (repetido) throw new ErrorHttp(409, `Ya existe otra producto con el identificador "${p.slug}".`);

  return enTransaccion(async (cx) => {
    await cx.execute(
      `UPDATE productos SET categoria_id = ?, slug = ?, nombre = ?, descripcion = ?, precio = ?,
              etiqueta = ?, imagen = ?, orden = ?, activo = ?
       WHERE id = ?`,
      [p.categoria_id, p.slug, p.nombre, p.descripcion, p.precio, p.etiqueta, p.imagen, p.orden, p.activo, id]
    );
    if (Array.isArray(datos.opciones)) await reemplazarOpciones(cx, id, datos.opciones);
    return { id, slug: p.slug };
  });
}

export async function eliminarProducto(id: number): Promise<{ id: number }> {
  const fila = await unaFila("SELECT id FROM productos WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "El producto no existe.");
  await consultar("DELETE FROM productos WHERE id = ?", [id]);
  return { id };
}

async function reemplazarOpciones(cx: any, productoId: number, opciones: any[]) {
  await cx.execute("DELETE FROM producto_opciones WHERE producto_id = ?", [productoId]);
  if (!Array.isArray(opciones) || !opciones.length) return;
  if (opciones.length > 6) throw new ErrorHttp(400, "Máximo 6 grupos de opciones por producto.");

  for (const [i, opcion] of opciones.entries()) {
    const etiqueta = texto(opcion.etiqueta, "nombre del grupo de opciones", { max: 80 });
    const slug = aSlug(opcion.slug || etiqueta, "grupo de opciones");
    const elecciones = Array.isArray(opcion.elecciones) ? opcion.elecciones : [];
    if (!elecciones.length) throw new ErrorHttp(400, `El grupo "${etiqueta}" necesita al menos una opción.`);
    if (elecciones.length > 12) throw new ErrorHttp(400, `El grupo "${etiqueta}" no puede tener más de 12 opciones.`);

    const [res] = await cx.execute(
      "INSERT INTO producto_opciones (producto_id, slug, etiqueta, orden) VALUES (?, ?, ?, ?)",
      [productoId, slug, etiqueta, i + 1]
    );

    const usados = new Set();
    for (const [j, eleccion] of elecciones.entries()) {
      const etiquetaEleccion = texto(eleccion.etiqueta, "nombre de la opción", { max: 80 });
      let slugEleccion = aSlug(eleccion.slug || etiquetaEleccion, "opción");
      while (usados.has(slugEleccion)) slugEleccion += "-" + (j + 1);
      usados.add(slugEleccion);

      await cx.execute(
        "INSERT INTO producto_elecciones (opcion_id, slug, etiqueta, extra, orden) VALUES (?, ?, ?, ?, ?)",
        [res.insertId, slugEleccion, etiquetaEleccion, numero(eleccion.extra ?? 0, "costo extra"), j + 1]
      );
    }
  }
}
