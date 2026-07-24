export class ErrorHttp extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

export const malaPeticion = (mensaje: string) => new ErrorHttp(400, mensaje);

interface RangoOptions {
  max?: number;
  min?: number;
}

/** Texto obligatorio, recortado y con longitud máxima. */
export function texto(valor: any, campo: string, { max = 255, min = 1 }: RangoOptions = {}): string {
  const limpio = String(valor == null ? "" : valor).trim();
  if (limpio.length < min) throw malaPeticion(`El campo "${campo}" es obligatorio.`);
  if (limpio.length > max) throw malaPeticion(`El campo "${campo}" no puede pasar de ${max} caracteres.`);
  return limpio;
}

/** Texto opcional: devuelve null si viene vacío. */
export function textoOpcional(valor: any, campo: string, { max = 255 }: RangoOptions = {}): string | null {
  const limpio = String(valor == null ? "" : valor).trim();
  if (!limpio) return null;
  if (limpio.length > max) throw malaPeticion(`El campo "${campo}" no puede pasar de ${max} caracteres.`);
  return limpio;
}

/** Número decimal no negativo. */
export function numero(valor: any, campo: string, { min = 0, max = 999999 }: RangoOptions = {}): number {
  const n = Number(valor);
  if (!Number.isFinite(n)) throw malaPeticion(`El campo "${campo}" debe ser un número.`);
  if (n < min || n > max) throw malaPeticion(`El campo "${campo}" debe estar entre ${min} y ${max}.`);
  return Math.round(n * 100) / 100;
}

/** Entero (orden, ids). */
export function entero(valor: any, campo: string, { min = 0, max = 999999 }: RangoOptions = {}): number {
  const n = Number.parseInt(valor, 10);
  if (!Number.isInteger(n)) throw malaPeticion(`El campo "${campo}" debe ser un número entero.`);
  if (n < min || n > max) throw malaPeticion(`El campo "${campo}" debe estar entre ${min} y ${max}.`);
  return n;
}

/** Booleano tolerante ("1", "true", true, 1). */
export function booleano(valor: any, porDefecto = true): boolean {
  if (valor === undefined || valor === null || valor === "") return porDefecto;
  return valor === true || valor === 1 || valor === "1" || valor === "true";
}

/** Convierte un texto en slug seguro para URLs e identificadores. */
export function aSlug(valor: any, campo: string): string {
  const base = String(valor == null ? "" : valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  if (!base) throw malaPeticion(`No se pudo generar un identificador para "${campo}".`);
  return base;
}

/** URL http/https opcional. */
export function urlOpcional(valor: any, campo: string): string | null {
  const limpio = textoOpcional(valor, campo, { max: 500 });
  if (!limpio) return null;
  try {
    const url = new URL(limpio);
    if (!["http:", "https:"].includes(url.protocol)) throw new Error();
    return limpio;
  } catch {
    throw malaPeticion(`El campo "${campo}" debe ser una dirección web válida (https://…).`);
  }
}

/** Coordenada geográfica opcional. */
export function coordenadaOpcional(valor: any, campo: string, limite: number): number | null {
  if (valor === undefined || valor === null || valor === "") return null;
  const n = Number(valor);
  if (!Number.isFinite(n) || Math.abs(n) > limite) {
    throw malaPeticion(`El campo "${campo}" no es una coordenada válida.`);
  }
  return n;
}
