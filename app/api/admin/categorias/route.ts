import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarCategorias, crearCategoria } from "@/lib/services/menu";

export async function GET() {
  return conSesion(async () => {
    const categorias = await listarCategorias();
    return NextResponse.json({ ok: true, categorias });
  });
}

export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await crearCategoria(body);
    return NextResponse.json({ ok: true, ...resultado }, { status: 201 });
  });
}
