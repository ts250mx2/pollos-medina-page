"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";
import DataGrid, { GridColumn, GridRow, displayCelda } from "@/components/DataGrid";
import RegistroModal from "@/components/RegistroModal";

// Catálogo global de terminales de pago (grid + modal de alta/edición).

interface SucursalRef { id: number; nombre: string }
const TIPOS = ["Spin", "Clip", "Mercado Pago"];
const CAMPOS = ["sucursal_id", "tipo", "numero_serie", "cuenta", "notas"] as const;

interface Props { sucursales: SucursalRef[]; onToast: (msg: string) => void }

export default function TerminalesPanel({ sucursales, onToast }: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ editId: number | null; valores: Record<string, string> } | null>(null);
  const nextId = useRef(1);
  const nuevoId = () => nextId.current++;

  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Sin asignar",
    [sucursales]
  );

  const columnas: GridColumn[] = useMemo(() => [
    { key: "sucursal_id", label: "Sucursal", type: "select", options: [{ value: "", label: "Sin asignar" }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))] },
    { key: "tipo", label: "Tipo", type: "select", required: true, options: [{ value: "", label: "— Elige —" }, ...TIPOS.map((t) => ({ value: t, label: t }))] },
    { key: "numero_serie", label: "Número de serie", type: "text", placeholder: "Opcional" },
    { key: "cuenta", label: "Cuenta", type: "text", placeholder: "Opcional" },
    { key: "notas", label: "Notas", type: "text", placeholder: "Opcional" },
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
            tipo: t.tipo || "", numero_serie: t.numero_serie || "", cuenta: t.cuenta || "", notas: t.notas || "",
          })));
        } else onToast(d.error || "No se pudieron cargar las terminales.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  // Persiste la lista completa (reemplazo) y actualiza el estado local.
  const persistir = async (next: GridRow[]) => {
    setRows(next);
    const terminales = next.map((r) => ({ sucursal_id: r.sucursal_id, tipo: r.tipo, numero_serie: r.numero_serie, cuenta: r.cuenta, notas: r.notas }));
    try {
      const res = await fetch("/api/admin/terminales", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ terminales }),
      });
      const d = await res.json();
      if (!d.ok) onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión al guardar."); }
  };

  const abrirNuevo = () => setModal({ editId: null, valores: { sucursal_id: "", tipo: "", numero_serie: "", cuenta: "", notas: "" } });
  const abrirEditar = (id: number) => {
    const r = rows.find((x) => x._id === id);
    if (r) setModal({ editId: id, valores: Object.fromEntries(CAMPOS.map((k) => [k, String(r[k] ?? "")])) });
  };
  const guardarModal = (vals: Record<string, string>) => {
    const next = modal?.editId != null
      ? rows.map((r) => (r._id === modal.editId ? { ...r, ...vals } : r))
      : [...rows, { _id: nuevoId(), ...vals }];
    setModal(null);
    persistir(next);
    onToast(modal?.editId != null ? "Terminal actualizada." : "Terminal agregada.");
  };
  const borrar = (id: number) => {
    if (!confirm("¿Borrar esta terminal?")) return;
    persistir(rows.filter((r) => r._id !== id));
    onToast("Terminal borrada.");
  };

  const HEADERS = ["Sucursal", "Tipo", "Número de serie", "Cuenta", "Notas"];
  const datos = (): string[][] => rows.map((r) => [nombreSucursal(r.sucursal_id), displayCelda(r, columnas[1]), r.numero_serie, r.cuenta, r.notas]);
  const exportarExcel = () => descargarExcel("terminales", "Terminales de pago", HEADERS, datos());
  const exportarPDF = () => { if (!imprimirPDF("Terminales de pago", HEADERS, datos())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Terminales</h2><p>Catálogo de terminales de pago. Busca y ordena por cualquier columna.</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={abrirNuevo}>+ Terminal</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <DataGrid columns={columnas} rows={rows} onEditar={abrirEditar} onBorrar={borrar} />
      )}

      {modal && (
        <RegistroModal
          titulo={modal.editId != null ? "Editar terminal" : "Nueva terminal"}
          columns={columnas}
          valores={modal.valores}
          onGuardar={guardarModal}
          onCerrar={() => setModal(null)}
        />
      )}
    </section>
  );
}
