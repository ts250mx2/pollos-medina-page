import { NextResponse } from "next/server";
import { sesionPedidosActiva } from "@/lib/auth-pedidos";
import { listarPedidos, cambiarEstado } from "@/lib/services/pedidos";
import { handleApiError } from "@/lib/api-helper";

export const dynamic = "force-dynamic";

function noAutorizado() {
  return NextResponse.json({ ok: false, error: "Necesitas iniciar sesión en el mostrador." }, { status: 401 });
}

export async function GET(request: Request) {
  if (!(await sesionPedidosActiva())) return noAutorizado();
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") || undefined;
    const pedidos = await listarPedidos(estado);
    return NextResponse.json({ ok: true, pedidos });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  if (!(await sesionPedidosActiva())) return noAutorizado();
  try {
    const body = await request.json();
    const r = await cambiarEstado(Number(body?.id), String(body?.estado));
    return NextResponse.json({ ok: true, ...r });
  } catch (error) {
    return handleApiError(error);
  }
}
