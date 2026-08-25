import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { dashboard, mesesDisponibles, listarSucursales } from "@/lib/services/wansoft";

function rangoDeParams(searchParams: URLSearchParams): { desde: string; hasta: string } {
  const desde = searchParams.get("desde") || "";
  const hasta = searchParams.get("hasta") || "";
  const mes = searchParams.get("mes") || "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(desde) && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return { desde, hasta };
  }
  if (/^\d{4}-\d{2}$/.test(mes)) {
    const [a, m] = mes.split("-").map(Number);
    const pad = (n: number) => String(n).padStart(2, "0");
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    return { desde: `${a}-${pad(m)}-01`, hasta: `${a}-${pad(m)}-${pad(ultimo)}` };
  }
  // Por defecto: mes en curso
  const hoy = new Date();
  const a = hoy.getUTCFullYear();
  const m = hoy.getUTCMonth() + 1;
  const pad = (n: number) => String(n).padStart(2, "0");
  const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return { desde: `${a}-${pad(m)}-01`, hasta: `${a}-${pad(m)}-${pad(ultimo)}` };
}

export async function GET(request: Request) {
  return conSesion(async () => {
    const { searchParams } = new URL(request.url);
    const { desde, hasta } = rangoDeParams(searchParams);
    const sucursalId = searchParams.get("sucursal") ? Number(searchParams.get("sucursal")) : undefined;

    const [datos, meses, sucursales] = await Promise.all([
      dashboard(desde, hasta, sucursalId),
      mesesDisponibles(),
      listarSucursales(false),
    ]);

    return NextResponse.json({ ok: true, dashboard: datos, meses, sucursales });
  });
}
