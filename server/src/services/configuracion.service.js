/**
 * Configuración general del sitio (teléfonos, horarios, redes, avisos).
 */
"use strict";

const { consultar, enTransaccion } = require("../db/pool");
const { texto, textoOpcional } = require("../lib/validar");

/** Todas las claves como objeto plano { clave: valor }. */
async function comoMapa() {
  const filas = await consultar("SELECT clave, valor FROM configuracion");
  return filas.reduce((acc, f) => {
    acc[f.clave] = f.valor;
    return acc;
  }, {});
}

/** Listado completo para el panel (incluye descripción y grupo). */
async function listar() {
  return consultar(
    "SELECT clave, valor, descripcion, grupo FROM configuracion ORDER BY grupo, clave"
  );
}

/** Forma que consume el sitio público (equivale al PM_CONFIG estático). */
async function paraSitio() {
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

/** Guarda varias claves de golpe. Solo actualiza claves que ya existen. */
async function guardar(cambios) {
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
      );
      guardadas += resultado.affectedRows;
    }
    return guardadas;
  });
}

module.exports = { comoMapa, listar, paraSitio, guardar };
