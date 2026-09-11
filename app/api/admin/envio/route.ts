import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { getConfigEnvio, guardarConfigEnvio } from "@/lib/services/envio";

export async function GET() {
  return conSesion(async () => {
    const envio = await getConfigEnvio();
    return NextResponse.json({ ok: true, envio });
  });
}

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const envio = await guardarConfigEnvio(body);
    return NextResponse.json({ ok: true, envio });
  });
}
