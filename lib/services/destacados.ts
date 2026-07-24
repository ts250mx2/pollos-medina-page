import { consultar, unaFila, enTransaccion } from "../db";
import { ErrorHttp, entero, textoOpcional } from "../validar";

export const MAX_PROMOS = 6;

const SELECT_RESUELTO = `
  SELECT d.id, d.seccion, d.producto_id, d.etiqueta, d.subtitulo, d.orden, d.activo,
         p.slug, p.nombre, p.descripcion, p.precio, p.imagen, p.activo AS producto_activo
  FROM destacados d
  JOIN productos p ON p.id = d.producto_id
`;

export interface DestacadoMapeado {
  id: number;
  productoId: number;
  slug: string;
  nombre: string;
  desc: string;
  precio: number;
  img: string | null;
  etiqueta: string | null;
  subtitulo: string | null;
  orden: number;
}

function mapear(fila: any): DestacadoMapeado {
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

export async function paraSitio(): Promise<{ hero: DestacadoMapeado | null; promos: DestacadoMapeado[] }> {
  const filas = await consultar(
    `${SELECT_RESUELTO} WHERE d.activo = 1 AND p.activo = 1 ORDER BY d.seccion, d.orden, d.id`
  );
  const hero = filas.find((f) => f.seccion === "hero");
  const promos = filas.filter((f) => f.seccion === "promo").map(mapear);
  return { hero: hero ? mapear(hero) : null, promos };
}

export async function paraPanel(): Promise<{ hero: DestacadoMapeado | null; promos: DestacadoMapeado[] }> {
  const filas = await consultar(`${SELECT_RESUELTO} ORDER BY d.seccion, d.orden, d.id`);
  const hero = filas.find((f) => f.seccion === "hero");
  const promos = filas.filter((f) => f.seccion === "promo").map(mapear);
  return { hero: hero ? mapear(hero) : null, promos };
}


async function exigirProductoEn(cx: any, id: number) {
  const [filas] = await cx.execute("SELECT id FROM productos WHERE id = ?", [id]);
  if (!filas.length) throw new ErrorHttp(404, `El producto #${id} ya no existe.`);
}

export async function guardarHero(datos: any): Promise<{ hero: number | null }> {
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

export async function guardarPromos(lista: any[]): Promise<{ promos: number }> {
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
