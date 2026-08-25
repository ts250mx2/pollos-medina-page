// Reporte "Ventas por sucursal" (ConsolidatedSalesMasterReport).
// En lugar de raspar HTML, llamamos al endpoint JSON que usa el propio reporte:
//   Reports/GetConsolidatedSales?subsidiaryId=&startDate=&endDate=
// que respeta sucursal + rango y devuelve totales limpios.
import * as cheerio from "cheerio";
import { BASE, REPORT_URL } from "./urls.mjs";

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const cleanStr = (v) => String(v ?? "").replace(/\s+/g, " ").trim();
const cleanMoney = (v) => { const n = Number(String(v ?? "").replace(/[$,\s]/g, "")); return Number.isFinite(n) ? n : 0; };
const cleanInt = (v) => { const n = parseInt(String(v ?? "").replace(/[,\s]/g, ""), 10); return Number.isFinite(n) ? n : 0; };

/** 'YYYY-MM-DD' para una fecha en zona horaria de México. */
export function ymdMX(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export const todayMX = () => ymdMX(new Date());
export const yesterdayMX = () => ymdMX(new Date(Date.now() - 86400000));

/** Lee la lista de sucursales del selector del reporte (id + nombre). */
export async function getBranches(page) {
  await page.goto(REPORT_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#Subsidiary option", { state: "attached", timeout: 60000 });
  return page.$$eval("#Subsidiary option", (opts) =>
    opts
      .map((o) => ({ id: o.value, name: (o.textContent || "").trim() }))
      .filter((o) => o.id && o.name)
  );
}

/**
 * Igual que getBranches pero por HTTP puro (sin navegador): descarga la pagina
 * del reporte y parsea el <select id="Subsidiary"> con cheerio.
 */
export async function getBranchesHTTP(ctx) {
  const res = await ctx.request.get(REPORT_URL);
  if (res.status() !== 200) throw new Error(`getBranchesHTTP HTTP ${res.status()}`);
  const $ = cheerio.load(await res.text());
  const out = [];
  $("#Subsidiary option").each((i, o) => {
    const id = $(o).attr("value");
    const name = cleanStr($(o).text());
    if (id && name) out.push({ id, name });
  });
  return out;
}

/** Llama al endpoint de resumen consolidado para una sucursal y un rango. */
export async function getConsolidatedSales(ctx, subsidiaryId, startDate, endDate) {
  const url = `${BASE}Reports/GetConsolidatedSales?subsidiaryId=${encodeURIComponent(
    subsidiaryId
  )}&startDate=${startDate}&endDate=${endDate}`;
  const res = await ctx.request.post(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
  if (res.status() !== 200) throw new Error(`GetConsolidatedSales ${subsidiaryId} HTTP ${res.status()}`);
  const j = await res.json();
  if (j.MessageType !== 1) throw new Error(`GetConsolidatedSales ${subsidiaryId} MessageType=${j.MessageType}`);
  return j;
}

/**
 * Convierte el JSON del endpoint a la fila de `wansoft_ventas_diarias`.
 * El consolidado trae importes (brutas/netas/impuestos/descuentos), NO trae
 * número de cuentas ni formas de pago (esos viven en otros reportes de Wansoft).
 */
export function consolidatedToRow(branch, fecha, j) {
  return {
    fecha,
    wansoftId: String(branch.id),
    sucursal: branch.name,
    venta_bruta: num(j.SubtotalGrossSales),
    descuentos: num(j.TotalDiscount),
    cortesias: num(j.TotalCourtesies),
    cancelaciones: num(j.TotalCancelSales),
    venta_neta: num(j.SubtotalSales),
    impuestos: num(j.IvaSales),
    venta_total: num(j.TotalSales),
    metricas: {
      TotalGrossSales: num(j.TotalGrossSales),
      IvaGrossSales: num(j.IvaGrossSales),
      TotalPromotion: num(j.TotalPromotion),
      TotalNullification: num(j.TotalNullification),
    },
  };
}

// ============================================================
//  Reportes a nivel producto (para treemap y ranking del dashboard)
//  SalesByGroupType → ventas por tipo de producto
//  SalesBySaucer    → ventas por platillo/artículo
//  Ambos son fragmentos HTML con filas .rowReport.
// ============================================================

/** Extrae las filas .rowReport (celdas = divs hijos directos). */
function rowReportCeldas(html) {
  const $ = cheerio.load(html);
  const $card = $(".card").first().length ? $(".card").first() : $.root();
  const out = [];
  $card.find(".rowReport").each((i, el) => {
    const celdas = $(el).children("div").map((j, d) => cleanStr($(d).text())).get();
    if (celdas.length) out.push(celdas);
  });
  return out;
}

async function getReporteHTML(ctx, endpoint, subsidiaryId, startDate, endDate) {
  const url = `${BASE}${endpoint}?subsidiaryId=${encodeURIComponent(subsidiaryId)}&startDate=${startDate}&endDate=${endDate}`;
  const res = await ctx.request.post(url, { headers: { "X-Requested-With": "XMLHttpRequest" } });
  if (res.status() !== 200) throw new Error(`${endpoint} HTTP ${res.status()}`);
  return res.text();
}

const esTotal = (s) => /^(total|totales|gran total|suma)/i.test(s);

/** Ventas por tipo de producto: columnas [Tipo, Subtotal, Iva, Total, %]. */
export async function getTiposProducto(ctx, subsidiaryId, startDate, endDate) {
  const html = await getReporteHTML(ctx, "Reports/SalesByGroupType", subsidiaryId, startDate, endDate);
  return rowReportCeldas(html)
    .map((c) => ({ nombre: cleanStr(c[0]), subtotal: cleanMoney(c[1]), iva: cleanMoney(c[2]), total: cleanMoney(c[3]) }))
    .filter((r) => r.nombre && !esTotal(r.nombre));
}

/** Ventas por platillo: columnas [Platillo, Cantidad, Subtotal, Total, %]. */
export async function getProductos(ctx, subsidiaryId, startDate, endDate) {
  const html = await getReporteHTML(ctx, "Reports/SalesBySaucer", subsidiaryId, startDate, endDate);
  return rowReportCeldas(html)
    .map((c) => ({ producto: cleanStr(c[0]), cantidad: cleanInt(c[1]), subtotal: cleanMoney(c[2]), total: cleanMoney(c[3]) }))
    .filter((r) => r.producto && !esTotal(r.producto));
}

// ============================================================
//  Reportes dimensionales → tabla genérica wansoft_reportes
//  (grupo, tipo de orden, usuario, terminal, modificador,
//   forma de pago, hora). Fuente: reportes de Wansoft > Ingresos.
// ============================================================
const cleanNum = (v) => { const n = Number(String(v ?? "").replace(/[%,\s]/g, "")); return Number.isFinite(n) ? n : 0; };

/** Parser de gráfica (Highcharts) para SalesByHours: series data [{x,y}]. */
function parseChartPuntos(html) {
  const m = html.match(/"data":\s*\[([^\]]*?\{[^]*?\}[^\]]*?)\]/);
  if (!m) return [];
  const puntos = m[1].match(/\{[^}]*\}/g) || [];
  const out = [];
  for (const p of puntos) {
    let o; try { o = JSON.parse(p); } catch { continue; }
    const x = o.x ?? o.name; if (x === undefined) continue;
    out.push({ x: cleanStr(x), y: cleanMoney(o.y) });
  }
  return out;
}

/**
 * Baja TODOS los reportes dimensionales de una sucursal/día y devuelve
 * renglones listos para wansoft_reportes.
 */
export async function getReportesDimensionales(ctx, subsidiaryId, startDate, endDate) {
  const filas = [];
  const rows = (html) => rowReportCeldas(html);
  const noTotal = (s) => s && !esTotal(s);

  const jobs = [
    ["Reports/SalesByGroup", (c) => noTotal(c[0]) && filas.push({ reporte: "grupo", etiqueta: cleanStr(c[0]), subtotal: cleanMoney(c[1]), iva: cleanMoney(c[2]), total: cleanMoney(c[3]), porcentaje: cleanNum(c[4]) })],
    ["Reports/SalesByTypeOfOrder", (c) => noTotal(c[0]) && filas.push({ reporte: "tipo_orden", etiqueta: cleanStr(c[0]), cantidad: cleanInt(c[2]), cantidad2: cleanInt(c[3]), subtotal: cleanMoney(c[4]), total: cleanMoney(c[5]) })],
    ["Reports/SalesByUser", (c) => noTotal(c[0]) && filas.push({ reporte: "usuario", etiqueta: cleanStr(c[0]), subtotal: cleanMoney(c[1]), iva: cleanMoney(c[2]), total: cleanMoney(c[3]), porcentaje: cleanNum(c[4]) })],
    ["Reports/SalesByTerminal", (c) => noTotal(c[0]) && filas.push({ reporte: "terminal", etiqueta: cleanStr(c[0]), subtotal: cleanMoney(c[1]), iva: cleanMoney(c[2]), total: cleanMoney(c[3]), porcentaje: cleanNum(c[4]) })],
    ["Reports/SalesByModifiers", (c) => noTotal(c[1]) && filas.push({ reporte: "modificador", etiqueta: cleanStr(c[1]), etiqueta2: cleanStr(c[0]), cantidad: cleanInt(c[2]), subtotal: cleanMoney(c[3]), total: cleanMoney(c[4]) })],
    ["Reports/SalesByPaymentType", (c) => noTotal(c[0]) && filas.push({ reporte: "forma_pago", etiqueta: cleanStr(c[0]), total: cleanMoney(c[1]), porcentaje: cleanNum(c[2]) })],
  ];

  for (const [endpoint, handler] of jobs) {
    try {
      const html = await getReporteHTML(ctx, endpoint, subsidiaryId, startDate, endDate);
      for (const c of rows(html)) handler(c);
    } catch { /* un reporte que falle no aborta el resto */ }
  }

  // Ventas por hora (gráfica) → mapa de calor
  try {
    const html = await getReporteHTML(ctx, "Reports/SalesByHours", subsidiaryId, startDate, endDate);
    for (const p of parseChartPuntos(html)) {
      if (p.x) filas.push({ reporte: "hora", etiqueta: p.x, subtotal: p.y, total: p.y });
    }
  } catch { /* opcional */ }

  return filas;
}
