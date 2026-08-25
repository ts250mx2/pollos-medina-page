import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { productoDetalle } from "@/lib/services/wansoft";

export async function GET(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const producto = searchParams.get("producto") || "";
    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";
    const sucursalId = searchParams.get("sucursal") ? Number(searchParams.get("sucursal")) : undefined;
    if (!producto) {
      return NextResponse.json({ ok: false, error: "Falta el producto." }, { status: 400 });
    }
    const detalle = await productoDetalle(producto, desde, hasta, sucursalId);
    return NextResponse.json({ ok: true, detalle });
  });
}
