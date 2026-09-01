"use client";

import React, { useState, useEffect, useCallback } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";

// Catálogo global de terminales de pago.

interface SucursalRef { id: number; nombre: string }
interface Fila { sucursal_id: string; tipo: string; numero_serie: string; cuenta: string }

const TIPOS = ["Spin", "Clip", "Mercado Pago"];
const filaVacia = (): Fila => ({ sucursal_id: "", tipo: "", numero_serie: "", cuenta: "" });

interface Props {
  sucursales: SucursalRef[];
  onToast: (msg: string) => void;
}

export default function TerminalesPanel({ sucursales, onToast }: Props) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Sin asignar",
    [sucursales]
  );

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const res = await fetch("/api/admin/terminales");
        const d = await res.json();
        if (d.ok) {
          setFilas((d.terminales || []).map((t: any) => ({
            sucursal_id: t.sucursal_id ? String(t.sucursal_id) : "",
            tipo: t.tipo || "", numero_serie: t.numero_serie || "", cuenta: t.cuenta || "",
          })));
        } else onToast(d.error || "No se pudieron cargar las terminales.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  const set = (i: number, campo: keyof Fila, valor: string) =>
    setFilas((prev) => prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f)));

  const guardar = async () => {
    if (filas.some((f) => !f.tipo.trim())) { onToast("Cada terminal necesita un tipo."); return; }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/terminales", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminales: filas }),
      });
      const d = await res.json();
      if (d.ok) onToast(`Terminales guardadas (${d.total}).`);
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setGuardando(false); }
  };

  const datosExport = (): string[][] =>
    filas.map((f) => [nombreSucursal(f.sucursal_id), f.tipo, f.numero_serie, f.cuenta]);
  const HEADERS = ["Sucursal", "Tipo", "Número de serie", "Cuenta"];
  const exportarExcel = () => descargarExcel("terminales", "Terminales de pago", HEADERS, datosExport());
  const exportarPDF = () => { if (!imprimirPDF("Terminales de pago", HEADERS, datosExport())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Terminales</h2><p>Catálogo de terminales de pago por sucursal.</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={() => setFilas((p) => [...p, filaVacia()])}>+ Terminal</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <>
          <div className="cat-grid">
            {filas.map((f, i) => (
              <div className="cat-fila cat-fila--term" key={i}>
                <label className="campo"><span>Sucursal</span>
                  <select value={f.sucursal_id} onChange={(e) => set(i, "sucursal_id", e.target.value)}>
                    <option value="">Sin asignar</option>
                    {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </label>
                <label className="campo"><span>Tipo de terminal</span>
                  <select value={f.tipo} onChange={(e) => set(i, "tipo", e.target.value)}>
                    <option value="">— Elige —</option>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="campo"><span>Número de serie</span>
                  <input value={f.numero_serie} onChange={(e) => set(i, "numero_serie", e.target.value)} placeholder="Opcional" />
                </label>
                <label className="campo"><span>Cuenta</span>
                  <input value={f.cuenta} onChange={(e) => set(i, "cuenta", e.target.value)} placeholder="Opcional" />
                </label>
                <button className="btn btn--peligro btn--sm ws-grid-edit__quitar" type="button" onClick={() => setFilas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar">✕</button>
              </div>
            ))}
            {!filas.length && <p className="ws-vacio">Sin terminales. Usa “+ Terminal”.</p>}
          </div>
          <div className="portada__acciones" style={{ marginTop: "1rem" }}>
            <button className="btn btn--negro" type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar terminales"}</button>
          </div>
        </>
      )}
    </section>
  );
}
