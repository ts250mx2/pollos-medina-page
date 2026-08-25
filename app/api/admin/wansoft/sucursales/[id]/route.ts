import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { actualizarSucursal, eliminarSucursal } from "@/lib/services/wansoft";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const body = await request.json();
    const r = await actualizarSucursal(Number(id), body);
    return NextResponse.json({ ok: true, ...r });
  });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const r = await eliminarSucursal(Number(id));
    return NextResponse.json({ ok: true, ...r });
  });
}
