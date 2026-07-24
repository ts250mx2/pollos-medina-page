import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { guardarHero } from "@/lib/services/destacados";

export async function PUT(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await guardarHero(body);
    return NextResponse.json({ ok: true, ...resultado });
  });
}
