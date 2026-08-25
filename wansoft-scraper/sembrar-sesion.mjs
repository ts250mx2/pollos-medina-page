// Siembra la sesion de Wansoft UNA VEZ, con navegador, y la guarda en MySQL.
//
// Se corre en una maquina CON pantalla (tu PC), porque el Turnstile lo resuelve
// una persona. Despues, el servidor Linux baja los reportes sin navegador con
// scrape-http.mjs usando la cookie que aqui guardamos.
//
// Uso:
//   HEADFUL=1 node sembrar-sesion.mjs      abre el navegador, resuelves el captcha
//
// Al terminar, la cookie queda en la tabla wansoft_credenciales (fila id=1).
import "dotenv/config";
import { launchContext, ensureLoggedIn } from "./auth.mjs";
import { getConnection, guardarSesion } from "./db.mjs";

/** Serializa las cookies del dominio de Wansoft a un encabezado "a=1; b=2". */
function serializarCookies(cookies) {
  return cookies
    .filter((c) => /wansoft\.net$/i.test(c.domain.replace(/^\./, "")))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

async function main() {
  if (process.env.HEADFUL !== "1") {
    console.log(
      "Sugerencia: corre con HEADFUL=1 para ver el navegador y resolver el Turnstile.\n" +
        "  HEADFUL=1 node sembrar-sesion.mjs"
    );
  }

  const ctx = await launchContext();
  let conn = null;
  try {
    console.log("Abriendo Wansoft… resuelve el captcha si aparece.");
    await ensureLoggedIn(ctx); // deja la sesion iniciada en el contexto
    const cookies = await ctx.cookies();
    const cookieHeader = serializarCookies(cookies);
    if (!cookieHeader) throw new Error("No se encontraron cookies de wansoft.net tras el login.");

    conn = await getConnection();
    await guardarSesion(conn, process.env.WANSOFT_USER || null, cookieHeader, "activa");

    console.log(`\nListo. Sesion guardada (${cookieHeader.split(";").length} cookies).`);
    console.log("Ahora el servidor puede correr sin navegador:  node scrape-http.mjs --yesterday");
  } finally {
    if (conn) await conn.end().catch(() => {});
    await ctx.close().catch(() => {});
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
