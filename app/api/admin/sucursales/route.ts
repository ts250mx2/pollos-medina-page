import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listar, crear } from "@/lib/services/sucursales";

export async function GET() {
  return conSesion(async () => {
    const sucursales = await listar(false);
    return NextResponse.json({ ok: true, sucursales });
  });
}

export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await crear(body);
    return NextResponse.json({ ok: true, ...resultado }, { status: 201 });
  });
}
