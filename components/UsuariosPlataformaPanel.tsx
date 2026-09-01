"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";
import DataGrid, { GridColumn, GridRow } from "@/components/DataGrid";
import RegistroModal from "@/components/RegistroModal";

// Catálogo global de usuarios de plataforma (grid + modal de alta/edición).

interface SucursalRef { id: number; nombre: string }
const PLATAFORMAS = ["Wansoft", "Bonsaif", "Didi", "Rappi", "Uber Eats"];
const TIPOS = ["Usuario", "Administrador"];
const CAMPOS = ["nombre", "plataforma", "usuario", "password", "tipo_usuario", "sucursal_id", "url"] as const;

interface Props { sucursales: SucursalRef[]; onToast: (msg: string) => void }

export default function UsuariosPlataformaPanel({ sucursales, onToast }: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [modal, setModal] = useState<{ editId: number | null; valores: Record<string, string> } | null>(null);
  const nextId = useRef(1);
  const nuevoId = () => nextId.current++;

  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Administrativo",
    [sucursales]
  );

  const columnas: GridColumn[] = useMemo(() => [
    { key: "nombre", label: "Nombre", type: "text", placeholder: "Nombre del titular" },
    { key: "plataforma", label: "Plataforma", type: "select", required: true, options: [{ value: "", label: "— Elige —" }, ...PLATAFORMAS.map((p) => ({ value: p, label: p }))] },
    { key: "usuario", label: "Usuario", type: "text", required: true },
    { key: "password", label: "Password", type: "text", placeholder: "Visible" },
    { key: "tipo_usuario", label: "Tipo de usuario", type: "select", options: TIPOS.map((t) => ({ value: t, label: t })) },
    { key: "sucursal_id", label: "Sucursal", type: "select", options: [{ value: "", label: "Administrativo" }, ...sucursales.map((s) => ({ value: String(s.id), label: s.nombre }))] },
    { key: "url", label: "URL", type: "text", placeholder: "https://…" },
  ], [sucursales]);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const res = await fetch("/api/admin/usuarios-plataforma");
        const d = await res.json();
        if (d.ok) {
          setRows((d.usuarios || []).map((u: any) => ({
            _id: nuevoId(),
            nombre: u.nombre || "", plataforma: u.plataforma || "", usuario: u.usuario || "", password: u.password || "",
            tipo_usuario: u.tipo_usuario || "Usuario", sucursal_id: u.sucursal_id ? String(u.sucursal_id) : "", url: u.url || "",
          })));
        } else onToast(d.error || "No se pudieron cargar los usuarios.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  const persistir = async (next: GridRow[]) => {
    setRows(next);
    const usuarios = next.map((r) => ({ nombre: r.nombre, plataforma: r.plataforma, usuario: r.usuario, password: r.password, tipo_usuario: r.tipo_usuario, sucursal_id: r.sucursal_id, url: r.url }));
    try {
      const res = await fetch("/api/admin/usuarios-plataforma", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuarios }),
      });
      const d = await res.json();
      if (!d.ok) onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión al guardar."); }
  };

  // Autollenar URL al elegir la plataforma, si está vacía, con otra fila de la misma plataforma.
  const alCambiar = (valores: Record<string, string>, key: string) => {
    if (key === "plataforma" && !String(valores.url).trim()) {
      const previa = rows.find((r) => r.plataforma === valores.plataforma && String(r.url).trim());
      if (previa) return { ...valores, url: previa.url };
    }
    return valores;
  };

  const abrirNuevo = () => setModal({ editId: null, valores: { nombre: "", plataforma: "", usuario: "", password: "", tipo_usuario: "Usuario", sucursal_id: "", url: "" } });
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
    onToast(modal?.editId != null ? "Usuario actualizado." : "Usuario agregado.");
  };
  const borrar = (id: number) => {
    if (!confirm("¿Borrar este usuario?")) return;
    persistir(rows.filter((r) => r._id !== id));
    onToast("Usuario borrado.");
  };

  const HEADERS = ["Nombre", "Plataforma", "Usuario", "Password", "Tipo de usuario", "Sucursal", "URL"];
  const datos = (): string[][] => rows.map((r) => [r.nombre, r.plataforma, r.usuario, r.password, r.tipo_usuario, nombreSucursal(r.sucursal_id), r.url]);
  const exportarExcel = () => descargarExcel("usuarios-plataforma", "Usuarios de plataforma", HEADERS, datos());
  const exportarPDF = () => { if (!imprimirPDF("Usuarios de plataforma", HEADERS, datos())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Usuarios Plataforma</h2><p>Accesos a Wansoft y apps de reparto. La contraseña se muestra en claro.</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={abrirNuevo}>+ Usuario</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <DataGrid columns={columnas} rows={rows} onEditar={abrirEditar} onBorrar={borrar} />
      )}

      {modal && (
        <RegistroModal
          titulo={modal.editId != null ? "Editar usuario" : "Nuevo usuario"}
          columns={columnas}
          valores={modal.valores}
          alCambiar={alCambiar}
          onGuardar={guardarModal}
          onCerrar={() => setModal(null)}
        />
      )}
    </section>
  );
}
