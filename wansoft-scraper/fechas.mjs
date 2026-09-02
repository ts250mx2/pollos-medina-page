// Resolucion de que dias consultar segun los argumentos de linea de comandos.
// Sin dependencias de Playwright: lo usan tanto scrape.mjs (navegador) como
// scrape-http.mjs (HTTP puro), para no duplicar la logica de fechas.
import { todayMX, yesterdayMX } from "./report.mjs";

const pad = (n) => String(n).padStart(2, "0");

/** Todos los dias de un mes 'YYYY-MM' (hasta hoy si es el mes en curso). */
export function diasDeMes(mes) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new Error(`Mes inválido: ${mes}`);
  const [a, m] = mes.split("-").map(Number);
  const hoy = todayMX();
  const esActual = mes === hoy.slice(0, 7);
  const ultimo = esActual ? Number(hoy.slice(8, 10)) : new Date(Date.UTC(a, m, 0)).getUTCDate();
  const dias = [];
  for (let d = 1; d <= ultimo; d++) dias.push(`${a}-${pad(m)}-${pad(d)}`);
  return dias;
}

/** Rango inclusivo de dias entre 'desde' y 'hasta' (tope de 400 por seguridad). */
export function rangoDias(desde, hasta) {
  const patron = /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
  if (!patron.test(desde) || !patron.test(hasta)) throw new Error("Rango de fechas inválido");
  const dias = [];
  const d = new Date(desde + "T00:00:00Z");
  const fin = new Date(hasta + "T00:00:00Z");
  const aYmd = (fecha) => `${fecha.getUTCFullYear()}-${pad(fecha.getUTCMonth() + 1)}-${pad(fecha.getUTCDate())}`;
  if (Number.isNaN(d.valueOf()) || Number.isNaN(fin.valueOf()) || aYmd(d) !== desde || aYmd(fin) !== hasta || d > fin) {
    throw new Error("Rango de fechas inválido");
  }
  let g = 0;
  while (d <= fin && g < 400) {
    dias.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
    d.setUTCDate(d.getUTCDate() + 1);
    g++;
  }
  if (d <= fin) throw new Error("El rango no puede superar 400 días");
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
  const dates = argVal(args, "--dates");
  const date = argVal(args, "--date") || process.env.DATE;
  if (from && to) return rangoDias(from, to);
  if (mes) return diasDeMes(mes);
  if (dates) {
    const unicos = [...new Set(dates.split(",").map((v) => v.trim()).filter(Boolean))];
    if (!unicos.length || unicos.length > 400) throw new Error("Lista de fechas inválida");
    return unicos.map((v) => rangoDias(v, v)[0]).sort();
  }
  if (args.includes("--yesterday")) return [yesterdayMX()];
  if (date) return rangoDias(date, date);
  return [todayMX()];
}
