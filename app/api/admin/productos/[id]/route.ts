import { NextResponse } from "next/server";
import { conSesion, borrarImagen } from "@/lib/api-helper";
import { obtenerProducto, actualizarProducto, eliminarProducto } from "@/lib/services/menu";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const producto = await obtenerProducto(numericId);
    return NextResponse.json({ ok: true, producto });
  });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const body = await request.json();
    const resultado = await actualizarProducto(numericId, body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return conSesion(async () => {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    const producto = await obtenerProducto(numericId);
    await eliminarProducto(numericId);
    if (producto && producto.imagen) {
      borrarImagen(producto.imagen);
    }
    return NextResponse.json({ ok: true, id: numericId });
  });
}
