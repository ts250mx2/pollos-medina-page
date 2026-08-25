// ============================================================
//  Parseo de reportes de ventas Wansoft (CSV / pegado / tabla)
//  Mapea los nombres de columna en español a nuestros campos.
// ============================================================

const quitarAcentos = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// Sinónimos de encabezados → campo interno.
const MAPA: { campo: string; claves: string[] }[] = [
  { campo: "sucursal", claves: ["sucursal", "tienda", "unidad", "centro", "restaurante", "establecimiento", "nombre"] },
  { campo: "fecha", claves: ["fecha", "dia", "day", "date"] },
  { campo: "venta_bruta", claves: ["venta bruta", "bruto", "bruta", "venta bruta total"] },
  { campo: "descuentos", claves: ["descuento", "descuentos", "desc"] },
  { campo: "cortesias", claves: ["cortesia", "cortesias", "cortesía", "cortesías"] },
  { campo: "cancelaciones", claves: ["cancelacion", "cancelaciones", "cancelado", "cancelados"] },
  { campo: "venta_neta", claves: ["venta neta", "neto", "neta", "venta de alimentos", "ventas netas", "subtotal"] },
  { campo: "impuestos", claves: ["impuesto", "impuestos", "iva", "i.v.a", "i.v.a."] },
  { campo: "propinas", claves: ["propina", "propinas"] },
  { campo: "venta_total", claves: ["venta total", "total", "total con impuestos", "gran total", "total general", "total venta"] },
  { campo: "cuentas", claves: ["cuentas", "cuenta", "cheques", "cheque", "tickets", "ticket", "folios", "ordenes", "órdenes", "no. cuentas", "num cuentas", "no cuentas"] },
  { campo: "comensales", claves: ["comensales", "personas", "clientes", "cubiertos", "no. personas"] },
  { campo: "ticket_promedio", claves: ["ticket promedio", "cheque promedio", "promedio", "ticket prom", "prom cuenta", "promedio cuenta"] },
  { campo: "efectivo", claves: ["efectivo", "contado", "cash"] },
  { campo: "tarjeta", claves: ["tarjeta", "tarjetas", "credito", "crédito", "debito", "débito", "tdc", "tdd"] },
  { campo: "otros_pago", claves: ["otros", "otro", "otras formas", "otros pagos", "vales", "transferencia"] },
];

/** Dado un encabezado, devuelve el campo interno o null. */
export function mapearEncabezado(encabezado: string): string | null {
  const h = quitarAcentos(encabezado);
  for (const { campo, claves } of MAPA) {
    if (claves.some((k) => h === k)) return campo;
  }
  // Coincidencia parcial (contiene)
  for (const { campo, claves } of MAPA) {
    if (claves.some((k) => h.includes(k))) return campo;
  }
  return null;
}

/** Divide una línea CSV respetando comillas dobles. */
function dividirLinea(linea: string, delim: string): string[] {
  const salida: string[] = [];
  let actual = "";
  let enComillas = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      if (enComillas && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === delim && !enComillas) {
      salida.push(actual);
      actual = "";
    } else {
      actual += c;
    }
  }
  salida.push(actual);
  return salida.map((s) => s.trim());
}

function detectarDelimitador(muestra: string): string {
  const candidatos = ["\t", ";", ",", "|"];
  let mejor = ",";
  let max = -1;
  for (const d of candidatos) {
    const n = (muestra.match(new RegExp(d === "\t" ? "\\t" : `\\${d}`, "g")) || []).length;
    if (n > max) {
      max = n;
      mejor = d;
    }
  }
  return mejor;
}

export interface OpcionesParseo {
  sucursal?: string; // se usa si la tabla no trae columna de sucursal
  fecha?: string; // se usa si la tabla no trae columna de fecha
}

/**
 * Convierte texto CSV/pegado en filas listas para importar.
 * La primera línea debe ser el encabezado.
 */
export function parsearCSV(texto: string, opciones: OpcionesParseo = {}): any[] {
  const lineas = String(texto || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lineas.length < 2) return [];

  const delim = detectarDelimitador(lineas[0]);
  const encabezados = dividirLinea(lineas[0], delim);
  const campos = encabezados.map(mapearEncabezado);

  const filas: any[] = [];
  for (let i = 1; i < lineas.length; i++) {
    const celdas = dividirLinea(lineas[i], delim);
    // Saltar filas de totales/resumen
    const primera = quitarAcentos(celdas[0] || "");
    if (["total", "totales", "gran total", "suma", "promedio"].includes(primera)) continue;

    const fila: any = {};
    const extra: Record<string, string> = {};
    celdas.forEach((valor, idx) => {
      const campo = campos[idx];
      if (campo) {
        fila[campo] = valor;
      } else if (encabezados[idx]) {
        extra[encabezados[idx]] = valor;
      }
    });

    if (!fila.sucursal && opciones.sucursal) fila.sucursal = opciones.sucursal;
    if (!fila.fecha && opciones.fecha) fila.fecha = opciones.fecha;
    if (Object.keys(extra).length) fila.metricas = extra;

    // Requiere al menos fecha + sucursal + algún importe.
    if (fila.fecha && (fila.sucursal || fila.sucursal_id)) {
      filas.push(fila);
    }
  }
  return filas;
}

// ============================================================
//  Parseo de una tabla HTML (respuesta del reporte de Wansoft)
// ============================================================

function limpiarCelda(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&aacute;/gi, "á")
    .replace(/&eacute;/gi, "é")
    .replace(/&iacute;/gi, "í")
    .replace(/&oacute;/gi, "ó")
    .replace(/&uacute;/gi, "ú")
    .replace(/&ntilde;/gi, "ñ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extrae filas [encabezado[], ...datos[][]] de la PRIMERA tabla grande del HTML. */
export function extraerTablas(html: string): string[][][] {
  const tablas: string[][][] = [];
  const reTabla = /<table[\s\S]*?<\/table>/gi;
  const bloques = html.match(reTabla) || [];
  for (const bloque of bloques) {
    const filas: string[][] = [];
    const reFila = /<tr[\s\S]*?<\/tr>/gi;
    const trs = bloque.match(reFila) || [];
    for (const tr of trs) {
      const celdas: string[] = [];
      const reCelda = /<t[hd][\s\S]*?<\/t[hd]>/gi;
      const tds = tr.match(reCelda) || [];
      for (const td of tds) celdas.push(limpiarCelda(td));
      if (celdas.length) filas.push(celdas);
    }
    if (filas.length >= 2) tablas.push(filas);
  }
  return tablas;
}

/**
 * Convierte el HTML del reporte en filas importables.
 * Busca la tabla cuyo encabezado tenga más columnas reconocidas.
 */
export function parsearReporteHTML(html: string, opciones: OpcionesParseo = {}): any[] {
  const tablas = extraerTablas(html);
  if (!tablas.length) return [];

  // Elegir la tabla con más encabezados mapeables.
  let mejor: string[][] | null = null;
  let mejorPuntaje = 0;
  for (const t of tablas) {
    const enc = t[0];
    const puntaje = enc.map(mapearEncabezado).filter(Boolean).length;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = t;
    }
  }
  if (!mejor || mejorPuntaje < 2) return [];

  const csv = mejor.map((fila) => fila.map((c) => `"${c.replace(/"/g, '""')}"`).join("\t")).join("\n");
  return parsearCSV(csv, opciones);
}
