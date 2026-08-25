// URLs de Wansoft en un solo lugar, sin dependencias (ni Playwright ni red).
// Lo importan tanto el camino con navegador (auth.mjs) como el camino HTTP puro
// (scrape-http.mjs), para que este ultimo no arrastre Playwright al servidor.
export const BASE = (process.env.WANSOFT_URL || "https://www.wansoft.net/Wansoft.Web/").replace(/\/+$/, "/");
export const REPORT_URL = BASE + "Reports/ConsolidatedSalesMasterReport";
