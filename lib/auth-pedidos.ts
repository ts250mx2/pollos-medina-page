import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { serialize } from "cookie";
import { requerido } from "./entorno";

// ============================================================
//  Sesión del mostrador de pedidos (/pedidos). Independiente del
//  panel /admin: cookie propia, acceso por PIN (PEDIDOS_PIN).
// ============================================================

const JWT_SECRET = requerido("JWT_SECRET");
const COOKIE_NAME = "pm_pedidos";
const SCOPE = "pedidos";
const HORAS = 12;

/** ¿Está configurado el acceso al mostrador? */
export function pinConfigurado(): boolean {
  return Boolean((process.env.PEDIDOS_PIN || "").trim());
}

/** Compara el PIN en tiempo ~constante para no filtrar longitud por timing. */
export function verificarPin(pin: string): boolean {
  const esperado = (process.env.PEDIDOS_PIN || "").trim();
  const dado = String(pin || "").trim();
  if (!esperado || !dado || esperado.length !== dado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= esperado.charCodeAt(i) ^ dado.charCodeAt(i);
  return dif === 0;
}

export function emitirTokenPedidos(): string {
  return jwt.sign({ scope: SCOPE }, JWT_SECRET, { expiresIn: `${HORAS}h` });
}

export function serializarCookiePedidos(token: string): string {
  return serialize(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: HORAS * 60 * 60,
    path: "/",
  });
}

export function serializarCookiePedidosVacia(): string {
  return serialize(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: -1,
    path: "/",
  });
}

export async function sesionPedidosActiva(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const datos = jwt.verify(token, JWT_SECRET) as any;
    return datos?.scope === SCOPE;
  } catch {
    return false;
  }
}
