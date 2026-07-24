import { paraSitio as getConfig } from "@/lib/services/configuracion";
import { menuCompleto } from "@/lib/services/menu";
import { paraSitio as getSucursales } from "@/lib/services/sucursales";
import { paraSitio as getDestacados } from "@/lib/services/destacados";
import SitioCliente from "@/components/SitioCliente";

export const revalidate = 60; // Revalidar cada 60 segundos (ISR)

export default async function Home() {
  const [config, listaMenu, listaSucursales, destacados] = await Promise.all([
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

  const data = {
    config: { ...config, sucursales: listaSucursales },
    menu: menuLimpio,
    destacados,
  };

  return <SitioCliente datos={data} />;
}
