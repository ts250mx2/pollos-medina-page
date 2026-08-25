import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { tipoDetalle } from "@/lib/services/wansoft";

export async function GET(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo") || "";
    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";
    const sucursalId = searchParams.get("sucursal") ? Number(searchParams.get("sucursal")) : undefined;
    if (!tipo) return NextResponse.json({ ok: false, error: "Falta el tipo." }, { status: 400 });
    const detalle = await tipoDetalle(tipo, desde, hasta, sucursalId);
    return NextResponse.json({ ok: true, detalle });
  });
}
