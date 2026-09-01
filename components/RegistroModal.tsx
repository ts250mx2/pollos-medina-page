"use client";

import React, { useState } from "react";
import type { GridColumn } from "@/components/DataGrid";

// Modal de alta/edición genérico, construido desde la config de columnas.
// `alCambiar` permite autocompletar campos al cambiar otro (p. ej. la URL).

interface Props {
  titulo: string;
  columns: GridColumn[];
  valores: Record<string, string>;
  alCambiar?: (valores: Record<string, string>, key: string) => Record<string, string>;
  onGuardar: (valores: Record<string, string>) => void;
  onCerrar: () => void;
}

export default function RegistroModal({ titulo, columns, valores, alCambiar, onGuardar, onCerrar }: Props) {
  const [form, setForm] = useState<Record<string, string>>(valores);

  const set = (key: string, valor: string) =>
    setForm((prev) => {
      let next = { ...prev, [key]: valor };
      if (alCambiar) next = alCambiar(next, key);
      return next;
    });

  const guardar = () => {
    const faltante = columns.find((c) => c.required && !String(form[c.key] ?? "").trim());
    if (faltante) return; // el campo requerido queda marcado abajo
    onGuardar(form);
  };

  const faltaRequerido = (c: GridColumn) => c.required && !String(form[c.key] ?? "").trim();

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__fondo" onClick={onCerrar} />
      <div className="modal__caja" style={{ width: "min(560px, 100%)" }}>
        <header className="modal__head">
          <h3>{titulo}</h3>
          <button className="modal__cerrar" type="button" onClick={onCerrar} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal__cuerpo">
          {columns.map((c) => (
            <label className="campo" key={c.key}>
              <span>{c.label}{c.required ? " *" : ""}</span>
              {c.type === "select" ? (
                <select value={String(form[c.key] ?? "")} onChange={(e) => set(c.key, e.target.value)}>
                  {(c.options || []).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input value={String(form[c.key] ?? "")} onChange={(e) => set(c.key, e.target.value)} placeholder={c.placeholder} />
              )}
              {faltaRequerido(c) && <small style={{ color: "var(--rojo)" }}>Requerido</small>}
            </label>
          ))}
        </div>
        <footer className="modal__pie">
          <button className="btn btn--fantasma" type="button" onClick={onCerrar}>Cancelar</button>
          <button className="btn btn--rojo" type="button" onClick={guardar}>Guardar</button>
        </footer>
      </div>
    </div>
  );
}
