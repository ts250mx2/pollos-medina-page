import { NextResponse } from "next/server";
import { correrPollito } from "@/lib/pollito/agente";
import { hlConfigurado } from "@/lib/hl-cliente";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_MENSAJE = 1500;
const MAX_HISTORIAL = 40;
const LIMITE_POR_MINUTO = 12;

// Rate limit simple por IP (en memoria, una instancia).
const ventanas = new Map<string, number[]>();
function excedeLimite(ip: string): boolean {
  const ahora = Date.now();
  const v = (ventanas.get(ip) ?? []).filter((t) => ahora - t < 60_000);
  if (v.length >= LIMITE_POR_MINUTO) return true;
  v.push(ahora);
  ventanas.set(ip, v);
  if (ventanas.size > 3000) {
    for (const [k, marcas] of ventanas) if (marcas.every((t) => ahora - t >= 60_000)) ventanas.delete(k);
  }
  return false;
}

export async function POST(request: Request) {
  if (!hlConfigurado("poyito")) {
    return NextResponse.json({ ok: false, error: "El asistente no está configurado." }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (excedeLimite(ip)) {
    return NextResponse.json({ ok: false, error: "Vas muy rápido, espera un momento." }, { status: 429 });
  }

  let cuerpo: any;
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }

  const crudos = Array.isArray(cuerpo?.mensajes) ? cuerpo.mensajes : [];
  const mensajes = crudos
    .slice(-MAX_HISTORIAL)
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, MAX_MENSAJE) }));

  if (!mensajes.length || mensajes[mensajes.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, error: "Falta tu mensaje." }, { status: 400 });
  }

  try {
    const { reply, pedido, tarjetas } = await correrPollito(mensajes);
    return NextResponse.json({ ok: true, reply, pedido, tarjetas });
  } catch (e: any) {
    console.error("Pollito error:", e?.message || e);
    return NextResponse.json({ ok: false, error: "El asistente tuvo un problema. Intenta de nuevo." }, { status: 500 });
  }
}
