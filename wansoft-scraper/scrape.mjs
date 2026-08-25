// Orquestador: login (perfil persistente) → ventas por sucursal, día por día → MySQL.
//
// Uso:
//   node scrape.mjs                          hoy, todas las sucursales
//   node scrape.mjs --yesterday              ayer (cierre del día)
//   node scrape.mjs --date 2026-08-15        una fecha
//   node scrape.mjs --month 2026-08          todo el mes, día por día (backfill)
//   node scrape.mjs --from 2026-08-01 --to 2026-08-22
//   node scrape.mjs --branch 123             una sola sucursal (id de Wansoft)
//   node scrape.mjs --dry                    no toca la BD, sólo imprime
//   HEADFUL=1 node scrape.mjs --month 2026-08   (primera vez: resolver Turnstile)
//
// Imprime una línea "SUMMARY {json}" que el panel lee para la bitácora.
import "dotenv/config";
import { launchContext, ensureLoggedIn } from "./auth.mjs";
import { getBranches, getConsolidatedSales, consolidatedToRow, getTiposProducto, getProductos, getReportesDimensionales } from "./report.mjs";
import { getConnection, resolveBranch, upsertVenta, upsertProducto, upsertCategoria, upsertReporte, logInicio, logFin } from "./db.mjs";
import { resolverDias, argVal as argValDe } from "./fechas.mjs";

const args = process.argv.slice(2);
const DRY = args.includes("--dry") || process.env.DRY === "1";
const argVal = (name) => argValDe(args, name);

function log(...a) {
  console.log(new Date().toISOString(), ...a);
}

export async function runOnce() {
  const dias = resolverDias(args);
  const branchFilter = argVal("--branch");
  log(`== Inicio. Días=${dias[0]}..${dias[dias.length - 1]} (${dias.length}) DRY=${DRY} ==`);

  const ctx = await launchContext();
  let conn = null;
  let logId = null;
  let filas = 0;
  const errores = [];

  try {
    const page = await ensureLoggedIn(ctx);
    log("Login/sesión OK");

    let branches = await getBranches(page);
    if (branchFilter) {
      const set = new Set(branchFilter.split(",").map((s) => s.trim()));
      branches = branches.filter((b) => set.has(String(b.id)));
    }
    log(`Sucursales: ${branches.length}`);

    if (!DRY) {
      conn = await getConnection();
      logId = await logInicio(conn, dias[0], dias[dias.length - 1]);
    }

    for (const fecha of dias) {
      let netaDia = 0;
      for (const b of branches) {
        try {
          const j = await getConsolidatedSales(ctx, b.id, fecha, fecha);
          const row = consolidatedToRow(b, fecha, j);
          netaDia += row.venta_neta;
          if (!DRY && conn) {
            const sucId = await resolveBranch(conn, row.wansoftId, row.sucursal);
            await upsertVenta(conn, sucId, row);

            // Nivel producto (tipo + platillo) + reportes dimensionales.
            // No aborta si un reporte individual falla.
            try {
              const tipos = await getTiposProducto(ctx, b.id, fecha, fecha);
              for (const tp of tipos) await upsertCategoria(conn, sucId, fecha, tp);
              const prods = await getProductos(ctx, b.id, fecha, fecha);
              for (const pr of prods) await upsertProducto(conn, sucId, fecha, pr);
              const dims = await getReportesDimensionales(ctx, b.id, fecha, fecha);
              for (const dr of dims) await upsertReporte(conn, sucId, fecha, dr);
            } catch (ep) {
              errores.push(`${b.name} ${fecha} reportes: ${ep.message}`);
            }
          }
          filas++;
        } catch (e) {
          errores.push(`${b.name} ${fecha}: ${e.message}`);
          if (/TURNSTILE_PENDIENTE|Login falló/.test(e.message)) throw e;
        }
      }
      log(`  ${fecha}  neta=$${netaDia.toFixed(2)}  (${branches.length} suc)`);
    }

    const estado = errores.length ? (filas ? "parcial" : "error") : "ok";
    if (!DRY && conn) await logFin(conn, logId, estado, dias.length, filas, errores.slice(0, 50).join(" | ") || "OK");

    const summary = { dias: dias.length, sucursales: branches.length, filas, errores: errores.length, estado };
    log(`== Fin. filas=${filas} estado=${estado} ==`);
    console.log("SUMMARY " + JSON.stringify(summary));
    return summary;
  } catch (err) {
    log("ERROR FATAL:", err.message);
    if (!DRY && conn && logId) await logFin(conn, logId, "error", dias.length, filas, err.message).catch(() => {});
    console.log("SUMMARY " + JSON.stringify({ dias: dias.length, filas, errores: errores.length + 1, estado: "error", fatal: err.message }));
    throw err;
  } finally {
    if (conn) await conn.end().catch(() => {});
    await ctx.close().catch(() => {});
  }
}

if (process.argv[1]?.endsWith("scrape.mjs")) {
  runOnce().catch(() => process.exit(1));
}
