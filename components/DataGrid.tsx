"use client";

import React, { useState, useMemo } from "react";

// ============================================================
//  Grid editable con filtro por columna y ordenamiento.
//  - columns define cada columna (texto o select).
//  - rows son objetos con un _id estable (para editar tras ordenar/filtrar).
//  - onEdit(_id, key, valor) y onRemove(_id) los maneja el padre.
// ============================================================

export interface GridColumn {
  key: string;
  label: string;
  type: "text" | "select";
  options?: { value: string; label: string }[]; // requerido para type "select"
  placeholder?: string;
}

export interface GridRow {
  _id: number;
  [key: string]: any;
}

interface Props {
  columns: GridColumn[];
  rows: GridRow[];
  onEdit: (id: number, key: string, valor: string) => void;
  onRemove: (id: number) => void;
}

export default function DataGrid({ columns, rows, onEdit, onRemove }: Props) {
  const [orden, setOrden] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [filtros, setFiltros] = useState<Record<string, string>>({});

  // Texto visible de una celda (para select usa la etiqueta de la opción).
  const display = (row: GridRow, col: GridColumn): string => {
    const v = row[col.key] ?? "";
    if (col.type === "select" && col.options) {
      return col.options.find((o) => o.value === String(v))?.label ?? String(v);
    }
    return String(v);
  };

  const vista = useMemo(() => {
    let out = rows.filter((r) =>
      columns.every((c) => {
        const f = (filtros[c.key] || "").trim().toLowerCase();
        return !f || display(r, c).toLowerCase().includes(f);
      })
    );
    if (orden) {
      const col = columns.find((c) => c.key === orden.key);
      if (col) {
        out = [...out].sort((a, b) =>
          display(a, col).localeCompare(display(b, col), "es", { numeric: true, sensitivity: "base" }) * orden.dir
        );
      }
    }
    return out;
    // display es puro respecto a columns; se recalcula con rows/filtros/orden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, columns, filtros, orden]);

  const alternarOrden = (key: string) =>
    setOrden((prev) => (prev?.key === key ? (prev.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }));

  const flecha = (key: string) => (orden?.key === key ? (orden.dir === 1 ? " ▲" : " ▼") : "");

  return (
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
          <tr className="grid-filtros">
            {columns.map((c) => (
              <th key={c.key}>
                <input
                  value={filtros[c.key] || ""}
                  onChange={(e) => setFiltros((f) => ({ ...f, [c.key]: e.target.value }))}
                  placeholder="Filtrar…"
                  aria-label={`Filtrar ${c.label}`}
                />
              </th>
            ))}
            <th className="grid-acc" />
          </tr>
        </thead>
        <tbody>
          {vista.map((r) => (
            <tr key={r._id}>
              {columns.map((c) => (
                <td key={c.key}>
                  {c.type === "select" ? (
                    <select value={String(r[c.key] ?? "")} onChange={(e) => onEdit(r._id, c.key, e.target.value)}>
                      {(c.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  ) : (
                    <input value={String(r[c.key] ?? "")} onChange={(e) => onEdit(r._id, c.key, e.target.value)} placeholder={c.placeholder} />
                  )}
                </td>
              ))}
              <td className="grid-acc">
                <button type="button" className="btn btn--peligro btn--sm" onClick={() => onRemove(r._id)} aria-label="Quitar">✕</button>
              </td>
            </tr>
          ))}
          {!vista.length && (
            <tr><td colSpan={columns.length + 1} className="ws-vacio">{rows.length ? "Ningún renglón coincide con el filtro." : "Sin registros."}</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
