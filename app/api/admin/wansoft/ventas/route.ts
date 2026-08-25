import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { listarVentas, guardarVenta, eliminarVenta } from "@/lib/services/wansoft";

export async function GET(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const filas = await listarVentas({
      desde: searchParams.get("desde") || undefined,
      hasta: searchParams.get("hasta") || undefined,
      sucursalId: searchParams.get("sucursal") ? Number(searchParams.get("sucursal")) : undefined,
      limite: searchParams.get("limite") ? Number(searchParams.get("limite")) : undefined,
    });
    return NextResponse.json({ ok: true, ventas: filas });
  });
}

export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();
    const resultado = await guardarVenta({ ...body, origen: body.origen || "manual" });
    return NextResponse.json({ ok: true, ...resultado });
  });
}

export async function DELETE(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const sucursal = Number(searchParams.get("sucursal"));
    const fecha = searchParams.get("fecha") || "";
    if (!sucursal || !fecha) {
      return NextResponse.json({ ok: false, error: "Falta sucursal o fecha." }, { status: 400 });
    }
    const r = await eliminarVenta(sucursal, fecha);
    return NextResponse.json({ ...r, ok: true });
  });
}
