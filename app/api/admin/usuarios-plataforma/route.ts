import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarUsuariosPlataforma, guardarUsuariosPlataforma } from "@/lib/services/catalogos";

export async function GET() {
  return conSesion(async () => {
    const usuarios = await listarUsuariosPlataforma();
    return NextResponse.json({ ok: true, usuarios });
  });
}

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await guardarUsuariosPlataforma(body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
