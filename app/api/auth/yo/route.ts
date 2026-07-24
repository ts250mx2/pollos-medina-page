import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";

export async function GET() {
  return conSesion(async (usuario) => {
    return NextResponse.json({ ok: true, usuario });
  });
}
