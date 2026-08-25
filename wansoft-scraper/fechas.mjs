// Resolucion de que dias consultar segun los argumentos de linea de comandos.
// Sin dependencias de Playwright: lo usan tanto scrape.mjs (navegador) como
// scrape-http.mjs (HTTP puro), para no duplicar la logica de fechas.
import { todayMX, yesterdayMX } from "./report.mjs";

const pad = (n) => String(n).padStart(2, "0");

/** Todos los dias de un mes 'YYYY-MM' (hasta hoy si es el mes en curso). */
export function diasDeMes(mes) {
  const [a, m] = mes.split("-").map(Number);
  const hoy = new Date();
  const esActual = mes === `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}`;
  const ultimo = esActual ? hoy.getDate() : new Date(a, m, 0).getDate();
  const dias = [];
  for (let d = 1; d <= ultimo; d++) dias.push(`${a}-${pad(m)}-${pad(d)}`);
  return dias;
}

/** Rango inclusivo de dias entre 'desde' y 'hasta' (tope de 400 por seguridad). */
export function rangoDias(desde, hasta) {
  const dias = [];
  const d = new Date(desde + "T12:00:00");
  const fin = new Date(hasta + "T12:00:00");
  let g = 0;
  while (d <= fin && g < 400) {
    dias.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    d.setDate(d.getDate() + 1);
    g++;
  }
  return dias;
}

/** Lee un argumento con valor: --date 2026-08-15 → "2026-08-15". */
export function argVal(args, name) {
  const i = args.indexOf(name);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
}

/** Decide la lista de dias a partir de los argumentos (y de DATE en el entorno). */
export function resolverDias(args) {
  const from = argVal(args, "--from");
  const to = argVal(args, "--to");
  const mes = argVal(args, "--month");
  const date = argVal(args, "--date") || process.env.DATE;
  if (from && to) return rangoDias(from, to);
  if (mes) return diasDeMes(mes);
  if (args.includes("--yesterday")) return [yesterdayMX()];
  if (date) return [date];
  return [todayMX()];
}
