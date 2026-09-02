import { spawn } from "child_process";
import fs from "fs";
import path from "path";

type SchedulerState = { iniciado: boolean; ejecutando: boolean; timers: NodeJS.Timeout[] };
const globalScheduler = globalThis as typeof globalThis & { __wansoftScheduler?: SchedulerState };
const SCRAPER_DIR = path.join(process.cwd(), "wansoft-scraper");
const SCRAPER_FILE = path.join(SCRAPER_DIR, "scrape-http.mjs");
const HORA_MS = 60 * 60 * 1000;
const TIMEOUT_MS = Number(process.env.WANSOFT_SYNC_TIMEOUT_MS) || 8 * 60 * 1000;

function log(mensaje: string) {
  console.log(`[wansoft-auto] ${new Date().toISOString()} ${mensaje}`);
}

function ejecutar(args: string[], motivo: string, state: SchedulerState) {
  if (state.ejecutando) {
    log(`Se omite ${motivo}: la instancia local sigue sincronizando.`);
    return;
  }
  state.ejecutando = true;
  log(`Inicia ${motivo}.`);
  const child = spawn(process.execPath, [SCRAPER_FILE, ...args], {
    cwd: SCRAPER_DIR, env: process.env, stdio: ["ignore", "pipe", "pipe"],
  });
  let salida = "";
  const guardar = (dato: Buffer) => { salida = (salida + dato.toString()).slice(-4000); };
  child.stdout.on("data", guardar);
  child.stderr.on("data", guardar);
  const timeout = setTimeout(() => {
    log(`${motivo} superó ${TIMEOUT_MS} ms; se detiene.`);
    child.kill("SIGKILL");
  }, TIMEOUT_MS);
  timeout.unref();
  child.on("error", (error) => {
    clearTimeout(timeout);
    state.ejecutando = false;
    log(`No se pudo iniciar ${motivo}: ${error.message}`);
  });
  child.on("close", (codigo) => {
    clearTimeout(timeout);
    state.ejecutando = false;
    const summary = salida.split(/\r?\n/).reverse().find((linea) => linea.includes("SUMMARY "));
    log(`${motivo} terminó con código ${codigo}.${summary ? ` ${summary.trim()}` : ""}`);
  });
}

function msHastaSiguienteHora() {
  const ahora = new Date();
  return HORA_MS - (ahora.getMinutes() * 60_000 + ahora.getSeconds() * 1000 + ahora.getMilliseconds());
}

function programarCadaHora(state: SchedulerState) {
  const timer = setTimeout(() => {
    ejecutar([], "actualización horaria", state);
    const intervalo = setInterval(() => ejecutar([], "actualización horaria", state), HORA_MS);
    intervalo.unref();
    state.timers.push(intervalo);
  }, msHastaSiguienteHora());
  timer.unref();
  state.timers.push(timer);
}

function partesMX(fecha: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha);
  return Object.fromEntries(partes.map((p) => [p.type, Number(p.value)]));
}

function msHastaCierreDiario() {
  const p = partesMX(new Date());
  const ahoraLocal = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  let objetivo = Date.UTC(p.year, p.month - 1, p.day, 0, 30, 0);
  if (objetivo <= ahoraLocal) objetivo += 24 * HORA_MS;
  return objetivo - ahoraLocal;
}

function programarCierreDiario(state: SchedulerState) {
  const timer = setTimeout(() => {
    ejecutar(["--yesterday"], "cierre del día anterior", state);
    programarCierreDiario(state);
  }, msHastaCierreDiario());
  timer.unref();
  state.timers.push(timer);
}

export function iniciarWansoftScheduler() {
  if (process.env.WANSOFT_AUTO_SYNC === "0") {
    log("Automatización desactivada por WANSOFT_AUTO_SYNC=0.");
    return;
  }
  if (!fs.existsSync(SCRAPER_FILE)) {
    log(`No se encontró ${SCRAPER_FILE}; no se inicia la automatización.`);
    return;
  }
  const state = globalScheduler.__wansoftScheduler ?? { iniciado: false, ejecutando: false, timers: [] };
  globalScheduler.__wansoftScheduler = state;
  if (state.iniciado) return;
  state.iniciado = true;
  log("Activa: hoy cada hora y cierre de ayer a las 00:30 (America/Mexico_City).");
  programarCadaHora(state);
  programarCierreDiario(state);
  if (process.env.WANSOFT_AUTO_SYNC_ON_START !== "0") {
    const timer = setTimeout(() => ejecutar([], "actualización al arrancar", state), 10_000);
    timer.unref();
    state.timers.push(timer);
  }
}
