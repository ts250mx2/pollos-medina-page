import { NextResponse } from "next/server";
import { serializarCookiePedidosVacia } from "@/lib/auth-pedidos";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", serializarCookiePedidosVacia());
  return res;
}
