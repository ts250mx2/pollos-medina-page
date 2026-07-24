import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { paraPanel } from "@/lib/services/destacados";

export async function GET() {
  return conSesion(async () => {
    const destacados = await paraPanel();
    return NextResponse.json({ ok: true, destacados });
  });
}
