"use client";

import React, { useState, useMemo } from "react";

// ============================================================
//  Grid de solo lectura: buscador único (todas las columnas) +
//  ordenamiento por columna + acciones Editar/Borrar por fila.
//  El alta y la edición se hacen en un modal (ver RegistroModal).
// ============================================================

export interface GridColumn {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { value: string; label: string }[]; // requerido para type "select"
  placeholder?: string;
  required?: boolean;
}

export interface GridRow {
  _id: number;
  [key: string]: any;
}

interface Props {
  columns: GridColumn[];
  rows: GridRow[];
  onEditar: (id: number) => void;
  onBorrar: (id: number) => void;
}

// Texto visible de una celda (para select usa la etiqueta de la opción).
export function displayCelda(row: GridRow, col: GridColumn): string {
  const v = row[col.key] ?? "";
  if (col.type === "select" && col.options) {
    return col.options.find((o) => o.value === String(v))?.label ?? String(v);
  }
  return String(v);
}

export default function DataGrid({ columns, rows, onEditar, onBorrar }: Props) {
  const [orden, setOrden] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [filtro, setFiltro] = useState("");

  const vista = useMemo(() => {
    const f = filtro.trim().toLowerCase();
    let out = f
      ? rows.filter((r) => columns.some((c) => displayCelda(r, c).toLowerCase().includes(f)))
      : rows;
    if (orden) {
      const col = columns.find((c) => c.key === orden.key);
      if (col) {
        out = [...out].sort((a, b) =>
          displayCelda(a, col).localeCompare(displayCelda(b, col), "es", { numeric: true, sensitivity: "base" }) * orden.dir
        );
      }
    }
    return out;
  }, [rows, columns, filtro, orden]);

  const alternarOrden = (key: string) =>
    setOrden((prev) => (prev?.key === key ? (prev.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));
  const flecha = (key: string) => (orden?.key === key ? (orden.dir === 1 ? " ▲" : " ▼") : "");

  return (
    <>
      <div className="grid-buscar">
        <input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="🔎 Buscar en todas las columnas…" aria-label="Buscar" />
        <span className="grid-buscar__conteo">{vista.length} de {rows.length}</span>
      </div>
      <div className="grid-wrap">
        <table className="grid-tabla">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.key}>
                  <button type="button" className="grid-orden" onClick={() => alternarOrden(c.key)} title="Ordenar">
                    {c.label}{flecha(c.key)}
                  </button>
                </th>
              ))}
              <th className="grid-acc" aria-label="Acciones" />
            </tr>
          </thead>
          <tbody>
            {vista.map((r) => (
              <tr key={r._id}>
                {columns.map((c) => <td key={c.key}>{displayCelda(r, c) || <span className="grid-vacia">—</span>}</td>)}
                <td className="grid-acc">
                  <button type="button" className="btn btn--fantasma btn--sm" onClick={() => onEditar(r._id)}>Editar</button>
                  <button type="button" className="btn btn--peligro btn--sm" onClick={() => onBorrar(r._id)} aria-label="Borrar">✕</button>
                </td>
              </tr>
            ))}
            {!vista.length && (
              <tr><td colSpan={columns.length + 1} className="ws-vacio">{rows.length ? "Ningún renglón coincide con la búsqueda." : "Sin registros."}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
