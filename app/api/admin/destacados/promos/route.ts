import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { guardarPromos } from "@/lib/services/destacados";

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const lista = Array.isArray(body) ? body : body.promos;
    const resultado = await guardarPromos(lista);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
