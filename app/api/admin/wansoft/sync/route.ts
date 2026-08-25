import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { ultimasSync } from "@/lib/services/wansoft";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";
export const maxDuration = 600;

const SCRAPER_DIR = path.join(process.cwd(), "wansoft-scraper");
const SYNC_TIMEOUT_MS = Number(process.env.WANSOFT_SYNC_TIMEOUT_MS) || 8 * 60 * 1000;

// GET → historial de sincronizaciones
export async function GET() {
  return conSesion(async () => {
    const historial = await ultimasSync(12);
    const disponible = fs.existsSync(path.join(SCRAPER_DIR, "scrape.mjs"));
    return NextResponse.json({ ok: true, historial, scraperDisponible: disponible });
  });
}

function correrScraper(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(SCRAPER_DIR, "scrape.mjs"), ...args], {
      cwd: SCRAPER_DIR,
      env: process.env,
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, SYNC_TIMEOUT_MS);
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + "\n" + err.message, timedOut });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function leerSummary(stdout: string): any | null {
  const lineas = stdout.split("\n").filter((l) => l.includes("SUMMARY "));
  if (!lineas.length) return null;
  const ultima = lineas[lineas.length - 1];
  try {
    return JSON.parse(ultima.slice(ultima.indexOf("SUMMARY ") + 8).trim());
  } catch {
    return null;
  }
}

// POST → dispara el scraper para un rango (o el mes)
export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json().catch(() => ({}));
    if (!fs.existsSync(path.join(SCRAPER_DIR, "scrape.mjs"))) {
      return NextResponse.json(
        { ok: false, error: "No se encontró wansoft-scraper/. Instálalo (npm install + npx playwright install chromium)." },
        { status: 400 }
      );
    }

    const esFecha = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const args: string[] = [];
    if (body.mes && /^\d{4}-\d{2}$/.test(body.mes)) {
      args.push("--month", body.mes);
    } else if (body.desde && body.hasta) {
      if (!esFecha(body.desde) || !esFecha(body.hasta)) {
        return NextResponse.json({ ok: false, error: "Fechas inválidas (usa AAAA-MM-DD)." }, { status: 400 });
      }
      args.push("--from", body.desde, "--to", body.hasta);
    } else {
      // por defecto, hoy
    }
    if (body.branch != null && /^[\w,-]{1,80}$/.test(String(body.branch))) args.push("--branch", String(body.branch));

    const { code, stdout, stderr, timedOut } = await correrScraper(args);
    const summary = leerSummary(stdout);

    if (timedOut) {
      return NextResponse.json({ ok: false, error: "La sincronización superó el tiempo límite.", summary }, { status: 504 });
    }

    // Detecta el caso "hay que resolver el Turnstile una vez".
    const salida = stdout + "\n" + stderr;
    const turnstile = /TURNSTILE_PENDIENTE/.test(salida);
    if (code !== 0 && (!summary || summary.estado === "error")) {
      return NextResponse.json(
        {
          ok: false,
          turnstilePendiente: turnstile,
          error: turnstile
            ? "Wansoft pide resolver el Turnstile (captcha). Corre una vez en el servidor: HEADFUL=1 node wansoft-scraper/scrape.mjs — resuelve el captcha y la sesión queda guardada."
            : "El scraper terminó con error. Revisa el historial / la consola del servidor.",
          summary,
          detalle: salida.slice(-800),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, summary });
  });
}
