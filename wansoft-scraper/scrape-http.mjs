// Baja los reportes de Wansoft SIN NAVEGADOR, usando la cookie sembrada.
//
// Pensado para el cron del servidor Linux: solo necesita Node 18+ (fetch nativo),
// mysql2 y cheerio. No instala Playwright ni Chromium.
//
// Requisito: haber corrido antes, una vez, `HEADFUL=1 node sembrar-sesion.mjs`
// en una maquina con pantalla para resolver el Turnstile.
//
// Uso (mismos argumentos que scrape.mjs):
//   node scrape-http.mjs                     hoy, todas las sucursales
//   node scrape-http.mjs --yesterday         ayer (cierre del dia)
//   node scrape-http.mjs --date 2026-08-15   una fecha
//   node scrape-http.mjs --month 2026-08     todo el mes (backfill), dia por dia
//   node scrape-http.mjs --from 2026-08-01 --to 2026-08-22
//   node scrape-http.mjs --branch 123        una sola sucursal (id de Wansoft)
//   node scrape-http.mjs --dry               no toca la BD, solo imprime
//
// Imprime "SUMMARY {json}" al final, igual que scrape.mjs.
import "dotenv/config";
import {
  getBranchesHTTP, getConsolidatedSales, consolidatedToRow,
  getTiposProducto, getProductos, getReportesDimensionales,
} from "./report.mjs";
import {
  getConnection, leerSesion, marcarSesionVencida, resolveBranch,
  upsertVenta, upsertProducto, upsertCategoria, upsertReporte, logInicio, logFin,
} from "./db.mjs";
import { resolverDias, argVal as argValDe } from "./fechas.mjs";
import { crearCtxHTTP, SesionVencida } from "./http-ctx.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry") || process.env.DRY === "1";
const argVal = (name) => argValDe(args, name);

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

export async function runOnce() {
  const dias = resolverDias(args);
  const branchFilter = argVal("--branch");
  log(`== Inicio (HTTP, sin navegador). Días=${dias[0]}..${dias[dias.length - 1]} (${dias.length}) DRY=${DRY} ==`);

  // La cookie vive en MySQL, asi que necesitamos la conexion aunque sea --dry.
  const conn = await getConnection();
  let logId = null;
  let filas = 0;
  const errores = [];

  try {
    const sesion = await leerSesion(conn);
    if (!sesion || !sesion.cookie) {
      throw new SesionVencida(
        "No hay sesion sembrada. Corre una vez, en una maquina con pantalla:\n" +
          "  HEADFUL=1 node sembrar-sesion.mjs"
      );
    }
    const ctx = crearCtxHTTP(sesion.cookie);
    log(`Sesión cargada (sembrada ${sesion.actualizado_en}).`);

    let branches = await getBranchesHTTP(ctx);
    if (branchFilter) {
      const set = new Set(branchFilter.split(",").map((s) => s.trim()));
      branches = branches.filter((b) => set.has(String(b.id)));
    }
    log(`Sucursales: ${branches.length}`);

    if (!DRY) logId = await logInicio(conn, dias[0], dias[dias.length - 1]);

    for (const fecha of dias) {
      let netaDia = 0;
      for (const b of branches) {
        try {
          const j = await getConsolidatedSales(ctx, b.id, fecha, fecha);
          const row = consolidatedToRow(b, fecha, j);
          netaDia += row.venta_neta;
          if (!DRY) {
            const sucId = await resolveBranch(conn, row.wansoftId, row.sucursal);
            await upsertVenta(conn, sucId, row);
            try {
              const tipos = await getTiposProducto(ctx, b.id, fecha, fecha);
              for (const tp of tipos) await upsertCategoria(conn, sucId, fecha, tp);
              const prods = await getProductos(ctx, b.id, fecha, fecha);
              for (const pr of prods) await upsertProducto(conn, sucId, fecha, pr);
              const dims = await getReportesDimensionales(ctx, b.id, fecha, fecha);
              for (const dr of dims) await upsertReporte(conn, sucId, fecha, dr);
            } catch (ep) {
              if (ep instanceof SesionVencida) throw ep;
              errores.push(`${b.name} ${fecha} reportes: ${ep.message}`);
            }
          }
          filas++;
        } catch (e) {
          if (e instanceof SesionVencida) throw e; // no tiene sentido seguir
          errores.push(`${b.name} ${fecha}: ${e.message}`);
        }
      }
      log(`  ${fecha}  neta=$${netaDia.toFixed(2)}  (${branches.length} suc)`);
    }

    const estado = errores.length ? (filas ? "parcial" : "error") : "ok";
    if (!DRY && logId) await logFin(conn, logId, estado, dias.length, filas, errores.slice(0, 50).join(" | ") || "OK");

    const summary = { dias: dias.length, sucursales: branches.length, filas, errores: errores.length, estado };
    log(`== Fin. filas=${filas} estado=${estado} ==`);
    console.log("SUMMARY " + JSON.stringify(summary));
    return summary;
  } catch (err) {
    const vencida = err instanceof SesionVencida;
    if (vencida) await marcarSesionVencida(conn);
    log(vencida ? "SESIÓN VENCIDA:" : "ERROR FATAL:", err.message);
    if (!DRY && logId) await logFin(conn, logId, "error", dias.length, filas, err.message).catch(() => {});
    console.log("SUMMARY " + JSON.stringify({
      dias: dias.length, filas, errores: errores.length + 1,
      estado: "error", fatal: err.message, sesionVencida: vencida,
    }));
    throw err;
  } finally {
    await conn.end().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("scrape-http.mjs")) {
  runOnce().catch(() => process.exit(1));
}
