import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarTerminales, guardarTerminales } from "@/lib/services/catalogos";

export async function GET() {
  return conSesion(async () => {
    const terminales = await listarTerminales();
    return NextResponse.json({ ok: true, terminales });
  });
}

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await guardarTerminales(body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
