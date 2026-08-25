import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { grupoDetalle } from "@/lib/services/wansoft";

export async function GET(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const grupo = searchParams.get("grupo") || "";
    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";
    const sucursalId = searchParams.get("sucursal") ? Number(searchParams.get("sucursal")) : undefined;
    if (!grupo) return NextResponse.json({ ok: false, error: "Falta el grupo." }, { status: 400 });
    const detalle = await grupoDetalle(grupo, desde, hasta, sucursalId);
    return NextResponse.json({ ok: true, detalle });
  });
}
