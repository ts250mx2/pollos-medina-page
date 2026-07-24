import { NextResponse } from "next/server";
import { conSesion, borrarImagen } from "@/lib/api-helper";
import { obtener, actualizar, eliminar } from "@/lib/services/sucursales";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const sucursal = await obtener(numericId);
    return NextResponse.json({ ok: true, sucursal });
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const body = await request.json();
    const resultado = await actualizar(numericId, body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const sucursal = await obtener(numericId);
    await eliminar(numericId);
    if (sucursal && sucursal.imagen) {
      borrarImagen(sucursal.imagen);
    }
    return NextResponse.json({ ok: true, id: numericId });
  });
}
