// Siembra la sesion PEGANDO la cookie de tu navegador normal.
//
// El Turnstile de Wansoft rechaza cualquier navegador automatizado, asi que la
// via 100% confiable es: inicias sesion TU en tu Chrome de siempre (ahi el
// captcha te deja), copias la cookie, y este script la guarda en MySQL. Luego
// scrape-http.mjs baja los reportes con esa cookie, sin navegador.
//
// Como obtener la cookie (una vez):
//   1. Entra a Wansoft en tu Chrome normal y abre el reporte de Ventas por sucursal.
//   2. F12 -> pestana "Red"/"Network" -> recarga (F5) -> clic en cualquier peticion
//      a wansoft.net -> "Encabezados"/"Headers" -> busca "Cookie:" en los de la
//      peticion -> copia TODO su valor.
//   3. Pegalo aqui:
//        node sembrar-cookie.mjs "PEGA_AQUI_LA_COOKIE"
//      (o define WANSOFT_COOKIE en el .env y corre:  node sembrar-cookie.mjs)
import "dotenv/config";
import { getConnection, guardarSesion } from "./db.mjs";
import { crearCtxHTTP, SesionVencida } from "./http-ctx.mjs";
import { getBranchesHTTP } from "./report.mjs";

async function main() {
  const cookie = (process.argv[2] || process.env.WANSOFT_COOKIE || "").trim();
  if (!cookie || !cookie.includes("=")) {
    console.error(
      "Falta la cookie. Uso:\n" +
        '  node sembrar-cookie.mjs "nombre1=valor1; nombre2=valor2; ..."\n' +
        "o define WANSOFT_COOKIE en el .env. Mira las instrucciones al inicio de este archivo."
    );
    process.exit(1);
  }

  // Antes de guardar, verificamos que la cookie de verdad abre el reporte.
  console.log("Verificando la cookie contra Wansoft…");
  try {
    const branches = await getBranchesHTTP(crearCtxHTTP(cookie));
    if (!branches.length) throw new Error("La sesion abrio pero no se leyeron sucursales.");
    console.log(`OK: sesion valida, ${branches.length} sucursales visibles.`);
  } catch (e) {
    if (e instanceof SesionVencida) {
      console.error(
        "La cookie NO sirve (Wansoft la mando al login). Revisa que copiaste el\n" +
          "encabezado 'Cookie:' completo de una sesion ABIERTA y recien iniciada."
      );
    } else {
      console.error("No se pudo verificar la cookie:", e.message);
    }
    process.exit(1);
  }

  const conn = await getConnection();
  try {
    await guardarSesion(conn, process.env.WANSOFT_USER || null, cookie, "activa");
    console.log("\nListo. Sesion guardada en la base.");
    console.log("Ahora baja los datos sin navegador:  node scrape-http.mjs --yesterday");
  } finally {
    await conn.end().catch(() => {});
  }
}

main().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
