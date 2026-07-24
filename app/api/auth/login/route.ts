import { NextResponse } from "next/server";
import { verificarCredenciales } from "@/lib/services/usuarios";
import { emitirToken, serializarCookie } from "@/lib/auth";
import { handleApiError } from "@/lib/api-helper";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const usuario = String(body.usuario || "").trim();
    const password = String(body.password || "");

    if (!usuario || !password) {
      return NextResponse.json({ ok: false, error: "Escribe tu usuario y contraseña." }, { status: 400 });
    }

    const encontrado = await verificarCredenciales(usuario, password);
    if (!encontrado) {
      return NextResponse.json({ ok: false, error: "Usuario o contraseña incorrectos." }, { status: 401 });
    }

    const token = emitirToken(encontrado);
    const cookie = serializarCookie(token);

    const response = NextResponse.json({ ok: true, usuario: encontrado });
    response.headers.set("Set-Cookie", cookie);
    return response;
  } catch (error: any) {
    return handleApiError(error);
  }
}
