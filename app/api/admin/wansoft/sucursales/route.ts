import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarSucursales, crearSucursal } from "@/lib/services/wansoft";

export async function GET() {
  return conSesion(async () => {
    const sucursales = await listarSucursales(false);
    return NextResponse.json({ ok: true, sucursales });
  });
}

export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const r = await crearSucursal(body);
    return NextResponse.json({ ok: true, ...r }, { status: 201 });
  });
}
