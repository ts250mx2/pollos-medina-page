import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { exportarTodo } from "@/lib/services/sucursales";

export async function GET() {
  return conSesion(async () => {
    const sucursales = await exportarTodo();
    return NextResponse.json({ ok: true, sucursales });
  });
}
