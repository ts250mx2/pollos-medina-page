"use client";

import React, { useState, useEffect, useCallback } from "react";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-tabla";

// Catálogo global de usuarios de plataformas (Wansoft, apps de reparto, etc.).

interface SucursalRef { id: number; nombre: string }
interface Fila {
  plataforma: string; usuario: string; password: string;
  tipo_usuario: string; sucursal_id: string; url: string;
}

const PLATAFORMAS = ["Wansoft", "Bonsaif", "Didi", "Rappi", "Uber Eats"];
const TIPOS = ["Usuario", "Administrador"];
const filaVacia = (): Fila => ({ plataforma: "", usuario: "", password: "", tipo_usuario: "Usuario", sucursal_id: "", url: "" });

interface Props {
  sucursales: SucursalRef[];
  onToast: (msg: string) => void;
}

export default function UsuariosPlataformaPanel({ sucursales, onToast }: Props) {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const nombreSucursal = useCallback(
    (id: string) => sucursales.find((s) => String(s.id) === String(id))?.nombre || "Administrativo",
    [sucursales]
  );

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const res = await fetch("/api/admin/usuarios-plataforma");
        const d = await res.json();
        if (d.ok) {
          setFilas((d.usuarios || []).map((u: any) => ({
            plataforma: u.plataforma || "", usuario: u.usuario || "", password: u.password || "",
            tipo_usuario: u.tipo_usuario || "Usuario", sucursal_id: u.sucursal_id ? String(u.sucursal_id) : "", url: u.url || "",
          })));
        } else onToast(d.error || "No se pudieron cargar los usuarios.");
      } catch { onToast("Error de conexión."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  // Busca en las filas ya capturadas una URL para esa plataforma + tipo de usuario.
  const urlPrevia = (filasActuales: Fila[], plataforma: string, tipo: string): string => {
    const match = filasActuales.find((f) => f.plataforma === plataforma && f.tipo_usuario === tipo && f.url.trim());
    return match ? match.url : "";
  };

  const set = (i: number, campo: keyof Fila, valor: string) =>
    setFilas((prev) => {
      const next = prev.map((f, j) => (j === i ? { ...f, [campo]: valor } : f));
      // Autollenar URL cuando cambian plataforma o tipo y la URL está vacía.
      if (campo === "plataforma" || campo === "tipo_usuario") {
        const f = next[i];
        if (!f.url.trim()) {
          const sugerida = urlPrevia(next, f.plataforma, f.tipo_usuario);
          if (sugerida) next[i] = { ...f, url: sugerida };
        }
      }
      return next;
    });

  const guardar = async () => {
    if (filas.some((f) => !f.plataforma.trim())) { onToast("Cada usuario necesita una plataforma."); return; }
    if (filas.some((f) => !f.usuario.trim())) { onToast("Cada usuario necesita el nombre de usuario."); return; }
    setGuardando(true);
    try {
      const res = await fetch("/api/admin/usuarios-plataforma", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuarios: filas }),
      });
      const d = await res.json();
      if (d.ok) onToast(`Usuarios guardados (${d.total}).`);
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setGuardando(false); }
  };

  const datosExport = (): string[][] =>
    filas.map((f) => [f.plataforma, f.usuario, f.password, f.tipo_usuario, nombreSucursal(f.sucursal_id), f.url]);
  const HEADERS = ["Plataforma", "Usuario", "Password", "Tipo de usuario", "Sucursal", "Url"];
  const exportarExcel = () => descargarExcel("usuarios-plataforma", "Usuarios de plataforma", HEADERS, datosExport());
  const exportarPDF = () => { if (!imprimirPDF("Usuarios de plataforma", HEADERS, datosExport())) onToast("El navegador bloqueó la impresión."); };

  return (
    <section className="vista">
      <div className="vista__head">
        <div><h2>Usuarios Plataforma</h2><p>Accesos a Wansoft y apps de reparto. La contraseña se muestra en claro (informativo).</p></div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" type="button" onClick={exportarExcel}>⬇ Excel</button>
          <button className="btn btn--fantasma" type="button" onClick={exportarPDF}>🖨 PDF</button>
          <button className="btn btn--rojo" type="button" onClick={() => setFilas((p) => [...p, filaVacia()])}>+ Usuario</button>
        </div>
      </div>

      {cargando ? <p className="ws-vacio">Cargando…</p> : (
        <>
          <div className="cat-grid">
            {filas.map((f, i) => (
              <div className="cat-fila cat-fila--user" key={i}>
                <label className="campo"><span>Plataforma</span>
                  <select value={f.plataforma} onChange={(e) => set(i, "plataforma", e.target.value)}>
                    <option value="">— Elige —</option>
                    {PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
                <label className="campo"><span>Usuario</span>
                  <input value={f.usuario} onChange={(e) => set(i, "usuario", e.target.value)} />
                </label>
                <label className="campo"><span>Password</span>
                  <input value={f.password} onChange={(e) => set(i, "password", e.target.value)} placeholder="Visible" />
                </label>
                <label className="campo"><span>Tipo de usuario</span>
                  <select value={f.tipo_usuario} onChange={(e) => set(i, "tipo_usuario", e.target.value)}>
                    {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </label>
                <label className="campo"><span>Sucursal</span>
                  <select value={f.sucursal_id} onChange={(e) => set(i, "sucursal_id", e.target.value)}>
                    <option value="">Administrativo</option>
                    {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </label>
                <label className="campo"><span>URL</span>
                  <input value={f.url} onChange={(e) => set(i, "url", e.target.value)} placeholder="https://…" />
                </label>
                <button className="btn btn--peligro btn--sm ws-grid-edit__quitar" type="button" onClick={() => setFilas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar">✕</button>
              </div>
            ))}
            {!filas.length && <p className="ws-vacio">Sin usuarios. Usa “+ Usuario”.</p>}
          </div>
          <div className="portada__acciones" style={{ marginTop: "1rem" }}>
            <button className="btn btn--negro" type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar usuarios"}</button>
          </div>
        </>
      )}
    </section>
  );
}
