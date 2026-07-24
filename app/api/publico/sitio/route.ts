import { NextResponse } from "next/server";
import { paraSitio as getConfig } from "@/lib/services/configuracion";
import { menuCompleto } from "@/lib/services/menu";
import { paraSitio as getSucursales } from "@/lib/services/sucursales";
import { paraSitio as getDestacados } from "@/lib/services/destacados";
import { handleApiError } from "@/lib/api-helper";

export async function GET() {
  try {
    const [config, listaMenu, listaSucursales, portada] = await Promise.all([
      getConfig(),
      menuCompleto(true),
      getSucursales(),
      getDestacados(),
    ]);

    const menuLimpio = listaMenu.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      emoji: c.emoji,
      productos: c.productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        desc: p.desc,
        precio: p.precio,
        tag: p.tag,
        img: p.img,
        opciones: p.opciones,
      })),
    }));

    const response = NextResponse.json({
      ok: true,
      config: { ...config, sucursales: listaSucursales },
      menu: menuLimpio,
      destacados: portada,
    });

    response.headers.set("Cache-Control", "public, max-age=60");
    return response;
  } catch (error: any) {
    return handleApiError(error);
  }
}
