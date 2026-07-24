import { consultar, unaFila } from "../db";
import {
  ErrorHttp,
  texto,
  textoOpcional,
  entero,
  booleano,
  aSlug,
  urlOpcional,
  coordenadaOpcional,
} from "../validar";

const CAMPOS = `id, slug, nombre, direccion, colonia, ciudad, telefono, whatsapp,
                horario, mapa_url, lat, lng, imagen, orden, activo`;

export interface Sucursal {
  id: number;
  slug: string;
  nombre: string;
  direccion: string;
  colonia: string | null;
  ciudad: string | null;
  telefono: string | null;
  whatsapp: string | null;
  horario: string | null;
  mapa_url: string | null;
  lat: number | null;
  lng: number | null;
  imagen: string | null;
  orden: number;
  activo: boolean;
}

function normalizar(fila: any): Sucursal {
  return {
    ...fila,
    lat: fila.lat === null ? null : Number(fila.lat),
    lng: fila.lng === null ? null : Number(fila.lng),
    activo: Boolean(fila.activo),
  };
}

export async function listar(soloActivas = true): Promise<Sucursal[]> {
  const filas = await consultar(
    `SELECT ${CAMPOS} FROM sucursales ${soloActivas ? "WHERE activo = 1" : ""}
     ORDER BY orden, nombre`
  );
  return filas.map(normalizar);
}

export interface SitioSucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  horario: string;
  mapa: string;
  imagen: string;
}

export async function paraSitio(): Promise<SitioSucursal[]> {
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

export async function obtener(id: number): Promise<Sucursal> {
  const fila = await unaFila(`SELECT ${CAMPOS} FROM sucursales WHERE id = ?`, [id]);
  if (!fila) throw new ErrorHttp(404, "La sucursal no existe.");
  return normalizar(fila);
}

function leerDatos(datos: any) {
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

export async function crear(datos: any): Promise<{ id: number; slug: string }> {
  const s = leerDatos(datos);
  const repetido = await unaFila("SELECT id FROM sucursales WHERE slug = ?", [s.slug]);
  if (repetido) throw new ErrorHttp(409, `Ya existe una sucursal con el identificador "${s.slug}".`);

  const resultado = await consultar(
    `INSERT INTO sucursales (slug, nombre, direccion, colonia, ciudad, telefono, whatsapp,
                             horario, mapa_url, lat, lng, imagen, orden, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.slug, s.nombre, s.direccion, s.colonia, s.ciudad, s.telefono, s.whatsapp,
     s.horario, s.mapa_url, s.lat, s.lng, s.imagen, s.orden, s.activo]
  ) as any;
  return { id: resultado.insertId, slug: s.slug };
}

export async function actualizar(id: number, datos: any): Promise<{ id: number; slug: string }> {
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

export async function eliminar(id: number): Promise<{ id: number }> {
  const fila = await unaFila("SELECT id FROM sucursales WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "La sucursal no existe.");
  await consultar("DELETE FROM sucursales WHERE id = ?", [id]);
  return { id };
}
