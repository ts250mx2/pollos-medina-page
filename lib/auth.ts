import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { serialize } from "cookie";

const JWT_SECRET = process.env.JWT_SECRET || "bbfe185594d1b2da397e0287ee45f1acd3721cd36a0af8431ebf3affc21e65c0a30ca12a31bee1e097d7871501765d1c";
const JWT_EXPIRA = process.env.JWT_EXPIRA || "8h";
const COOKIE_NAME = "pm_sesion";

export interface UsuarioSesion {
  id: number;
  usuario: string;
  nombre: string;
  rol: "admin" | "editor";
}

export function emitirToken(usuario: any): string {
  return jwt.sign(
    { sub: usuario.id, usuario: usuario.usuario, nombre: usuario.nombre, rol: usuario.rol },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRA as any }
  );
}

export function verificarToken(token: string): UsuarioSesion | null {
  try {
    const datos = jwt.verify(token, JWT_SECRET) as any;
    return {
      id: datos.sub,
      usuario: datos.usuario,
      nombre: datos.nombre,
      rol: datos.rol,
    };
  } catch {
    return null;
  }
}

export function serializarCookie(token: string): string {
  const esProd = process.env.NODE_ENV === "production";
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: esProd,
    maxAge: 8 * 60 * 60, // 8 horas en segundos
    path: "/",
  });
}

export function serializarCookieVacia(): string {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: -1,
    path: "/",
  });
}

export async function obtenerUsuarioActual(): Promise<UsuarioSesion | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verificarToken(token);
}
