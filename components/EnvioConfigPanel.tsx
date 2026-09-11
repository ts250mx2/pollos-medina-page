"use client";

import React, { useEffect, useState } from "react";

// Configuración del envío a domicilio (zonas por km + cobertura), en el panel admin.

interface Zona { hasta_km: string; precio: string }
interface Props { onToast: (msg: string) => void }

export default function EnvioConfigPanel({ onToast }: Props) {
  const [activo, setActivo] = useState(true);
  const [cobertura, setCobertura] = useState("8");
  const [zonas, setZonas] = useState<Zona[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/envio");
        const d = await res.json();
        if (d.ok) {
          setActivo(Boolean(d.envio.activo));
          setCobertura(String(d.envio.cobertura_km ?? 8));
          setZonas((d.envio.zonas || []).map((z: any) => ({ hasta_km: String(z.hasta_km), precio: String(z.precio) })));
        }
      } catch { onToast("No se pudo cargar la config de envío."); }
      finally { setCargando(false); }
    })();
  }, [onToast]);

  const setZona = (i: number, k: keyof Zona, v: string) =>
    setZonas((prev) => prev.map((z, j) => (j === i ? { ...z, [k]: v } : z)));

  const guardar = async () => {
    setGuardando(true);
    try {
      const payload = {
        activo,
        cobertura_km: Number(cobertura) || 0,
        zonas: zonas
          .map((z) => ({ hasta_km: Number(z.hasta_km) || 0, precio: Number(z.precio) || 0 }))
          .filter((z) => z.hasta_km > 0),
      };
      const res = await fetch("/api/admin/envio", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (d.ok) onToast("Config de envío guardada.");
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setGuardando(false); }
  };

  if (cargando) return <div className="ws-panel"><p className="ws-vacio">Cargando envío…</p></div>;

  return (
    <div className="ws-panel">
      <div className="ws-panel__head">
        <div>
          <div className="ws-panel__titulo">Envío a domicilio</div>
          <div className="ws-panel__sub">Zonas por distancia y cobertura. Pollito calcula la sucursal más cercana al cliente.</div>
        </div>
      </div>

      <label className="campo campo--check" style={{ marginBottom: "0.8rem" }}>
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        <span>Servicio a domicilio activo</span>
      </label>

      <label className="campo" style={{ maxWidth: 260, marginBottom: "1rem" }}>
        <span>Cobertura máxima (km)</span>
        <input type="number" step="0.5" min="0" value={cobertura} onChange={(e) => setCobertura(e.target.value)} />
      </label>

      <div className="ws-panel__sub" style={{ marginBottom: "0.4rem" }}>Zonas (hasta X km → precio). Se aplica la primera zona que cubra la distancia.</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {zonas.map((z, i) => (
          <div key={i} style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
            <label className="campo"><span>Hasta (km)</span>
              <input type="number" step="0.5" min="0" value={z.hasta_km} onChange={(e) => setZona(i, "hasta_km", e.target.value)} />
            </label>
            <label className="campo"><span>Precio ($)</span>
              <input type="number" step="1" min="0" value={z.precio} onChange={(e) => setZona(i, "precio", e.target.value)} />
            </label>
            <button className="btn btn--peligro btn--sm" type="button" style={{ height: 42 }} onClick={() => setZonas((p) => p.filter((_, j) => j !== i))} aria-label="Quitar zona">✕</button>
          </div>
        ))}
        {!zonas.length && <p className="ws-vacio">Sin zonas. Agrega al menos una.</p>}
      </div>

      <div className="portada__acciones" style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
        <button className="btn btn--fantasma" type="button" onClick={() => setZonas((p) => [...p, { hasta_km: "", precio: "" }])}>+ Zona</button>
        <button className="btn btn--rojo" type="button" onClick={guardar} disabled={guardando}>{guardando ? "Guardando…" : "Guardar envío"}</button>
      </div>
    </div>
  );
}
