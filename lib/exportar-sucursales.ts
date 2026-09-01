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

/** Tabla vertical campo/valor para los datos de una sucursal. */
function tablaDatos(filas: [string, string][]): string {
  const tr = filas.map(([k, v]) => `<tr><th class="kv">${esc(k)}</th><td>${esc(v)}</td></tr>`).join("");
  return `<table class="datos">${tr}</table>`;
}

/** Un bloque por sucursal: sus datos + terminales + usuarios juntos. */
function bloqueSucursal(s: Fila): string {
  const term = tabla(
    ["Tipo", "Número de serie", "Cuenta a depositar"],
    (s.terminales || []).map((t: Fila) => [t.tipo, t.numero_serie || "", t.cuenta_deposito || ""])
  );
  const usr = tabla(
    ["Tipo de usuario", "Usuario", "Contraseña"],
    (s.usuarios || []).map((u: Fila) => [u.tipo || "", u.usuario, u.password || ""])
  );
  return `
    <section class="suc">
      <h2>${esc(s.nombre)} ${s.activo ? "" : "<small>(oculta)</small>"}</h2>
      ${tablaDatos([
        ["Dirección", s.direccion || ""],
        ["Colonia", s.colonia || ""],
        ["Ciudad", s.ciudad || ""],
        ["Teléfono", s.telefono || ""],
        ["WhatsApp", s.whatsapp || ""],
        ["Horario", s.horario || ""],
        ["Mapa", s.mapa_url || ""],
      ])}
      <h3>Terminales de pago</h3>
      ${term}
      <h3>Usuarios Wansoft</h3>
      ${usr}
    </section>
  `;
}

/** Documento completo: resumen + un bloque con todo por cada sucursal. */
function contenido(sucursales: Fila[]): string {
  const resumen = tabla(
    ["Sucursal", "Dirección", "Ciudad", "Teléfono", "Horario", "Terminales", "Usuarios", "Visible"],
    sucursales.map((s) => [
      s.nombre, s.direccion || "", s.ciudad || "", s.telefono || "", s.horario || "",
      String((s.terminales || []).length), String((s.usuarios || []).length), s.activo ? "Sí" : "No",
    ])
  );

  return `
    <h1>Sucursales — Pollo Medina</h1>
    <p class="meta">Generado el ${hoy()} · ${sucursales.length} sucursales</p>
    <h2>Resumen</h2>
    ${resumen}
    ${sucursales.map(bloqueSucursal).join("")}
  `;
}

const ESTILOS = `
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1512; padding: 24px; }
  h1 { font-size: 20px; margin: 0 0 4px; color: #e4022a; }
  h2 { font-size: 15px; margin: 22px 0 8px; border-bottom: 2px solid #e4022a; padding-bottom: 3px; }
  h3 { font-size: 12px; margin: 12px 0 4px; color: #6f6862; text-transform: uppercase; letter-spacing: 0.03em; }
  h2 small { font-size: 11px; color: #9a9088; font-weight: 400; }
  .meta { color: #6f6862; font-size: 12px; margin: 0 0 8px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 8px; font-size: 12px; }
  th, td { border: 1px solid #d9d2ca; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #f3ede6; font-weight: 700; }
  table.datos { width: auto; min-width: 60%; margin-bottom: 10px; }
  table.datos th.kv { background: #faf7f3; width: 130px; }
  .suc { margin-top: 18px; }
  @media print { .suc { page-break-inside: avoid; } }
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
