import bcrypt from "bcryptjs";
import { consultar, unaFila } from "../db";
import { ErrorHttp, texto } from "../validar";

export const MIN_PASSWORD = 8;

export async function buscarPorUsuario(usuario: string): Promise<any | null> {
  return unaFila(
    "SELECT id, usuario, password_hash, nombre, rol, activo FROM usuarios WHERE usuario = ?",
    [usuario]
  );
}

const HASH_FALSO = bcrypt.hashSync("usuario-inexistente", 12);

export async function verificarCredenciales(usuario: string, password: string): Promise<any | null> {
  const fila = await buscarPorUsuario(usuario);
  const hash = fila && fila.activo ? fila.password_hash : HASH_FALSO;
  const coincide = await bcrypt.compare(password, hash);

  if (!fila || !fila.activo || !coincide) return null;

  await consultar("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?", [fila.id]);
  return { id: fila.id, usuario: fila.usuario, nombre: fila.nombre, rol: fila.rol };
}

export async function cambiarPassword(id: number, passwordActual: string, passwordNueva: string): Promise<{ id: number }> {
  const fila = await unaFila("SELECT id, password_hash FROM usuarios WHERE id = ?", [id]);
  if (!fila) throw new ErrorHttp(404, "El usuario no existe.");

  const correcta = await bcrypt.compare(passwordActual, fila.password_hash);
  if (!correcta) throw new ErrorHttp(401, "La contraseña actual no es correcta.");

  const nueva = texto(passwordNueva, "contraseña nueva", { max: 100, min: MIN_PASSWORD });
  if (nueva.length < MIN_PASSWORD) {
    throw new ErrorHttp(400, `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`);
  }
  if (nueva === passwordActual) {
    throw new ErrorHttp(400, "La contraseña nueva debe ser distinta de la actual.");
  }

  const hash = await bcrypt.hash(nueva, 12);
  await consultar("UPDATE usuarios SET password_hash = ? WHERE id = ?", [hash, id]);
  return { id };
}
