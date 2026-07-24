import { consultar, enTransaccion } from "../db";
import { texto, textoOpcional } from "../validar";

export async function comoMapa(): Promise<Record<string, string>> {
  const filas = await consultar<{ clave: string; valor: string }>("SELECT clave, valor FROM configuracion");
  return filas.reduce((acc, f) => {
    acc[f.clave] = f.valor;
    return acc;
  }, {} as Record<string, string>);
}

export async function listar(): Promise<any[]> {
  return consultar("SELECT clave, valor, descripcion, grupo FROM configuracion ORDER BY grupo, clave");
}

export interface SitioConfig {
  marca: string;
  eslogan: string;
  desde: number;
  horario: string;
  tiempoEntrega: string;
  whatsapp: { visible: string; numero: string };
  telefono: { visible: string; tel: string };
  avisoPrecios: string;
  costoEnvioTexto: string;
  redes: {
    facebook: string;
    instagram: string;
    tiktok: string;
  };
}

export async function paraSitio(): Promise<SitioConfig> {
  const c = await comoMapa();
  return {
    marca: c.marca || "Pollo Medina",
    eslogan: c.eslogan || "Pura Vitamina",
    desde: Number(c.desde) || 1989,
    horario: c.horario || "",
    tiempoEntrega: c.tiempo_entrega || "",
    whatsapp: { visible: c.whatsapp_visible || "", numero: c.whatsapp_numero || "" },
    telefono: { visible: c.telefono_visible || "", tel: c.telefono_tel || "" },
    avisoPrecios: c.aviso_precios || "",
    costoEnvioTexto: c.costo_envio_texto || "",
    redes: {
      facebook: c.red_facebook || "",
      instagram: c.red_instagram || "",
      tiktok: c.red_tiktok || "",
    },
  };
}

export async function guardar(cambios: Record<string, any>): Promise<number> {
  const entradas = Object.entries(cambios || {});
  if (!entradas.length) return 0;

  return enTransaccion(async (cx) => {
    let guardadas = 0;
    for (const [clave, valor] of entradas) {
      const claveLimpia = texto(clave, "clave", { max: 60 });
      const valorLimpio = textoOpcional(valor, claveLimpia, { max: 2000 });
      const [resultado] = await cx.execute(
        "UPDATE configuracion SET valor = ? WHERE clave = ?",
        [valorLimpio, claveLimpia]
      ) as any;
      guardadas += resultado.affectedRows;
    }
    return guardadas;
  });
}
