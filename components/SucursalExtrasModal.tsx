"use client";

import React, { useState, useEffect } from "react";

// ============================================================
//  Terminales de pago + usuarios Wansoft de una sucursal
//  Consume /api/admin/sucursales/[id]/extras (GET + PUT reemplaza todo)
// ============================================================

interface Terminal { tipo: string; numero_serie: string; cuenta_deposito: string }
interface UsuarioW { tipo: string; usuario: string; password: string }

interface Props {
  sucursal: { id: number; nombre: string };
  onClose: () => void;
  onToast: (msg: string) => void;
}

const TIPOS_TERMINAL = ["Spin", "Clip", "Mercado Pago"];
const terminalVacia = (): Terminal => ({ tipo: "", numero_serie: "", cuenta_deposito: "" });
const usuarioVacio = (): UsuarioW => ({ tipo: "", usuario: "", password: "" });

export default function SucursalExtrasModal({ sucursal, onClose, onToast }: Props) {
  const [terminales, setTerminales] = useState<Terminal[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioW[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const res = await fetch(`/api/admin/sucursales/${sucursal.id}/extras`);
        const d = await res.json();
        if (d.ok) {
          setTerminales((d.terminales || []).map((t: any) => ({ tipo: t.tipo || "", numero_serie: t.numero_serie || "", cuenta_deposito: t.cuenta_deposito || "" })));
          setUsuarios((d.usuarios || []).map((u: any) => ({ tipo: u.tipo || "", usuario: u.usuario || "", password: u.password || "" })));
        } else {
          onToast(d.error || "No se pudieron cargar los datos.");
        }
      } catch {
        onToast("Error de conexión.");
      } finally {
        setCargando(false);
      }
    })();
  }, [sucursal.id, onToast]);

  const setTerminal = (i: number, campo: keyof Terminal, valor: string) =>
    setTerminales((prev) => prev.map((t, j) => (j === i ? { ...t, [campo]: valor } : t)));
  const setUsuario = (i: number, campo: keyof UsuarioW, valor: string) =>
    setUsuarios((prev) => prev.map((u, j) => (j === i ? { ...u, [campo]: valor } : u)));

  const guardar = async () => {
    // Validación mínima: no mandar filas sin lo esencial.
    if (terminales.some((t) => !t.tipo.trim())) { onToast("Cada terminal necesita un tipo."); return; }
    if (usuarios.some((u) => !u.usuario.trim())) { onToast("Cada usuario Wansoft necesita el nombre de usuario."); return; }
    setGuardando(true);
    try {
      const res = await fetch(`/api/admin/sucursales/${sucursal.id}/extras`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terminales, usuarios }),
      });
      const d = await res.json();
      if (d.ok) { onToast("Terminales y usuarios guardados."); onClose(); }
      else onToast(d.error || "No se pudo guardar.");
    } catch {
      onToast("Error de conexión.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__fondo" onClick={onClose} />
      <div className="modal__caja" style={{ width: "min(820px, 100%)" }}>
        <header className="modal__head">
          <h3>Terminales y usuarios · {sucursal.nombre}</h3>
          <button className="modal__cerrar" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal__cuerpo">
          {cargando ? (
            <p className="ws-vacio">Cargando…</p>
          ) : (
            <>
              {/* ---------- Terminales ---------- */}
              <div className="ws-panel">
                <div className="ws-panel__head">
                  <div><div className="ws-panel__titulo">Terminales de pago</div></div>
                  <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setTerminales((p) => [...p, terminalVacia()])}>+ Terminal</button>
                </div>
                <div className="ws-grid-edit">
                  {terminales.map((t, i) => (
                    <div className="ws-grid-edit__fila" key={i}>
                      <label className="campo"><span>Tipo</span>
                        <input list="tipos-terminal" value={t.tipo} onChange={(e) => setTerminal(i, "tipo", e.target.value)} placeholder="Spin / Clip / Mercado Pago" />
                      </label>
                      <label className="campo"><span>Número de serie</span>
                        <input value={t.numero_serie} onChange={(e) => setTerminal(i, "numero_serie", e.target.value)} placeholder="Opcional" />
                      </label>
                      <label className="campo"><span>Cuenta a depositar</span>
                        <input value={t.cuenta_deposito} onChange={(e) => setTerminal(i, "cuenta_deposito", e.target.value)} placeholder="Opcional" />
                      </label>
                      <button className="btn btn--peligro btn--sm ws-grid-edit__quitar" type="button" onClick={() => setTerminales((p) => p.filter((_, j) => j !== i))} aria-label="Quitar terminal">✕</button>
                    </div>
                  ))}
                  {!terminales.length && <p className="ws-vacio">Sin terminales. Usa “+ Terminal”.</p>}
                </div>
                <datalist id="tipos-terminal">{TIPOS_TERMINAL.map((x) => <option key={x} value={x} />)}</datalist>
              </div>

              {/* ---------- Usuarios Wansoft ---------- */}
              <div className="ws-panel">
                <div className="ws-panel__head">
                  <div><div className="ws-panel__titulo">Usuarios Wansoft</div><div className="ws-panel__sub">La contraseña se guarda y se muestra en claro (para consulta).</div></div>
                  <button className="btn btn--fantasma btn--sm" type="button" onClick={() => setUsuarios((p) => [...p, usuarioVacio()])}>+ Usuario</button>
                </div>
                <div className="ws-grid-edit">
                  {usuarios.map((u, i) => (
                    <div className="ws-grid-edit__fila" key={i}>
                      <label className="campo"><span>Tipo de usuario</span>
                        <input value={u.tipo} onChange={(e) => setUsuario(i, "tipo", e.target.value)} placeholder="Ej. Cajero, Gerente" />
                      </label>
                      <label className="campo"><span>Usuario</span>
                        <input value={u.usuario} onChange={(e) => setUsuario(i, "usuario", e.target.value)} placeholder="Usuario de Wansoft" />
                      </label>
                      <label className="campo"><span>Contraseña</span>
                        <input value={u.password} onChange={(e) => setUsuario(i, "password", e.target.value)} placeholder="Visible" />
                      </label>
                      <button className="btn btn--peligro btn--sm ws-grid-edit__quitar" type="button" onClick={() => setUsuarios((p) => p.filter((_, j) => j !== i))} aria-label="Quitar usuario">✕</button>
                    </div>
                  ))}
                  {!usuarios.length && <p className="ws-vacio">Sin usuarios. Usa “+ Usuario”.</p>}
                </div>
              </div>
            </>
          )}
        </div>
        <footer className="modal__pie">
          <button className="btn btn--fantasma" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn--rojo" type="button" onClick={guardar} disabled={guardando || cargando}>{guardando ? "Guardando…" : "Guardar"}</button>
        </footer>
      </div>
    </div>
  );
}
