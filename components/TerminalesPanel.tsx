"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";
import DataGrid, { GridColumn, GridRow } from "@/components/DataGrid";

// Catálogo global de terminales de pago (grid con filtros y ordenamiento).

interface SucursalRef { id: number; nombre: string }

const TIPOS = ["Spin", "Clip", "Mercado Pago"];

interface Props {
  sucursales: SucursalRef[];
  onToast: (msg: string) => void;
}

export default function TerminalesPanel({ sucursales, onToast }: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const nextId = useRef(1);

  const nuevoId = () => nextId.current++;
  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Sin asignar",
    [sucursales]
  );

  const columnas: GridColumn[] = useMemo(() => [
    { key: "sucursal_id", label: "Sucursal", type: "select", options: [{ value: "", label: "Sin asignar" }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))] },
    { key: "tipo", label: "Tipo", type: "select", options: [{ value: "", label: "— Elige —" }, ...TIPOS.map((t) => ({ value: t, label: t }))] },
    { key: "numero_serie", label: "Número de serie", type: "text", placeholder: "Opcional" },
    { key: "cuenta", label: "Cuenta", type: "text", placeholder: "Opcional" },
  ], [sucursales]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const res = await fetch("/api/admin/terminales");
        const d = await res.json();
        if (d.ok) {
          setRows((d.terminales || []).map((t: any) => ({
            _id: nuevoId(),
            sucursal_id: t.sucursal_id ? String(t.sucursal_id) : "",
            tipo: t.tipo || "", numero_serie: t.numero_serie || "", cuenta: t.cuenta || "",
          })));
        } else onToast(d.error || "No se pudieron cargar las terminales.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  const editar = (id: number, key: string, valor: string) =>
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, [key]: valor } : r)));
  const quitar = (id: number) => setRows((prev) => prev.filter((r) => r._id !== id));
  const agregar = () => setRows((prev) => [...prev, { _id: nuevoId(), sucursal_id: "", tipo: "", numero_serie: "", cuenta: "" }]);

  const guardar = async () => {
    if (rows.some((r) => !String(r.tipo).trim())) { onToast("Cada terminal necesita un tipo."); return; }
    setGuardando(true);
    try {
      const terminales = rows.map((r) => ({ sucursal_id: r.sucursal_id, tipo: r.tipo, numero_serie: r.numero_serie, cuenta: r.cuenta }));
      const res = await fetch("/api/admin/terminales", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terminales }),
      });
      const d = await res.json();
      if (d.ok) onToast(`Terminales guardadas (${d.total}).`);
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setGuardando(false); }
  };

  const HEADERS = ["Sucursal", "Tipo", "Número de serie", "Cuenta"];
  const datos = (): string[][] => rows.map((r) => [nombreSucursal(r.sucursal_id), r.tipo, r.numero_serie, r.cuenta]);
  const exportarExcel = () => descargarExcel("terminales", "Terminales de pago", HEADERS, datos());
  const exportarPDF = () => { if (!imprimirPDF("Terminales de pago", HEADERS, datos())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Terminales</h2><p>Catálogo de terminales de pago. Filtra y ordena por cualquier columna.</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={agregar}>+ Terminal</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <>
          <DataGrid columns={columnas} rows={rows} onEdit={editar} onRemove={quitar} />
          <div className="portada__acciones" style={{ marginTop: "1rem" }}>
            <button className="btn btn--negro" type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar terminales"}</button>
          </div>
        </>
      )}
    </section>
  );
}
