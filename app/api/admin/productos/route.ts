import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { crearProducto } from "@/lib/services/menu";

export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await crearProducto(body);
    return NextResponse.json({ ok: true, ...resultado }, { status: 201 });
  });
}
