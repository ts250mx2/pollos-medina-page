import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { menuCompleto } from "@/lib/services/menu";

export async function GET() {
  return conSesion(async () => {
    const menu = await menuCompleto(false);
    return NextResponse.json({ ok: true, menu });
  });
}
