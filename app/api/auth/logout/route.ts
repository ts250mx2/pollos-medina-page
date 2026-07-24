import { NextResponse } from "next/server";
import { serializarCookieVacia } from "@/lib/auth";

export async function POST() {
  const cookie = serializarCookieVacia();
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", cookie);
  return response;
}
