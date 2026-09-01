"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";
import DataGrid, { GridColumn, GridRow } from "@/components/DataGrid";

// Catálogo global de usuarios de plataforma (grid con filtros y ordenamiento).

interface SucursalRef { id: number; nombre: string }

const PLATAFORMAS = ["Wansoft", "Bonsaif", "Didi", "Rappi", "Uber Eats"];
const TIPOS = ["Usuario", "Administrador"];

interface Props {
  sucursales: SucursalRef[];
  onToast: (msg: string) => void;
}

export default function UsuariosPlataformaPanel({ sucursales, onToast }: Props) {
  const [rows, setRows] = useState<GridRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const nextId = useRef(1);

  const nuevoId = () => nextId.current++;
  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Administrativo",
    [sucursales]
  );

  const columnas: GridColumn[] = useMemo(() => [
    { key: "plataforma", label: "Plataforma", type: "select", options: [{ value: "", label: "— Elige —" }, ...PLATAFORMAS.map((p) => ({ value: p, label: p }))] },
    { key: "usuario", label: "Usuario", type: "text" },
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
            plataforma: u.plataforma || "", usuario: u.usuario || "", password: u.password || "",
            tipo_usuario: u.tipo_usuario || "Usuario", sucursal_id: u.sucursal_id ? String(u.sucursal_id) : "", url: u.url || "",
          })));
        } else onToast(d.error || "No se pudieron cargar los usuarios.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  const editar = (id: number, key: string, valor: string) =>
    setRows((prev) => prev.map((r) => {
      if (r._id !== id) return r;
      const fila = { ...r, [key]: valor };
      // Autollenar URL al elegir la plataforma, si está vacía, con otra fila de la misma plataforma.
      if (key === "plataforma" && !String(fila.url).trim()) {
        const previa = prev.find((x) => x._id !== id && x.plataforma === valor && String(x.url).trim());
        if (previa) fila.url = previa.url;
      }
      return fila;
    }));
  const quitar = (id: number) => setRows((prev) => prev.filter((r) => r._id !== id));
  const agregar = () => setRows((prev) => [...prev, { _id: nuevoId(), plataforma: "", usuario: "", password: "", tipo_usuario: "Usuario", sucursal_id: "", url: "" }]);

  const guardar = async () => {
    if (rows.some((r) => !String(r.plataforma).trim())) { onToast("Cada usuario necesita una plataforma."); return; }
    if (rows.some((r) => !String(r.usuario).trim())) { onToast("Cada usuario necesita el nombre de usuario."); return; }
    setGuardando(true);
    try {
      const usuarios = rows.map((r) => ({ plataforma: r.plataforma, usuario: r.usuario, password: r.password, tipo_usuario: r.tipo_usuario, sucursal_id: r.sucursal_id, url: r.url }));
      const res = await fetch("/api/admin/usuarios-plataforma", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ usuarios }),
      });
      const d = await res.json();
      if (d.ok) onToast(`Usuarios guardados (${d.total}).`);
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setGuardando(false); }
  };

  const HEADERS = ["Plataforma", "Usuario", "Password", "Tipo de usuario", "Sucursal", "URL"];
  const datos = (): string[][] => rows.map((r) => [r.plataforma, r.usuario, r.password, r.tipo_usuario, nombreSucursal(r.sucursal_id), r.url]);
  const exportarExcel = () => descargarExcel("usuarios-plataforma", "Usuarios de plataforma", HEADERS, datos());
  const exportarPDF = () => { if (!imprimirPDF("Usuarios de plataforma", HEADERS, datos())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Usuarios Plataforma</h2><p>Accesos a Wansoft y apps de reparto. Filtra y ordena por cualquier columna. La contraseña se muestra en claro.</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={agregar}>+ Usuario</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <>
          <DataGrid columns={columnas} rows={rows} onEdit={editar} onRemove={quitar} />
          <div className="portada__acciones" style={{ marginTop: "1rem" }}>
            <button className="btn btn--negro" type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar usuarios"}</button>
          </div>
        </>
      )}
    </section>
  );
}
