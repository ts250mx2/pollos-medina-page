import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { actualizarCategoria, eliminarCategoria } from "@/lib/services/menu";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const body = await request.json();
    const resultado = await actualizarCategoria(numericId, body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const resultado = await eliminarCategoria(numericId);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
