import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarExtras, guardarExtras } from "@/lib/services/sucursales";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const extras = await listarExtras(parseInt(id, 10));
    return NextResponse.json({ ok: true, ...extras });
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const body = await request.json();
    const resultado = await guardarExtras(parseInt(id, 10), body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
