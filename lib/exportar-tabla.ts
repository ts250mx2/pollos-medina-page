// Exportación genérica de una tabla a Excel (.xls) y PDF (impresión).
// Solo se usa en el navegador (Blob / window). Sin dependencias externas.

const esc = (v: any) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const hoy = () => new Date().toISOString().slice(0, 10);

const ESTILOS = `
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1512; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #e4022a; }
  .meta { color: #6f6862; font-size: 12px; margin: 0 0 12px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border: 1px solid #d9d2ca; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f3ede6; font-weight: 700; }
`;

function documento(titulo: string, headers: string[], filas: string[][]): string {
  const th = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const tr = filas.length
    ? filas.map((f) => `<tr>${f.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")
    : `<tr><td colspan="${headers.length}">— sin registros —</td></tr>`;
  return `
    <h1>${esc(titulo)}</h1>
    <p class="meta">Generado el ${hoy()} · ${filas.length} registros</p>
    <table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>
  `;
}

/** Descarga un archivo que Excel abre directamente (.xls con tabla HTML). */
export function descargarExcel(nombre: string, titulo: string, headers: string[], filas: string[][]): void {
  const html = `<html><head><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${documento(titulo, headers, filas)}</body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}-${hoy()}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Abre una vista imprimible y lanza el diálogo de impresión (Guardar como PDF). */
export function imprimirPDF(titulo: string, headers: string[], filas: string[][]): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.write(
    `<html><head><title>${esc(titulo)}</title><meta charset="utf-8"><style>${ESTILOS}</style></head><body>${documento(titulo, headers, filas)}</body></html>`
  );
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
  return true;
}
