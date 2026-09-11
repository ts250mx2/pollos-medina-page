import { NextResponse } from "next/server";
import { verificarPin, pinConfigurado, emitirTokenPedidos, serializarCookiePedidos } from "@/lib/auth-pedidos";

export const dynamic = "force-dynamic";

// Rate limit del login del mostrador: 8 intentos / 10 min por IP.
const intentos = new Map<string, number[]>();
function excede(ip: string): boolean {
  const ahora = Date.now();
  const v = (intentos.get(ip) ?? []).filter((t) => ahora - t < 600_000);
  if (v.length >= 8) return true;
  v.push(ahora);
  intentos.set(ip, v);
  return false;
}

export async function POST(request: Request) {
  if (!pinConfigurado()) {
    return NextResponse.json(
      { ok: false, error: "El acceso al mostrador no está configurado. Define PEDIDOS_PIN en el .env." },
      { status: 503 }
    );
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (excede(ip)) {
    return NextResponse.json({ ok: false, error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Petición inválida." }, { status: 400 });
  }

  if (!verificarPin(body?.pin)) {
    return NextResponse.json({ ok: false, error: "PIN incorrecto." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", serializarCookiePedidos(emitirTokenPedidos()));
  return res;
}
