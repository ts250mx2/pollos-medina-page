// Autenticación en Wansoft con perfil persistente + manejo de Cloudflare Turnstile.
//
// Wansoft agregó Turnstile (CAPTCHA anti-bot) al login. No se puede resolver de
// forma 100% automática. La estrategia honesta y estable:
//   1) La PRIMERA vez se corre con HEADFUL=1: una persona resuelve el Turnstile y
//      entra. La sesión queda guardada en el PERFIL de Chrome (carpeta local).
//   2) Las corridas siguientes (cron, headless) REUTILIZAN ese perfil: si la sesión
//      sigue viva, entran directo sin captcha. Cuando caduca, se vuelve a correr
//      una vez con HEADFUL=1.
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.WANSOFT_URL || "https://www.wansoft.net/Wansoft.Web/").replace(/\/+$/, "/") ;
export const REPORT_URL = BASE + "Reports/ConsolidatedSalesMasterReport";
export const PROFILE_DIR = process.env.WANSOFT_PROFILE_DIR || path.join(__dirname, ".chrome-profile");

/** Abre un contexto persistente (guarda cookies/sesión entre corridas). */
export async function launchContext() {
  const headful = process.env.HEADFUL === "1";
  const ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: !headful,
    viewport: { width: 1600, height: 1000 },
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    args: ["--disable-blink-features=AutomationControlled"],
  });
  ctx.setDefaultTimeout(60000);
  return ctx;
}

const tieneReporte = async (page) =>
  (await page.locator("#Subsidiary option").count().catch(() => 0)) > 0;

/**
 * Garantiza sesión iniciada y deja la página en el reporte.
 * Devuelve la Page lista para leer sucursales / hacer peticiones.
 */
export async function ensureLoggedIn(ctx) {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(REPORT_URL, { waitUntil: "domcontentloaded" }).catch(() => {});

  // ¿Ya hay sesión (el perfil la conservó)?
  if (await tieneReporte(page)) return page;

  // Hay que iniciar sesión.
  if (!(await page.locator("#UserName").count())) {
    await page.goto(BASE, { waitUntil: "domcontentloaded" });
  }
  if (!process.env.WANSOFT_USER || !process.env.WANSOFT_PASS) {
    throw new Error("Faltan WANSOFT_USER / WANSOFT_PASS en el .env del scraper.");
  }
  await page.fill("#UserName", process.env.WANSOFT_USER);
  await page.fill("#Password", process.env.WANSOFT_PASS);

  // Esperar a que Turnstile entregue un token (en HEADFUL lo resuelve la persona).
  const headful = process.env.HEADFUL === "1";
  const tokenTimeout = headful ? 240000 : 45000;
  try {
    await page.waitForFunction(
      () => {
        const t = document.querySelector('[name="cf-turnstile-response"]');
        return t && t.value && t.value.length > 20;
      },
      { timeout: tokenTimeout }
    );
  } catch {
    throw new Error(
      "TURNSTILE_PENDIENTE: no se obtuvo token del captcha. Corre UNA vez con HEADFUL=1 " +
        "para resolverlo a mano; la sesión queda guardada en el perfil y luego el cron ya entra solo."
    );
  }

  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.click("#btnSubmit").catch(() => page.click('input[type=submit]')),
  ]);

  if (await page.locator("#Password").count()) {
    throw new Error("Login falló tras el Turnstile (¿usuario/contraseña incorrectos?).");
  }

  await dismissModal(page);
  await page.goto(REPORT_URL, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#Subsidiary option", { state: "attached", timeout: 60000 });
  return page;
}

/** Cierra modales/popups promocionales si aparecen. */
export async function dismissModal(page) {
  const closers = [
    ".modal.show .close",
    ".modal.in .close",
    'button[aria-label="Close"]',
    ".modal-header .close",
    'button:has-text("Después")',
    'a:has-text("Después")',
  ];
  for (const sel of closers) {
    const el = page.locator(sel).first();
    if (await el.count().catch(() => 0)) {
      await el.click({ timeout: 2000 }).catch(() => {});
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}
