"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Item { producto: string; cantidad: number; precio_unitario: number; opciones?: string | null; notas?: string | null }
interface Pedido {
  id: number; folio: string; cliente_nombre: string; cliente_telefono: string | null;
  tipo: "domicilio" | "recoger"; direccion: string | null; sucursal_nombre?: string | null;
  items: Item[]; subtotal: number; envio: number; total: number; forma_pago: string | null; notas: string | null; estado: string; creado_en: string;
}

const COLUMNAS: { estado: string; titulo: string }[] = [
  { estado: "nuevo", titulo: "Nuevos" },
  { estado: "preparando", titulo: "Preparando" },
  { estado: "listo", titulo: "Listos" },
  { estado: "entregado", titulo: "Entregados" },
];
const SIGUIENTE: Record<string, { estado: string; label: string } | undefined> = {
  nuevo: { estado: "preparando", label: "Preparar" },
  preparando: { estado: "listo", label: "Listo" },
  listo: { estado: "entregado", label: "Entregar" },
};
const money = (n: number) => `$${Number(n || 0).toFixed(0)}`;
const hora = (s: string) => (s && s.length >= 16 ? s.slice(11, 16) : "");

export default function PedidosGestion() {
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/pedidos", { cache: "no-store" });
      if (res.status === 401) { router.refresh(); return; }
      const d = await res.json();
      if (d.ok) { setPedidos(d.pedidos || []); setError(""); }
      else setError(d.error || "No se pudieron cargar los pedidos.");
    } catch {
      setError("Sin conexión con el servidor.");
    } finally {
      setCargado(true);
    }
  }, [router]);

  useEffect(() => {
    cargar();
    timer.current = setInterval(cargar, 15000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [cargar]);

  const cambiar = async (id: number, estado: string) => {
    // Optimista: mueve la tarjeta ya y confirma con el servidor.
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    try {
      await fetch("/api/pedidos", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado }),
      });
    } finally {
      cargar();
    }
  };

  const salir = async () => {
    await fetch("/api/pedidos/logout", { method: "POST" }).catch(() => {});
    router.refresh();
  };

  const porEstado = (estado: string) => pedidos.filter((p) => p.estado === estado);

  return (
    <div className="ped-body">
      <header className="ped-top">
        <strong>🐔 Pedidos · Pollo Medina</strong>
        <div className="ped-top__sp">
          <span className="ped-top__vivo">{cargado ? `Se actualiza solo · ${porEstado("nuevo").length} nuevos` : "Cargando…"}</span>
          <button className="ped-btn ped-btn--sm ped-btn--fantasma" onClick={cargar} type="button">↻ Actualizar</button>
          <button className="ped-btn ped-btn--sm" onClick={salir} type="button">Salir</button>
        </div>
      </header>

      {error && <p className="ped-vacio" style={{ color: "var(--pm-rojo-osc)" }}>{error}</p>}

      <div className="ped-tablero">
        {COLUMNAS.map((col) => {
          const lista = porEstado(col.estado);
          return (
            <section key={col.estado} className={`ped-col ped-col--${col.estado}`}>
              <div className="ped-col__head"><span>{col.titulo}</span><span className="ped-col__count">{lista.length}</span></div>
              <div className="ped-col__body">
                {lista.map((p) => {
                  const sig = SIGUIENTE[p.estado];
                  return (
                    <article className="ped-card" key={p.id}>
                      <div className="ped-card__top">
                        <span className="ped-card__folio">{p.folio}</span>
                        <span className="ped-card__hora">{hora(p.creado_en)}</span>
                      </div>
                      <p className="ped-card__cliente">
                        {p.cliente_nombre}{p.cliente_telefono ? ` · ${p.cliente_telefono}` : ""}
                      </p>
                      <div>
                        <span className={`ped-chip ${p.tipo === "domicilio" ? "ped-chip--domicilio" : ""}`}>
                          {p.tipo === "domicilio" ? "🛵 Domicilio" : "🏪 Recoger"}
                        </span>{" "}
                        {p.sucursal_nombre && <span className="ped-chip">{p.sucursal_nombre}</span>}
                      </div>
                      {p.tipo === "domicilio" && p.direccion && <p className="ped-card__notas">📍 {p.direccion}</p>}
                      <ul className="ped-card__items">
                        {p.items.map((it, i) => (
                          <li key={i}>
                            <span>{it.cantidad}× {it.producto}{it.opciones ? <small> · {it.opciones}</small> : null}{it.notas ? <small> · {it.notas}</small> : null}</span>
                            <span>{money(it.precio_unitario * it.cantidad)}</span>
                          </li>
                        ))}
                      </ul>
                      {p.envio > 0 && (
                        <div className="ped-card__envio">
                          <span>Subtotal {money(p.subtotal)}</span>
                          <span>Envío {money(p.envio)}</span>
                        </div>
                      )}
                      <div className="ped-card__total"><span>Total</span><span>{money(p.total)}</span></div>
                      {p.forma_pago && <p className="ped-card__notas">💵 Pago: {p.forma_pago}</p>}
                      {p.notas && <p className="ped-card__notas">📝 {p.notas}</p>}
                      <div className="ped-card__acc">
                        {sig && <button className="ped-btn ped-btn--sm" type="button" onClick={() => cambiar(p.id, sig.estado)}>{sig.label}</button>}
                        {p.estado !== "entregado" && (
                          <button className="ped-btn ped-btn--sm ped-btn--fantasma" type="button" onClick={() => cambiar(p.id, "cancelado")}>Cancelar</button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {cargado && !lista.length && <p className="ped-vacio">Sin pedidos.</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
