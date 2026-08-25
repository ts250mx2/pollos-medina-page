/**
 * Lectura de variables de entorno obligatorias.
 *
 * No hay valores por defecto a propósito: un secreto escrito en el código
 * termina publicado en el repositorio. Si falta la variable, el arranque falla.
 */
export function requerido(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Defínela en el archivo .env antes de arrancar.`
    );
  }
  return valor;
}
