import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { estadoSesionWansoft, guardarSesionWansoft } from "@/lib/services/wansoft";

export const runtime = "nodejs";

export async function GET() {
  return conSesion(async () => {
    const sesion = await estadoSesionWansoft();
    return NextResponse.json({ ok: true, sesion });
  });
}

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json().catch(() => ({}));
    await guardarSesionWansoft(body.cookie);
    const sesion = await estadoSesionWansoft();
    return NextResponse.json({ ok: true, sesion });
  });
}
