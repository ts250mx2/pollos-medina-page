import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { cambiarPassword } from "@/lib/services/usuarios";
import { serializarCookieVacia } from "@/lib/auth";

export async function PUT(request: Request) {
  return conSesion(async (usuario) => {
    const body = await request.json();
    await cambiarPassword(
      usuario.id,
      String(body.actual || ""),
      String(body.nueva || "")
    );
    const response = NextResponse.json({
      ok: true,
      mensaje: "Contraseña actualizada. Vuelve a iniciar sesión.",
    });
    response.headers.set("Set-Cookie", serializarCookieVacia());
    return response;
  });
}
