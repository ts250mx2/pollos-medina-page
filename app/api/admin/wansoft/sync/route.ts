import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { diasPendientesSync, estadoSesionWansoft, ultimasSync } from "@/lib/services/wansoft";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

export const runtime = "nodejs";
export const maxDuration = 600;

const SCRAPER_DIR = path.join(process.cwd(), "wansoft-scraper");
const SCRAPER_FILE = path.join(SCRAPER_DIR, "scrape-http.mjs");
const SYNC_TIMEOUT_MS = Number(process.env.WANSOFT_SYNC_TIMEOUT_MS) || 8 * 60 * 1000;
const WANSOFT_REPORT_URL = `${(process.env.WANSOFT_URL || "https://www.wansoft.net/Wansoft.Web/").replace(/\/+$/, "/")}Reports/ConsolidatedSalesMasterReport`;

// GET → historial de sincronizaciones
export async function GET() {
  return conSesion(async () => {
    const [historial, sesion] = await Promise.all([ultimasSync(12), estadoSesionWansoft()]);
    const disponible = fs.existsSync(SCRAPER_FILE);
    return NextResponse.json({
      ok: true,
      historial,
      scraperDisponible: disponible,
      automatizacionActiva: process.env.WANSOFT_AUTO_SYNC !== "0",
      modo: "http",
      sesion,
      wansoftReporteUrl: WANSOFT_REPORT_URL,
    });
  });
}

function correrScraper(args: string[]): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [SCRAPER_FILE, ...args], {
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
    if (!fs.existsSync(SCRAPER_FILE)) {
      return NextResponse.json(
        { ok: false, error: "No se encontró el scraper HTTP. Ejecuta npm install dentro de wansoft-scraper/." },
        { status: 400 }
      );
    }

    const esFecha = (v: any) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
    const args: string[] = [];
    let pendientesSolicitados: string[] | null = null;
    if (body.mes && /^\d{4}-\d{2}$/.test(body.mes)) {
      args.push("--month", body.mes);
    } else if (body.desde && body.hasta) {
      if (!esFecha(body.desde) || !esFecha(body.hasta)) {
        return NextResponse.json({ ok: false, error: "Fechas inválidas (usa AAAA-MM-DD)." }, { status: 400 });
      }
      if (body.soloFaltantes === true) {
        pendientesSolicitados = await diasPendientesSync(body.desde, body.hasta);
        if (!pendientesSolicitados.length) {
          return NextResponse.json({
            ok: true,
            sinCambios: true,
            pendientes: [],
            summary: { dias: 0, sucursales: 0, filas: 0, errores: 0, estado: "ok" },
          });
        }
        args.push("--dates", pendientesSolicitados.join(","));
      } else {
        args.push("--from", body.desde, "--to", body.hasta);
      }
    } else {
      // por defecto, hoy
    }
    if (body.branch != null && /^[\w,-]{1,80}$/.test(String(body.branch))) args.push("--branch", String(body.branch));

    const { code, stdout, stderr, timedOut } = await correrScraper(args);
    const summary = leerSummary(stdout);

    if (timedOut) {
      return NextResponse.json({ ok: false, error: "La sincronización superó el tiempo límite.", summary }, { status: 504 });
    }

    const salida = stdout + "\n" + stderr;
    const sesionVencida = summary?.sesionVencida === true || /SESIÓN VENCIDA|SESION VENCIDA/i.test(salida);
    if (code !== 0 && (!summary || summary.estado === "error")) {
      return NextResponse.json(
        {
          ok: false,
          sesionVencida,
          turnstilePendiente: sesionVencida,
          error: sesionVencida
            ? "La sesión de Wansoft falta o caducó. Copia una cookie vigente con wansoft-scraper/sembrar-cookie.mjs; después la automatización continúa sola."
            : "El scraper terminó con error. Revisa el historial / la consola del servidor.",
          summary,
          detalle: salida.slice(-800),
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ ok: true, summary, pendientes: pendientesSolicitados });
  });
}
