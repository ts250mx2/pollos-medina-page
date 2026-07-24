import { NextResponse } from "next/server";
import { ErrorHttp } from "./validar";
import { obtenerUsuarioActual, UsuarioSesion } from "./auth";
import fs from "fs";
import path from "path";

export function handleApiError(error: any) {
  console.error("API Error:", error);
  if (error instanceof ErrorHttp) {
    return NextResponse.json({ ok: false, error: error.message }, { status: error.estado });
  }
  return NextResponse.json(
    { ok: false, error: error.message || "Ocurrió un error interno del servidor." },
    { status: 500 }
  );
}

export function borrarImagen(rutaPublica: string | null | undefined): boolean {
  if (!rutaPublica || !rutaPublica.startsWith("/uploads/")) return false;
  const relativa = rutaPublica.replace("/uploads/", "");
  const completa = path.join(process.cwd(), "public", "uploads", relativa);
  try {
    fs.unlinkSync(completa);
    return true;
  } catch {
    return false;
  }
}

export async function conSesion(
  handler: (usuario: UsuarioSesion) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const usuario = await obtenerUsuarioActual();
    if (!usuario) {
      return NextResponse.json({ ok: false, error: "Necesitas iniciar sesión." }, { status: 401 });
    }
    return await handler(usuario);
  } catch (error: any) {
    return handleApiError(error);
  }
}
