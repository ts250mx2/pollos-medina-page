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
import { BASE, REPORT_URL } from "./urls.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export { REPORT_URL };
export const PROFILE_DIR = process.env.WANSOFT_PROFILE_DIR || path.join(__dirname, ".chrome-profile");

/**
 * Abre un contexto persistente (guarda cookies/sesión entre corridas).
 *
 * Usa el Chrome REAL del sistema (channel "chrome"), no el Chromium de prueba de
 * Playwright: el Turnstile detecta el Chromium automatizado y se queda en
 * "reintentando…". Si no hay Chrome instalado, cae al Chromium de Playwright.
 * Se puede forzar con WANSOFT_CHANNEL (chrome | msedge | chromium).
 */
export async function launchContext() {
  const headful = process.env.HEADFUL === "1";
  const opciones = {
    headless: !headful,
    viewport: { width: 1600, height: 1000 },
    locale: "es-MX",
    timezoneId: "America/Mexico_City",
    args: ["--disable-blink-features=AutomationControlled"],
  };

  const preferido = process.env.WANSOFT_CHANNEL || "chrome";
  let ctx;
  try {
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, {
      ...opciones,
      ...(preferido !== "chromium" ? { channel: preferido } : {}),
    });
  } catch (e) {
    // Chrome/Edge no instalado: usar el Chromium que trae Playwright.
    console.warn(`No se pudo abrir "${preferido}" (${e.message.split("\n")[0]}). Usando Chromium de Playwright.`);
    ctx = await chromium.launchPersistentContext(PROFILE_DIR, opciones);
  }

  // Quitar la huella mas obvia de automatizacion que revisa Turnstile.
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  ctx.setDefaultTimeout(60000);
  return ctx;
}

/**
 * Login MANUAL: abre la pagina de Wansoft y espera a que una persona entre
 * (escriba usuario/clave y resuelva el Turnstile en la ventana). Detecta el
 * exito cuando aparece el reporte. Pensado para sembrar la sesion una vez.
 */
export async function esperarLoginManual(ctx, minutos = 5) {
  const page = ctx.pages()[0] || (await ctx.newPage());
  await page.goto(REPORT_URL, { waitUntil: "domcontentloaded" }).catch(() => {});
  if (await tieneReporte(page)) return page; // el perfil ya tenia sesion viva

  console.log(
    "\n>>> Inicia sesion TU MISMO en la ventana del navegador:\n" +
      "    usuario, contraseña, resuelve el captcha y pulsa Ingresar.\n" +
      `    Tienes ${minutos} min. En cuanto entres, se guarda la sesion sola.\n`
  );
  await page.waitForSelector("#Subsidiary option", { state: "attached", timeout: minutos * 60000 });
  await dismissModal(page).catch(() => {});
  return page;
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
