// Exportación de sucursales (con terminales y usuarios Wansoft) a Excel y PDF.
// Solo se usa en el navegador (usa Blob / window). Sin dependencias externas.

type Fila = Record<string, any>;

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const ubic = (s: Fila) => [s.direccion, s.colonia, s.ciudad].filter(Boolean).join(", ");
const hoy = () => new Date().toISOString().slice(0, 10);

function tabla(encabezados: string[], filas: string[][]): string {
  const th = encabezados.map((h) => `<th>${esc(h)}</th>`).join("");
  const tr = filas.length
    ? filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${encabezados.length}">— sin registros —</td></tr>`;
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

/** Construye las tres tablas (sucursales, terminales, usuarios) como HTML. */
function contenido(sucursales: Fila[]): string {
  const suc = tabla(
    ["Sucursal", "Dirección", "Colonia", "Ciudad", "Teléfono", "WhatsApp", "Horario", "Visible"],
    sucursales.map((s) => [s.nombre, s.direccion, s.colonia || "", s.ciudad || "", s.telefono || "", s.whatsapp || "", s.horario || "", s.activo ? "Sí" : "No"])
  );

  const term: string[][] = [];
  const usr: string[][] = [];
  for (const s of sucursales) {
    for (const t of s.terminales || []) term.push([s.nombre, t.tipo, t.numero_serie || "", t.cuenta_deposito || ""]);
    for (const u of s.usuarios || []) usr.push([s.nombre, u.tipo || "", u.usuario, u.password || ""]);
  }

  return `
    <h1>Sucursales — Pollo Medina</h1>
    <p class="meta">Generado el ${hoy()} · ${sucursales.length} sucursales</p>
    <h2>Sucursales</h2>
    ${suc}
    <h2>Terminales de pago</h2>
    ${tabla(["Sucursal", "Tipo", "Número de serie", "Cuenta a depositar"], term)}
    <h2>Usuarios Wansoft</h2>
    ${tabla(["Sucursal", "Tipo de usuario", "Usuario", "Contraseña"], usr)}
  `;
}

const ESTILOS = `
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1512; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #e4022a; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #e4022a; padding-bottom: 3px; }
  .meta { color: #6f6862; font-size: 12px; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; font-size: 12px; }
  th, td { border: 1px solid #d9d2ca; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f3ede6; font-weight: 700; }
`;

/** Descarga un archivo que Excel abre directamente (.xls con tablas HTML). */
export function descargarExcel(sucursales: Fila[]): void {
  const html = `<html><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${contenido(sucursales)}</body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sucursales-${hoy()}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre una vista imprimible y lanza el diálogo de impresión (Guardar como PDF). */
export function imprimirPDF(sucursales: Fila[]): boolean {
  const win = window.open("", "_blank");
  if (!win) return false; // bloqueado por el navegador
  win.document.write(
    `<html><head><title>Sucursales — Pollo Medina</title><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${contenido(sucursales)}</body></html>`
  );
  win.document.close();
  win.focus();
  // Dar un instante a que pinte antes de imprimir.
  setTimeout(() => win.print(), 300);
  return true;
}
