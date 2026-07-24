import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listar, guardar } from "@/lib/services/configuracion";

export async function GET() {
  return conSesion(async () => {
    const configuracion = await listar();
    return NextResponse.json({ ok: true, configuracion });
  });
}

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const guardadas = await guardar(body);
    return NextResponse.json({ ok: true, guardadas });
  });
}
