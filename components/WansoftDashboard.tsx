"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";

// ============================================================
//  Dashboard Wansoft — módulo del panel de administración
//  Consume /api/admin/wansoft/*  (ventas consolidadas por sucursal/día)
// ============================================================

const money = (n: number, dec = 0) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n || 0);
const moneyK = (n: number) => (Math.abs(n) >= 1000 ? "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + "k" : "$" + Math.round(n));
const numero = (n: number) => new Intl.NumberFormat("es-MX").format(Math.round(n || 0));
const nombreMes = (mes: string) => {
  if (!/^\d{4}-\d{2}$/.test(mes)) return mes;
  const [a, m] = mes.split("-").map(Number);
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  return `${meses[m - 1]} ${a}`;
};
const diaCorto = (fecha: string) => (fecha ? fecha.slice(8, 10) : "");
const diaSemana = (fecha: string) =>
  fecha ? new Date(fecha + "T00:00:00").toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "") : "";

interface Props {
  onToast: (msg: string) => void;
}

type SubTab = "resumen" | "detalle" | "cargar" | "conexion";
type Modo = "dia" | "semana" | "mes" | "rango";

const pad2 = (n: number) => String(n).padStart(2, "0");
const isoDe = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const sumaDias = (iso: string, n: number) => {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return isoDe(d);
};
const lunesDe = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return sumaDias(iso, -((d.getDay() + 6) % 7));
};
const fechaLarga = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
};
const fechaCorta = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
};

interface Rango { desde: string; hasta: string; etiqueta: string }

function calcularRango(modo: Modo, s: { dia: string; semanaRef: string; mes: string; rDesde: string; rHasta: string }): Rango {
  if (modo === "dia") return { desde: s.dia, hasta: s.dia, etiqueta: fechaLarga(s.dia) };
  if (modo === "semana") {
    const lun = lunesDe(s.semanaRef);
    const dom = sumaDias(lun, 6);
    return { desde: lun, hasta: dom, etiqueta: `Semana ${fechaCorta(lun)} – ${fechaCorta(dom)}` };
  }
  if (modo === "mes") {
    const [a, m] = s.mes.split("-").map(Number);
    const u = new Date(a, m, 0).getDate();
    return { desde: `${s.mes}-01`, hasta: `${s.mes}-${pad2(u)}`, etiqueta: nombreMes(s.mes) };
  }
  let d = s.rDesde, h = s.rHasta;
  if (d > h) [d, h] = [h, d];
  return { desde: d, hasta: h, etiqueta: `${fechaCorta(d)} – ${fechaCorta(h)}` };
}

export default function WansoftDashboard({ onToast }: Props) {
  const [sub, setSub] = useState<SubTab>("resumen");
  const [cargando, setCargando] = useState(true);
  const [data, setData] = useState<any>(null);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucFiltro, setSucFiltro] = useState<string>("");
  const [detalle, setDetalle] = useState<{ kind: "producto" | "tipo" | "grupo"; valor: string } | null>(null);

  const hoyISO = useMemo(() => isoDe(new Date()), []);
  const [modo, setModo] = useState<Modo>("mes");
  const [dia, setDia] = useState(hoyISO);
  const [semanaRef, setSemanaRef] = useState(hoyISO);
  const [mes, setMes] = useState(hoyISO.slice(0, 7));
  const [rDesde, setRDesde] = useState(hoyISO.slice(0, 8) + "01");
  const [rHasta, setRHasta] = useState(hoyISO);

  const rango = useMemo(() => calcularRango(modo, { dia, semanaRef, mes, rDesde, rHasta }), [modo, dia, semanaRef, mes, rDesde, rHasta]);

  const cargarDashboard = useCallback(async () => {
    setCargando(true);
    try {
      const qs = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
      if (sucFiltro) qs.set("sucursal", sucFiltro);
      const res = await fetch(`/api/admin/wansoft/dashboard?${qs.toString()}`);
      const d = await res.json();
      if (d.ok) {
        setData(d.dashboard);
        setSucursales(d.sucursales || []);
      }
    } catch (e) {
      console.error(e);
      onToast("No se pudo cargar el dashboard.");
    } finally {
      setCargando(false);
    }
  }, [rango.desde, rango.hasta, sucFiltro, onToast]);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const t = data?.totales;
  const modos: [Modo, string][] = [["dia", "Día"], ["semana", "Semana"], ["mes", "Mes"], ["rango", "Rango"]];

  return (
    <section className="vista">
      <div className="vista__head">
        <div>
          <h2>Dashboard Wansoft</h2>
          <p>Ventas por sucursal y por producto, día por día, desde Wansoft.</p>
        </div>
        <div className="vista__acciones">
          <button className="btn btn--fantasma" onClick={cargarDashboard} type="button">↻ Actualizar</button>
        </div>
      </div>

      <div className="ws">
        <nav className="ws-subnav" role="tablist">
          <button aria-selected={sub === "resumen"} onClick={() => setSub("resumen")}>📊 Resumen</button>
          <button aria-selected={sub === "detalle"} onClick={() => setSub("detalle")}>📋 Detalle diario</button>
          <button aria-selected={sub === "cargar"} onClick={() => setSub("cargar")}>⬆️ Cargar datos</button>
          <button aria-selected={sub === "conexion"} onClick={() => setSub("conexion")}>🔌 Conexión</button>
        </nav>

        {/* Selector de periodo + sucursal (Resumen/Detalle) */}
        {(sub === "resumen" || sub === "detalle") && (
          <div className="ws-periodo">
            <div className="ws-seg" role="tablist" aria-label="Periodo">
              {modos.map(([k, lbl]) => (
                <button key={k} className="ws-seg__btn" aria-selected={modo === k} onClick={() => setModo(k)} type="button">{lbl}</button>
              ))}
            </div>
            <div className="ws-periodo__inputs">
              {modo === "dia" && (
                <label className="campo"><span>Día</span><input type="date" value={dia} max={hoyISO} onChange={(e) => setDia(e.target.value)} /></label>
              )}
              {modo === "semana" && (
                <label className="campo"><span>Semana de</span><input type="date" value={semanaRef} max={hoyISO} onChange={(e) => setSemanaRef(e.target.value)} /></label>
              )}
              {modo === "mes" && (
                <label className="campo"><span>Mes</span><input type="month" value={mes} max={hoyISO.slice(0, 7)} onChange={(e) => setMes(e.target.value)} /></label>
              )}
              {modo === "rango" && (
                <>
                  <label className="campo"><span>Desde</span><input type="date" value={rDesde} max={hoyISO} onChange={(e) => setRDesde(e.target.value)} /></label>
                  <label className="campo"><span>Hasta</span><input type="date" value={rHasta} max={hoyISO} onChange={(e) => setRHasta(e.target.value)} /></label>
                </>
              )}
              <label className="campo"><span>Sucursal</span>
                <select value={sucFiltro} onChange={(e) => setSucFiltro(e.target.value)}>
                  <option value="">Todas las sucursales</option>
                  {sucursales.map((s) => <option key={s.id} value={s.id}>{s.display || s.nombre}</option>)}
                </select>
              </label>
              <div className="ws-spacer" />
              <span className="ws-periodo__etq">{rango.etiqueta}</span>
            </div>
          </div>
        )}

        {cargando && <p className="ws-vacio">Cargando…</p>}

        {!cargando && sub === "resumen" && (
          <ResumenView data={data} t={t} rango={rango} onDetalle={setDetalle} />
        )}
        {!cargando && sub === "detalle" && (
          <DetalleView rango={rango} sucFiltro={sucFiltro} />
        )}
        {sub === "cargar" && (
          <CargarView sucursales={sucursales} onHecho={() => { cargarDashboard(); onToast("Datos actualizados."); }} onToast={onToast} recargarSuc={cargarDashboard} />
        )}
        {sub === "conexion" && <ConexionView sucursales={sucursales} mes={rango.desde.slice(0, 7)} onToast={onToast} onHecho={cargarDashboard} />}
      </div>

      {detalle && <DetalleModal kind={detalle.kind} valor={detalle.valor} rango={rango} sucFiltro={sucFiltro} onClose={() => setDetalle(null)} />}
    </section>
  );
}

// ------------------------------------------------------------
//  RESUMEN
// ------------------------------------------------------------
function ResumenView({ data, t, rango, onDetalle }: { data: any; t: any; rango: Rango; onDetalle: (d: { kind: "producto" | "tipo" | "grupo"; valor: string }) => void }) {
  const [verProductos, setVerProductos] = useState(false);
  const serie = data?.serie || [];
  const porSuc = data?.porSucursal || [];
  const tipos = data?.tipos || [];
  const gruposTreemap = (data?.grupos || []).map((g: any) => ({ nombre: g.etiqueta, total: g.valor, participacion: g.participacion }));
  const productos = data?.productos || [];
  const hayDatos = serie.length > 0 || porSuc.some((s: any) => s.venta_neta > 0);
  const cambio = data?.comparativo?.cambio_neta_pct;

  // Cantidad de transacciones = suma de cuentas en "Ventas por tipo de orden".
  const tiposOrden = data?.tiposOrden || [];
  const transacciones =
    tiposOrden.reduce((s: number, x: any) => s + (x.cantidad2 || 0), 0) ||
    tiposOrden.reduce((s: number, x: any) => s + (x.cantidad || 0), 0);
  // Ticket promedio = venta total (con impuestos) ÷ transacciones.
  const ticketProm = transacciones ? (t?.venta_total || 0) / transacciones : 0;

  if (!hayDatos) {
    return (
      <div className="ws-vacio">
        <div className="ws-vacio__emoji">📭</div>
        <h3 style={{ marginTop: "0.6rem" }}>Sin datos para {rango.etiqueta}</h3>
        <p>Carga la información de ventas en la pestaña <strong>“Cargar datos”</strong> o configura la <strong>conexión</strong> con Wansoft.</p>
      </div>
    );
  }

  return (
    <>
      <div className="ws-kpis">
        <Kpi label="Venta neta del periodo" valor={money(t.venta_neta)} color="rojo"
          pie={cambio == null ? `${data.totales.dias_con_datos} días con datos` : undefined}
          delta={cambio}
          deltaTexto={cambio != null ? "vs periodo anterior" : undefined} />
        <Kpi label="Venta total (con impuestos)" valor={money(t.venta_total)} color="negro" pie={`Bruta: ${money(t.venta_bruta)}`} />
        <Kpi label="Cantidad de transacciones" valor={numero(transacciones)} color="amar" pie={`${numero(t.comensales)} comensales`} />
        <Kpi label="Ticket promedio" valor={money(ticketProm)} color="verde" pie={`Venta total ÷ transacciones · ${money(data.promedioDiario)}/día`} />
      </div>

      <div className="ws-grid">
        <div className="ws-panel">
          <div className="ws-panel__head">
            <div>
              <div className="ws-panel__titulo">Venta neta por día</div>
              <div className="ws-panel__sub">{rango.etiqueta}{data?.mejorDia ? ` · Mejor día: ${data.mejorDia.fecha} (${money(data.mejorDia.venta_neta)})` : ""}</div>
            </div>
          </div>
          <LineaArea serie={serie} />
        </div>

        <ReporteBarras titulo="Ventas por tipo de orden" items={data.tiposOrden} tipo="dinero" extra="cuentas" vistaInicial="pastel" />
      </div>

      <div className="ws-grid">
        <div className="ws-panel">
          <div className="ws-panel__head">
            <div><div className="ws-panel__titulo">Ventas por grupo</div><div className="ws-panel__sub">Tamaño = venta neta · clic en un grupo para ver su detalle</div></div>
          </div>
          <Treemap tipos={gruposTreemap} onTipo={(nom) => onDetalle({ kind: "grupo", valor: nom })} />
        </div>

        <div className="ws-panel">
          <div className="ws-panel__head">
            <div><div className="ws-panel__titulo">Ranking de sucursales</div><div className="ws-panel__sub">Venta neta y participación</div></div>
          </div>
          <div className="ws-barras">
            {porSuc.filter((s: any) => s.venta_neta > 0).map((s: any, i: number) => {
              const max = Math.max(...porSuc.map((x: any) => x.venta_neta), 1);
              return (
                <div className="ws-barra" key={s.id}>
                  <div className="ws-barra__top">
                    <span className="ws-barra__nom">{i + 1}. {s.nombre}</span>
                    <span className="ws-barra__val">{money(s.venta_neta)} · {s.participacion}%</span>
                  </div>
                  <div className="ws-barra__track"><div className="ws-barra__fill" style={{ width: `${(s.venta_neta / max) * 100}%` }} /></div>
                </div>
              );
            })}
            {porSuc.filter((s: any) => s.venta_neta > 0).length === 0 && <p className="ws-vacio">Sin ventas por sucursal.</p>}
          </div>
        </div>
      </div>

      <div className="ws-panel">
        <div className="ws-panel__head">
          <div><div className="ws-panel__titulo">Ranking de productos</div><div className="ws-panel__sub">Top del periodo · haz clic en un producto para ver el detalle</div></div>
          {productos.length > 0 && <button className="ws-vermas" type="button" onClick={() => setVerProductos(true)}>Ver todos ({productos.length}) →</button>}
        </div>
        <RankingProductos productos={productos} onProducto={(p) => onDetalle({ kind: "producto", valor: p })} />
      </div>

      {/* Mapa de calor: ventas por hora y día de la semana */}
      <div className="ws-panel">
        <div className="ws-panel__head">
          <div><div className="ws-panel__titulo">Mapa de calor · ventas por hora y día</div><div className="ws-panel__sub">Venta neta promedio por franja horaria</div></div>
        </div>
        <Heatmap data={data.mapaCalor} />
      </div>

      {/* Reportes dimensionales de Wansoft */}
      <div className="ws-grid3">
        <ReporteBarras titulo="Ventas por tipo de grupo" items={tipos.map((x: any) => ({ etiqueta: x.nombre, valor: x.total, participacion: x.participacion }))} tipo="dinero" />
        <ReporteBarras titulo="Ventas por forma de pago" items={data.formasPagoDet} tipo="dinero" campoValor="total" />
        <ReporteBarras titulo="Ventas por usuario / cajero" items={data.usuarios} tipo="dinero" />
        <ReporteBarras titulo="Ventas por terminal" items={data.terminales} tipo="dinero" />
        <ReporteBarras titulo="Modificadores más usados" items={data.modificadores} tipo="cantidad" />
      </div>

      {verProductos && (
        <ProductosModal
          productos={productos}
          onProducto={(p) => { setVerProductos(false); onDetalle({ kind: "producto", valor: p }); }}
          onClose={() => setVerProductos(false)}
        />
      )}
    </>
  );
}

// Modal con TODOS los productos + buscador
function ProductosModal({ productos, onProducto, onClose }: { productos: any[]; onProducto: (p: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const items = useMemo(() => (productos || []).filter((p) => p.total > 0), [productos]);
  const max = useMemo(() => Math.max(...items.map((p) => p.total), 1), [items]);
  const filtro = q.trim().toLowerCase();
  const lista = filtro
    ? items.filter((p) => (p.producto || "").toLowerCase().includes(filtro) || (p.categoria || "").toLowerCase().includes(filtro))
    : items;

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__fondo" onClick={onClose} />
      <div className="modal__caja" style={{ width: "min(720px, 100%)" }}>
        <header className="modal__head">
          <h3>Ranking de productos · todos <span className="ws-panel__sub">({items.length})</span></h3>
          <button className="modal__cerrar" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal__cuerpo">
          <label className="campo">
            <span>Buscar producto</span>
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Escribe el nombre o la categoría…" />
          </label>
          <div className="ws-rank">
            {lista.map((p, i) => (
              <button key={p.producto} className="ws-rank__fila" onClick={() => onProducto(p.producto)} type="button" title="Ver detalle">
                <span className="ws-rank__num">{i + 1}</span>
                <span className="ws-rank__body">
                  <span className="ws-rank__top">
                    <span className="ws-rank__nom">{p.producto}{p.categoria ? <span className="ws-rank__cat"> · {p.categoria}</span> : null}</span>
                    <span className="ws-rank__val">{money(p.total)} · {numero(p.cantidad)} u · {money(p.cantidad ? p.total / p.cantidad : 0)} tkt</span>
                  </span>
                  <span className="ws-rank__track"><span className="ws-rank__fill" style={{ width: `${(p.total / max) * 100}%` }} /></span>
                </span>
                <span className="ws-rank__go">→</span>
              </button>
            ))}
            {!lista.length && <p className="ws-vacio">Sin coincidencias para “{q}”.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Lista de barras (o pastel) para un reporte dimensional
function ReporteBarras({ titulo, items, tipo, campoValor, extra, vistaInicial = "barras" }: { titulo: string; items: any[]; tipo: "dinero" | "cantidad"; campoValor?: "total" | "subtotal"; extra?: "cuentas"; vistaInicial?: "barras" | "pastel" }) {
  const [vista, setVista] = useState<"barras" | "pastel">(vistaInicial);
  const lista = (items || []).filter((x) => (x.valor || 0) > 0);
  const valorDe = (x: any) => (campoValor ? x[campoValor] : x.valor) || 0;
  const max = Math.max(...lista.map(valorDe), 1);
  const fmt = (v: number) => (tipo === "cantidad" ? `${numero(v)} u` : money(v));
  return (
    <div className="ws-panel">
      <div className="ws-panel__head">
        <div><div className="ws-panel__titulo">{titulo}</div></div>
        {lista.length > 0 && (
          <div className="ws-seg ws-seg--mini" role="tablist" aria-label={`Vista de ${titulo}`}>
            <button className="ws-seg__btn" aria-selected={vista === "barras"} onClick={() => setVista("barras")} type="button">Barras</button>
            <button className="ws-seg__btn" aria-selected={vista === "pastel"} onClick={() => setVista("pastel")} type="button">Pastel</button>
          </div>
        )}
      </div>
      {vista === "pastel" ? (
        <Pastel items={lista.map((x) => ({ etiqueta: x.etiqueta, valor: valorDe(x) }))} tipo={tipo} />
      ) : (
        <div className="ws-barras">
          {lista.slice(0, 10).map((x, i) => (
            <div className="ws-barra" key={x.etiqueta + i}>
              <div className="ws-barra__top">
                <span className="ws-barra__nom">{x.etiqueta}{x.etiqueta2 ? <span className="ws-rank__cat"> · {x.etiqueta2}</span> : null}</span>
                <span className="ws-barra__val">{fmt(valorDe(x))}{x.participacion ? ` · ${x.participacion}%` : ""}{extra === "cuentas" && x.cantidad2 ? ` · ${numero(x.cantidad2)} cta` : ""}</span>
              </div>
              <div className="ws-barra__track"><div className="ws-barra__fill" style={{ width: `${(valorDe(x) / max) * 100}%` }} /></div>
            </div>
          ))}
          {!lista.length && <p className="ws-vacio">Sin datos en el periodo.</p>}
        </div>
      )}
    </div>
  );
}

// Mapa de calor hora × día de la semana
function Heatmap({ data }: { data: { horas: string[]; celdas: Record<string, number>; maximo: number } }) {
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const horas = data?.horas || [];
  const max = data?.maximo || 1;
  if (!horas.length) return <p className="ws-vacio">Sin datos por hora.<br /><small>Se llena con el reporte de ventas por hora.</small></p>;
  const color = (v: number) => {
    if (!v) return "transparent";
    const t = Math.min(1, v / max);
    // interpola crema→amarillo→rojo
    if (t < 0.5) { const k = t / 0.5; return `rgb(${255},${Math.round(240 - k * 46)},${Math.round(200 - k * 186)})`; }
    const k = (t - 0.5) / 0.5; return `rgb(${Math.round(255 - k * 27)},${Math.round(194 - k * 192)},${Math.round(14 + k * 28)})`;
  };
  return (
    <div className="ws-heat-wrap">
      <table className="ws-heat">
        <thead>
          <tr><th></th>{horas.map((h) => <th key={h}>{h.slice(0, 2)}</th>)}</tr>
        </thead>
        <tbody>
          {dias.map((d, dow) => (
            <tr key={d}>
              <th>{d}</th>
              {horas.map((h) => {
                const v = data.celdas[`${dow}|${h}`] || 0;
                return <td key={h} style={{ background: color(v) }} title={`${d} ${h}: ${money(v)}`}>{v && v / max > 0.6 ? "" : ""}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ws-heat-leyenda"><span>Menos</span><span className="ws-heat-grad" /><span>Más venta</span></div>
    </div>
  );
}

// Treemap (rectángulos) por tipo de producto — slice & dice (cobertura total)
interface TmRect { i: number; x: number; y: number; w: number; h: number }
function sliceDice(nodos: { i: number; value: number }[], x: number, y: number, w: number, h: number, horizontal: boolean, out: TmRect[]) {
  if (!nodos.length) return;
  if (nodos.length === 1) { out.push({ i: nodos[0].i, x, y, w, h }); return; }
  const total = nodos.reduce((s, d) => s + d.value, 0) || 1;
  let acc = 0;
  let idx = 0;
  for (; idx < nodos.length - 1; idx++) {
    if (acc + nodos[idx].value >= total / 2) { idx++; break; }
    acc += nodos[idx].value;
  }
  idx = Math.max(1, Math.min(nodos.length - 1, idx));
  const a = nodos.slice(0, idx);
  const b = nodos.slice(idx);
  const frac = a.reduce((s, d) => s + d.value, 0) / total;
  if (horizontal) {
    const wA = w * frac;
    sliceDice(a, x, y, wA, h, !horizontal, out);
    sliceDice(b, x + wA, y, w - wA, h, !horizontal, out);
  } else {
    const hA = h * frac;
    sliceDice(a, x, y, w, hA, !horizontal, out);
    sliceDice(b, x, y + hA, w, h - hA, !horizontal, out);
  }
}

function Treemap({ tipos, onTipo }: { tipos: any[]; onTipo?: (nombre: string) => void }) {
  const items = (tipos || []).filter((x) => x.total > 0).sort((a, b) => b.total - a.total);
  if (!items.length) return <p className="ws-vacio" style={{ padding: "1.5rem 0" }}>Sin datos de tipos de producto.<br /><small>Se llena con el reporte por tipo de grupo.</small></p>;
  const colores = ["#e4022a", "#ffc20e", "#1f9d55", "#1a1512", "#b80020", "#e08b00", "#2e7d32", "#5a4a42"];
  const total = items.reduce((s, x) => s + x.total, 0);
  const rects: TmRect[] = [];
  sliceDice(items.map((x, i) => ({ i, value: x.total })), 0, 0, 100, 100, true, rects);
  return (
    <div className="ws-treemap" role="group" aria-label="Ventas por tipo de producto">
      {rects.map((r) => {
        const it = items[r.i];
        const part = total ? Math.round((it.total / total) * 100) : 0;
        const grande = r.w >= 18 && r.h >= 16;
        return (
          <button key={it.nombre} className="ws-tm" onClick={() => onTipo?.(it.nombre)} type="button"
            style={{ left: `${r.x}%`, top: `${r.y}%`, width: `${r.w}%`, height: `${r.h}%`, background: colores[r.i % colores.length], cursor: onTipo ? "pointer" : "default" }}
            title={onTipo ? `${it.nombre}: ${money(it.total)} (${part}%) — clic para detalle` : `${it.nombre}: ${money(it.total)} (${part}%)`}>
            <div className="ws-tm__in">
              <div className="ws-tm__nom">{it.nombre}</div>
              {grande && <div className="ws-tm__val">{moneyK(it.total)} · {part}%</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// Ranking de productos con barras + clic para detalle
function RankingProductos({ productos, onProducto }: { productos: any[]; onProducto: (p: string) => void }) {
  const items = (productos || []).filter((p) => p.total > 0);
  if (!items.length) return <p className="ws-vacio">Sin datos de productos en el periodo.</p>;
  const max = Math.max(...items.map((p) => p.total), 1);
  return (
    <div className="ws-rank">
      {items.slice(0, 15).map((p, i) => (
        <button key={p.producto} className="ws-rank__fila" onClick={() => onProducto(p.producto)} type="button" title="Ver detalle">
          <span className="ws-rank__num">{i + 1}</span>
          <span className="ws-rank__body">
            <span className="ws-rank__top">
              <span className="ws-rank__nom">{p.producto}{p.categoria ? <span className="ws-rank__cat"> · {p.categoria}</span> : null}</span>
              <span className="ws-rank__val">{money(p.total)} · {numero(p.cantidad)} u · {money(p.cantidad ? p.total / p.cantidad : 0)} tkt</span>
            </span>
            <span className="ws-rank__track"><span className="ws-rank__fill" style={{ width: `${(p.total / max) * 100}%` }} /></span>
          </span>
          <span className="ws-rank__go">→</span>
        </button>
      ))}
    </div>
  );
}

// Modal de detalle de un producto, un tipo o un grupo de producto
const DETALLE_BASE: Record<string, string> = {
  producto: "/api/admin/wansoft/productos/detalle",
  tipo: "/api/admin/wansoft/tipos/detalle",
  grupo: "/api/admin/wansoft/grupos/detalle",
};
function DetalleModal({ kind, valor, rango, sucFiltro, onClose }: { kind: "producto" | "tipo" | "grupo"; valor: string; rango: Rango; sucFiltro: string; onClose: () => void }) {
  const [det, setDet] = useState<any>(null);
  const [cargando, setCargando] = useState(true);
  const [vistaProd, setVistaProd] = useState<"barras" | "rect">("barras");

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const qs = new URLSearchParams({ [kind]: valor, desde: rango.desde, hasta: rango.hasta });
        if (sucFiltro) qs.set("sucursal", sucFiltro);
        const res = await fetch(`${DETALLE_BASE[kind]}?${qs.toString()}`);
        const d = await res.json();
        if (d.ok) setDet(d.detalle);
      } finally {
        setCargando(false);
      }
    })();
  }, [kind, valor, rango.desde, rango.hasta, sucFiltro]);

  const esTipo = kind !== "producto";
  const prefijo = kind === "grupo" ? "Grupo: " : kind === "tipo" ? "Tipo: " : "";

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__fondo" onClick={onClose} />
      <div className="modal__caja" style={{ width: "min(760px, 100%)" }}>
        <header className="modal__head">
          <h3>{prefijo}{valor}</h3>
          <button className="modal__cerrar" type="button" onClick={onClose} aria-label="Cerrar">✕</button>
        </header>
        <div className="modal__cuerpo">
          {cargando && <p className="ws-vacio">Cargando…</p>}
          {!cargando && det && (
            <>
              <div className="ws-kpis" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
                <div className="ws-kpi"><div className="ws-kpi__label">Venta neta en el periodo</div><div className="ws-kpi__valor">{money(det.total)}</div><div className="ws-kpi__pie">{rango.etiqueta}</div></div>
                {!esTipo && <div className="ws-kpi ws-kpi--amar"><div className="ws-kpi__label">Unidades vendidas</div><div className="ws-kpi__valor">{numero(det.cantidad)}</div><div className="ws-kpi__pie">{det.serie?.length || 0} días</div></div>}
                {esTipo && <div className="ws-kpi ws-kpi--amar"><div className="ws-kpi__label">Productos incluidos</div><div className="ws-kpi__valor">{numero((det.productos || []).length)}</div><div className="ws-kpi__pie">{det.serie?.length || 0} días</div></div>}
              </div>

              <div className="ws-panel" style={{ marginTop: "1rem" }}>
                <div className="ws-panel__head"><div><div className="ws-panel__titulo">{kind === "producto" ? "Ventas por día de este producto" : "Venta por día"}</div></div></div>
                <LineaArea serie={(det.serie || []).map((d: any) => ({ fecha: d.fecha, venta_neta: d.total }))} />
              </div>

              {esTipo && det.productos?.length > 0 && (
                <div className="ws-panel" style={{ marginTop: "1rem" }}>
                  <div className="ws-panel__head">
                    <div><div className="ws-panel__titulo">Productos incluidos</div></div>
                    <div className="ws-seg ws-seg--mini" role="tablist" aria-label="Vista de productos">
                      <button className="ws-seg__btn" aria-selected={vistaProd === "barras"} onClick={() => setVistaProd("barras")} type="button">Barras</button>
                      <button className="ws-seg__btn" aria-selected={vistaProd === "rect"} onClick={() => setVistaProd("rect")} type="button">Rectángulos</button>
                    </div>
                  </div>
                  {vistaProd === "rect" ? (
                    <Treemap tipos={det.productos.map((p: any) => ({ nombre: p.producto, total: p.total }))} />
                  ) : (
                    <div className="ws-barras">
                      {det.productos.map((p: any) => {
                        const mx = Math.max(...det.productos.map((x: any) => x.total), 1);
                        return (
                          <div className="ws-barra" key={p.producto}>
                            <div className="ws-barra__top"><span className="ws-barra__nom">{p.producto}</span><span className="ws-barra__val">{money(p.total)} · {numero(p.cantidad)} u</span></div>
                            <div className="ws-barra__track"><div className="ws-barra__fill" style={{ width: `${(p.total / mx) * 100}%` }} /></div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="ws-panel" style={{ marginTop: "1rem" }}>
                <div className="ws-panel__head"><div><div className="ws-panel__titulo">Por sucursal</div></div></div>
                <div className="ws-barras">
                  {(det.porSucursal || []).map((s: any) => {
                    const mx = Math.max(...det.porSucursal.map((x: any) => x.total), 1);
                    return (
                      <div className="ws-barra" key={s.nombre}>
                        <div className="ws-barra__top"><span className="ws-barra__nom">{s.nombre}</span><span className="ws-barra__val">{money(s.total)}{!esTipo ? ` · ${numero(s.cantidad)} u` : ""}</span></div>
                        <div className="ws-barra__track"><div className="ws-barra__fill" style={{ width: `${(s.total / mx) * 100}%` }} /></div>
                      </div>
                    );
                  })}
                  {(!det.porSucursal || !det.porSucursal.length) && <p className="ws-vacio">Sin desglose por sucursal.</p>}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, valor, pie, color, delta, deltaTexto }: { label: string; valor: string; pie?: string; color: string; delta?: number | null; deltaTexto?: string }) {
  const cls = color === "amar" ? "ws-kpi--amar" : color === "verde" ? "ws-kpi--verde" : color === "negro" ? "ws-kpi--negro" : "";
  const deltaCls = delta == null ? "" : delta > 0 ? "ws-delta--up" : delta < 0 ? "ws-delta--down" : "ws-delta--flat";
  return (
    <div className={`ws-kpi ${cls}`}>
      <div className="ws-kpi__label">{label}</div>
      <div className="ws-kpi__valor">{valor}</div>
      <div className="ws-kpi__pie">
        {delta != null && deltaTexto ? (
          <>
            <span className={`ws-delta ${deltaCls}`}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "="} {Math.abs(delta)}%</span>{" "}
            {deltaTexto}
          </>
        ) : (
          pie
        )}
      </div>
    </div>
  );
}

// Gráfica de área + línea en SVG puro
function LineaArea({ serie }: { serie: any[] }) {
  const W = 640, H = 240, P = 30;
  if (!serie.length) return <p className="ws-vacio">Sin datos diarios.</p>;
  const valores = serie.map((d) => d.venta_neta);
  const maxV = Math.max(...valores, 1);
  const n = serie.length;
  const x = (i: number) => P + (n === 1 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (n - 1));
  const y = (v: number) => H - P - (v / maxV) * (H - 2 * P);

  const puntos = serie.map((d, i) => [x(i), y(d.venta_neta)]);
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${linea} L${x(n - 1).toFixed(1)},${H - P} L${x(0).toFixed(1)},${H - P} Z`;
  const gridVals = [0, 0.25, 0.5, 0.75, 1];
  const paso = Math.max(1, Math.floor(n / 12));

  return (
    <svg className="ws-chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Venta neta por día">
      <defs>
        <linearGradient id="wsArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e4022a" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#e4022a" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {gridVals.map((g, i) => {
        const yy = P + g * (H - 2 * P);
        const val = maxV * (1 - g);
        return (
          <g key={i}>
            <line className="grid-line" x1={P} y1={yy} x2={W - P} y2={yy} />
            <text className="eje-txt" x={2} y={yy + 3}>{moneyK(val)}</text>
          </g>
        );
      })}
      <path className="area" d={area} />
      <path className="linea" d={linea} />
      {puntos.map((p, i) => (i % paso === 0 || i === n - 1 ? <circle key={i} className="punto" cx={p[0]} cy={p[1]} r={2.5} /> : null))}
      {serie.map((d, i) => (i % paso === 0 || i === n - 1 ? (
        <text key={i} className="eje-txt" x={x(i)} y={H - P + 12} textAnchor="middle">
          <tspan x={x(i)}>{diaSemana(d.fecha)}</tspan>
          <tspan x={x(i)} dy="10">{diaCorto(d.fecha)}</tspan>
        </text>
      ) : null))}
    </svg>
  );
}

// Paleta compartida para treemap y pastel
const PALETA = ["#e4022a", "#ffc20e", "#1f9d55", "#1a1512", "#b80020", "#e08b00", "#2e7d32", "#5a4a42", "#8a7f77"];

// Camino de un sector de pastel (arco desde el centro)
function arcoPastel(cx: number, cy: number, r: number, a0: number, a1: number) {
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const x0 = cx + r * Math.cos(a0), y0 = cy + r * Math.sin(a0);
  const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
  return `M${cx},${cy} L${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${grande} 1 ${x1.toFixed(2)},${y1.toFixed(2)} Z`;
}

// Gráfica de pastel genérica; agrupa la cola en "Otros" para no saturar.
function Pastel({ items, tipo }: { items: { etiqueta: string; valor: number }[]; tipo: "dinero" | "cantidad" }) {
  const lista = (items || []).filter((x) => x.valor > 0).sort((a, b) => b.valor - a.valor);
  if (!lista.length) return <p className="ws-vacio" style={{ padding: "1.5rem 0" }}>Sin datos en el periodo.</p>;
  const TOPE = 8;
  let datos = lista;
  if (lista.length > TOPE) {
    const otros = lista.slice(TOPE).reduce((s, x) => s + x.valor, 0);
    datos = [...lista.slice(0, TOPE), { etiqueta: "Otros", valor: otros }];
  }
  const total = datos.reduce((s, x) => s + x.valor, 0) || 1;
  const fmt = (v: number) => (tipo === "cantidad" ? `${numero(v)} u` : money(v));
  let ang = -Math.PI / 2;
  const sectores = datos.map((d, i) => {
    const frac = d.valor / total;
    const a0 = ang, a1 = ang + frac * 2 * Math.PI;
    ang = a1;
    return { d, i, path: arcoPastel(70, 70, 60, a0, a1), color: PALETA[i % PALETA.length], pct: Math.round(frac * 100) };
  });
  return (
    <div className="ws-dona-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" role="img" aria-label="Distribución">
        {sectores.map((s) => <path key={s.i} d={s.path} fill={s.color} stroke="#fff" strokeWidth="1" />)}
      </svg>
      <div className="ws-leyenda">
        {sectores.map((s) => (
          <div className="ws-leyenda__item" key={s.d.etiqueta + s.i}>
            <span className="ws-punto" style={{ background: s.color }} />
            <span><strong>{s.d.etiqueta}</strong> — {fmt(s.d.valor)} ({s.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
//  DETALLE (tabla día × sucursal)
// ------------------------------------------------------------
function DetalleView({ rango, sucFiltro }: { rango: Rango; sucFiltro: string }) {
  const [filas, setFilas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    (async () => {
      setCargando(true);
      try {
        const qs = new URLSearchParams({ desde: rango.desde, hasta: rango.hasta });
        if (sucFiltro) qs.set("sucursal", sucFiltro);
        const res = await fetch(`/api/admin/wansoft/ventas?${qs.toString()}`);
        const d = await res.json();
        if (d.ok) setFilas(d.ventas || []);
      } finally {
        setCargando(false);
      }
    })();
  }, [rango.desde, rango.hasta, sucFiltro]);

  if (cargando) return <p className="ws-vacio">Cargando…</p>;
  if (!filas.length) return <p className="ws-vacio"><span className="ws-vacio__emoji">📋</span><br />Sin registros en {rango.etiqueta}.</p>;

  const tot = filas.reduce((a, f) => ({
    neta: a.neta + (f.venta_neta || 0),
    total: a.total + (f.venta_total || 0),
    desc: a.desc + (f.descuentos || 0),
    cuentas: a.cuentas + (f.cuentas || 0),
    comensales: a.comensales + (f.comensales || 0),
  }), { neta: 0, total: 0, desc: 0, cuentas: 0, comensales: 0 });

  return (
    <div className="ws-tabla-wrap">
      <table className="ws-tabla">
        <thead>
          <tr>
            <th className="izq">Fecha</th>
            <th className="izq">Sucursal</th>
            <th>Venta neta</th>
            <th>Descuentos</th>
            <th>Impuestos</th>
            <th>Venta total</th>
            <th>Cuentas</th>
            <th>Comensales</th>
            <th>Ticket prom.</th>
            <th className="izq">Origen</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.id}>
              <td className="izq">{f.fecha}</td>
              <td className="izq">{f.sucursal_nombre}</td>
              <td className="num-fuerte">{money(f.venta_neta || 0)}</td>
              <td>{f.descuentos != null ? money(f.descuentos) : "—"}</td>
              <td>{f.impuestos != null ? money(f.impuestos) : "—"}</td>
              <td>{f.venta_total != null ? money(f.venta_total) : "—"}</td>
              <td>{f.cuentas != null ? numero(f.cuentas) : "—"}</td>
              <td>{f.comensales != null ? numero(f.comensales) : "—"}</td>
              <td>{f.ticket_promedio != null ? money(f.ticket_promedio) : "—"}</td>
              <td className="izq"><span className="chip chip--tag">{f.origen}</span></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="izq" colSpan={2}>Totales ({filas.length} registros)</td>
            <td>{money(tot.neta)}</td>
            <td>{money(tot.desc)}</td>
            <td>—</td>
            <td>{money(tot.total)}</td>
            <td>{numero(tot.cuentas)}</td>
            <td>{numero(tot.comensales)}</td>
            <td>{tot.cuentas ? money(tot.neta / tot.cuentas) : "—"}</td>
            <td className="izq"></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ------------------------------------------------------------
//  CARGAR DATOS (importar CSV / captura manual / sucursales)
// ------------------------------------------------------------
function CargarView({ sucursales, onHecho, onToast, recargarSuc }: { sucursales: any[]; onHecho: () => void; onToast: (m: string) => void; recargarSuc: () => void }) {
  const [csv, setCsv] = useState("");
  const [sucCsv, setSucCsv] = useState("");
  const [fechaCsv, setFechaCsv] = useState("");
  const [resultado, setResultado] = useState<any>(null);
  const [enviando, setEnviando] = useState(false);

  const importar = async () => {
    if (!csv.trim()) { onToast("Pega el contenido del reporte primero."); return; }
    setEnviando(true); setResultado(null);
    try {
      const res = await fetch("/api/admin/wansoft/importar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv, sucursal: sucCsv || undefined, fecha: fechaCsv || undefined }),
      });
      const d = await res.json();
      if (d.ok) { setResultado(d); onHecho(); }
      else onToast(d.error || "No se pudo importar.");
    } catch { onToast("Error de conexión."); }
    finally { setEnviando(false); }
  };

  return (
    <div className="ws" style={{ gap: "1.6rem" }}>
      <div className="ws-panel">
        <div className="ws-panel__head"><div><div className="ws-panel__titulo">Importar del reporte (pegar / CSV)</div><div className="ws-panel__sub">Copia la tabla del reporte de Wansoft (o un Excel/CSV) y pégala aquí.</div></div></div>

        <div className="ws-nota ws-nota--info" style={{ marginBottom: "1rem" }}>
          La primera línea debe ser el <strong>encabezado</strong>. Se reconocen columnas como
          <code>Sucursal</code>, <code>Fecha</code>, <code>Venta neta</code>, <code>Descuentos</code>, <code>Impuestos</code>, <code>Venta total</code>, <code>Cuentas</code>, <code>Comensales</code>, <code>Efectivo</code>, <code>Tarjeta</code>. Acepta tabuladores, comas o punto y coma.
        </div>

        <label className="campo">
          <span>Contenido pegado</span>
          <textarea className="ws-textarea" value={csv} onChange={(e) => setCsv(e.target.value)}
            placeholder={"Sucursal\tFecha\tVenta neta\tDescuentos\tImpuestos\tVenta total\tCuentas\tComensales\nCentro\t2026-08-01\t18500\t420\t2960\t21460\t142\t210"} />
        </label>

        <div className="fila-campos" style={{ marginTop: "0.8rem" }}>
          <label className="campo">
            <span>Sucursal (si el pegado no la trae)</span>
            <input list="ws-suc-list" value={sucCsv} onChange={(e) => setSucCsv(e.target.value)} placeholder="Opcional" />
            <datalist id="ws-suc-list">{sucursales.map((s) => <option key={s.id} value={s.nombre} />)}</datalist>
          </label>
          <label className="campo">
            <span>Fecha (si el pegado no la trae)</span>
            <input type="date" value={fechaCsv} onChange={(e) => setFechaCsv(e.target.value)} />
          </label>
        </div>

        <div className="portada__acciones" style={{ marginTop: "1rem" }}>
          <button className="btn btn--rojo" onClick={importar} disabled={enviando} type="button">{enviando ? "Importando…" : "Importar"}</button>
        </div>

        {resultado && (
          <div className={`ws-nota ${resultado.errores?.length ? "ws-nota--warn" : "ws-nota--ok"}`} style={{ marginTop: "1rem" }}>
            ✔ Insertados: <strong>{resultado.insertados}</strong> · Actualizados: <strong>{resultado.actualizados}</strong> · De {resultado.total} filas.
            {resultado.errores?.length > 0 && (
              <ul style={{ margin: "0.5rem 0 0 1rem" }}>
                {resultado.errores.slice(0, 8).map((e: any, i: number) => <li key={i}>Fila {e.fila}: {e.error}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      <CapturaManual sucursales={sucursales} onHecho={onHecho} onToast={onToast} />
      <SucursalesEditor sucursales={sucursales} recargar={recargarSuc} onToast={onToast} />
    </div>
  );
}

function CapturaManual({ sucursales, onHecho, onToast }: { sucursales: any[]; onHecho: () => void; onToast: (m: string) => void }) {
  const vacio = { sucursal_id: "", fecha: "", venta_neta: "", descuentos: "", impuestos: "", venta_total: "", cuentas: "", comensales: "", efectivo: "", tarjeta: "" };
  const [f, setF] = useState<any>(vacio);
  const [enviando, setEnviando] = useState(false);
  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));

  const guardar = async () => {
    if (!f.sucursal_id || !f.fecha) { onToast("Elige sucursal y fecha."); return; }
    setEnviando(true);
    try {
      const res = await fetch("/api/admin/wansoft/ventas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, origen: "manual" }),
      });
      const d = await res.json();
      if (d.ok) { onToast(`Día ${d.accion}.`); setF({ ...vacio, sucursal_id: f.sucursal_id }); onHecho(); }
      else onToast(d.error || "No se pudo guardar.");
    } catch { onToast("Error de conexión."); }
    finally { setEnviando(false); }
  };

  const campos: [string, string][] = [
    ["venta_neta", "Venta neta"], ["descuentos", "Descuentos"], ["impuestos", "Impuestos (IVA)"],
    ["venta_total", "Venta total"], ["cuentas", "Cuentas"], ["comensales", "Comensales"],
    ["efectivo", "Efectivo"], ["tarjeta", "Tarjeta"],
  ];

  return (
    <div className="ws-panel">
      <div className="ws-panel__head"><div><div className="ws-panel__titulo">Captura manual de un día</div><div className="ws-panel__sub">Para corregir o agregar un día suelto.</div></div></div>
      <div className="fila-campos">
        <label className="campo"><span>Sucursal</span>
          <select value={f.sucursal_id} onChange={(e) => set("sucursal_id", e.target.value)}>
            <option value="">— Elige —</option>
            {sucursales.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label className="campo"><span>Fecha</span><input type="date" value={f.fecha} onChange={(e) => set("fecha", e.target.value)} /></label>
      </div>
      <div className="config__campos" style={{ marginTop: "0.8rem" }}>
        {campos.map(([k, lbl]) => (
          <label className="campo" key={k}><span>{lbl}</span>
            <input type="number" step="0.01" value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder="0" />
          </label>
        ))}
      </div>
      <div className="portada__acciones" style={{ marginTop: "1rem" }}>
        <button className="btn btn--negro" onClick={guardar} disabled={enviando} type="button">{enviando ? "Guardando…" : "Guardar día"}</button>
      </div>
    </div>
  );
}

function SucursalesEditor({ sucursales, recargar, onToast }: { sucursales: any[]; recargar: () => void; onToast: (m: string) => void }) {
  const [nombre, setNombre] = useState("");

  const agregar = async () => {
    if (!nombre.trim()) return;
    const res = await fetch("/api/admin/wansoft/sucursales", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, orden: (sucursales.length + 1) * 10 }),
    });
    const d = await res.json();
    if (d.ok) { setNombre(""); recargar(); onToast("Sucursal agregada."); }
    else onToast(d.error || "No se pudo agregar.");
  };

  const borrar = async (id: number, nom: string) => {
    if (!confirm(`¿Borrar la sucursal "${nom}" y todas sus ventas? No se puede deshacer.`)) return;
    const res = await fetch(`/api/admin/wansoft/sucursales/${id}`, { method: "DELETE" });
    const d = await res.json();
    if (d.ok) { recargar(); onToast("Sucursal borrada."); }
    else onToast(d.error || "No se pudo borrar.");
  };

  return (
    <div className="ws-panel">
      <div className="ws-panel__head"><div><div className="ws-panel__titulo">Sucursales del dashboard</div><div className="ws-panel__sub">El catálogo del combo de Wansoft. También se crean solas al importar.</div></div></div>
      <div className="ws-chips" style={{ marginBottom: "0.9rem" }}>
        {sucursales.map((s) => (
          <span className="ws-chip-btn" key={s.id}>{s.nombre} <button onClick={() => borrar(s.id, s.nombre)} style={{ color: "var(--rojo)", fontWeight: 800, marginLeft: 4 }} title="Borrar">✕</button></span>
        ))}
        {sucursales.length === 0 && <span className="ws-panel__sub">Aún no hay sucursales.</span>}
      </div>
      <div className="ws-filtros">
        <label className="campo" style={{ minWidth: 240 }}><span>Nueva sucursal</span>
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Pollo Medina Centro" />
        </label>
        <button className="btn btn--fantasma" onClick={agregar} type="button" style={{ height: 42 }}>+ Agregar</button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
//  CONEXIÓN (cookie de sesión + sync)
// ------------------------------------------------------------
function ConexionView({ mes, onToast, onHecho }: { sucursales: any[]; mes: string; onToast: (m: string) => void; onHecho: () => void }) {
  const [historial, setHistorial] = useState<any[]>([]);
  const [disponible, setDisponible] = useState(true);
  const [automatizacionActiva, setAutomatizacionActiva] = useState(false);
  const [sesion, setSesion] = useState<any>(null);
  const [wansoftReporteUrl, setWansoftReporteUrl] = useState("https://www.wansoft.net/Wansoft.Web/Reports/ConsolidatedSalesMasterReport");
  const [cookieWansoft, setCookieWansoft] = useState("");
  const [guardandoCookie, setGuardandoCookie] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [rango, setRango] = useState<{ desde: string; hasta: string }>(() => {
    if (/^\d{4}-\d{2}$/.test(mes)) {
      const [a, m] = mes.split("-").map(Number);
      const hoy = new Date();
      const esActual = mes === `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
      const u = esActual ? hoy.getDate() : new Date(a, m, 0).getDate();
      const pad = (x: number) => String(x).padStart(2, "0");
      return { desde: `${a}-${pad(m)}-01`, hasta: `${a}-${pad(m)}-${pad(u)}` };
    }
    return { desde: "", hasta: "" };
  });

  const cargarEstado = useCallback(async () => {
    const s = await fetch("/api/admin/wansoft/sync").then((r) => r.json());
    if (s.ok) {
      setHistorial(s.historial || []);
      setDisponible(s.scraperDisponible !== false);
      setAutomatizacionActiva(s.automatizacionActiva === true);
      setSesion(s.sesion || null);
      if (s.wansoftReporteUrl) setWansoftReporteUrl(s.wansoftReporteUrl);
    }
  }, []);

  useEffect(() => { cargarEstado(); }, [cargarEstado]);

  const guardarCookie = async () => {
    if (!cookieWansoft.trim()) { onToast("Pega primero la cookie de Wansoft."); return; }
    setGuardandoCookie(true);
    try {
      const res = await fetch("/api/admin/wansoft/credenciales", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cookie: cookieWansoft }),
      });
      const d = await res.json();
      if (!d.ok) { onToast(d.error || "No se pudo guardar la sesión."); return; }
      setCookieWansoft("");
      setSesion(d.sesion);
      onToast("Sesión de Wansoft guardada. Ya puedes completar los días faltantes.");
    } catch {
      onToast("No se pudo guardar la sesión de Wansoft.");
    } finally { setGuardandoCookie(false); }
  };

  const sincronizar = async (soloFaltantes = false) => {
    if (!rango.desde || !rango.hasta) { onToast("Indica el rango de fechas."); return; }
    setOcupado(true); setResultado(null);
    try {
      const res = await fetch("/api/admin/wansoft/sync", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desde: rango.desde, hasta: rango.hasta, soloFaltantes }),
      });
      const d = await res.json();
      setResultado(d);
      if (d.sinCambios) onToast("El rango ya está completamente sincronizado.");
      else if (d.ok) onToast(`Sincronización lista: ${d.summary?.filas ?? 0} filas.`);
      else onToast(d.turnstilePendiente ? "Falta resolver el Turnstile una vez (ver instrucciones)." : (d.error || "Sync con error."));
      cargarEstado(); onHecho();
    } catch {
      onToast("Error de conexión con el servidor.");
    } finally { setOcupado(false); }
  };

  return (
    <div className="ws" style={{ gap: "1.4rem" }}>
      <div className="ws-nota ws-nota--ok">
        <strong>Sincronización automática {automatizacionActiva ? "activa" : "desactivada"}.</strong> El servidor consulta
        los reportes de Wansoft por HTTP, sin abrir un navegador: actualiza el día en curso al arrancar y cada hora, y
        hace el cierre del día anterior a las 00:30 (hora de Ciudad de México).
      </div>

      {sesion && (!sesion.configurada || sesion.estado !== "activa") && (
        <div className="ws-nota ws-nota--warn">
          <strong>La automatización está en pausa:</strong>{" "}
          {sesion.configurada ? "la sesión de Wansoft caducó" : "todavía no hay una sesión de Wansoft"}.
          Renueva la cookie con las instrucciones siguientes.
        </div>
      )}

      <div className="ws-nota ws-nota--warn">
        <strong>Primera vez o sesión caducada:</strong> abre Wansoft con el botón siguiente, inicia sesión y pega aquí
        su cookie. Después el servidor podrá completar los días faltantes y continuar automáticamente.
      </div>

      <div className="ws-panel">
        <div className="ws-panel__head">
          <div><div className="ws-panel__titulo">Abrir reporte de Wansoft</div><div className="ws-panel__sub">Se abre en otra pestaña para iniciar sesión o revisar los reportes originales.</div></div>
          <a className="btn btn--fantasma" href={wansoftReporteUrl} target="_blank" rel="noopener noreferrer">Abrir Wansoft ↗</a>
        </div>
        <div className="ws-nota ws-nota--info" style={{ marginTop: "0.8rem" }}>
          Después de iniciar sesión: abre <strong>F12 → Network</strong>, recarga el reporte, selecciona una petición,
          y copia el valor completo de <strong>Request Headers → Cookie</strong>.
        </div>
        <div className="ws-filtros" style={{ marginTop: "0.8rem", alignItems: "flex-end" }}>
          <label className="campo" style={{ flex: "1 1 420px" }}>
            <span>Cookie de sesión</span>
            <input type="password" autoComplete="off" value={cookieWansoft} onChange={(e) => setCookieWansoft(e.target.value)} placeholder="Pega aquí el valor de Cookie" />
          </label>
          <button className="btn btn--negro" type="button" disabled={guardandoCookie || !cookieWansoft.trim()} onClick={guardarCookie} style={{ height: 42 }}>
            {guardandoCookie ? "Guardando…" : "Guardar sesión"}
          </button>
        </div>
      </div>

      <div className="ws-panel">
        <div className="ws-panel__head"><div><div className="ws-panel__titulo">Completar datos del rango</div><div className="ws-panel__sub">Puede revisar todo el rango o consultar solamente los días incompletos.</div></div></div>
        {!disponible && <div className="ws-nota ws-nota--warn" style={{ marginBottom: "1rem" }}>No se encontró la carpeta <code>wansoft-scraper/</code> o no está instalada.</div>}
        <div className="ws-filtros">
          <label className="campo"><span>Desde</span><input type="date" value={rango.desde} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} /></label>
          <label className="campo"><span>Hasta</span><input type="date" value={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} /></label>
          <button className="btn btn--negro" onClick={() => sincronizar(true)} disabled={ocupado} type="button" style={{ height: 42 }}>
            {ocupado ? "Sincronizando…" : "Completar días faltantes"}
          </button>
          <button className="btn btn--fantasma" onClick={() => sincronizar(false)} disabled={ocupado} type="button" style={{ height: 42 }}>
            {ocupado ? "Sincronizando…" : "▶ Sincronizar ahora"}
          </button>
        </div>
        <p className="ws-panel__sub" style={{ marginTop: "0.6rem" }}>Puede tardar según los días y sucursales. Usa el mismo botón para re-consultar (actualiza sin duplicar).</p>

        {resultado && (
          <div className={`ws-nota ${resultado.ok ? "ws-nota--ok" : "ws-nota--warn"}`} style={{ marginTop: "1rem" }}>
            {resultado.ok
              ? resultado.sinCambios
                ? "✔ No hay días faltantes en el rango seleccionado."
                : `✔ Listo. ${resultado.summary?.filas ?? 0} filas · ${resultado.summary?.dias ?? 0} días${resultado.pendientes ? " faltantes detectados" : ""} · ${resultado.summary?.sucursales ?? 0} sucursales.`
              : <>⚠ {resultado.error}{resultado.detalle ? <><br /><code style={{ fontSize: "0.75rem", whiteSpace: "pre-wrap" }}>{resultado.detalle}</code></> : null}</>}
          </div>
        )}
      </div>

      <div className="ws-panel">
        <div className="ws-panel__head"><div><div className="ws-panel__titulo">Programación del servidor</div></div></div>
        <div className="ws-nota ws-nota--info">
          No requiere configurar <code>cron</code>. Se inicia junto con Next.js y tiene bloqueo distribuido para evitar
          duplicados si el botón o más de una instancia intentan sincronizar al mismo tiempo.
          <ol className="ws-pasos">
            <li><code>WANSOFT_AUTO_SYNC=1</code> — activa la programación (valor predeterminado).</li>
            <li><code>WANSOFT_AUTO_SYNC=0</code> — la desactiva para una instancia concreta.</li>
          </ol>
        </div>
      </div>

      <div className="ws-panel">
        <div className="ws-panel__head"><div><div className="ws-panel__titulo">Historial de sincronizaciones</div></div></div>
        {historial.length === 0 ? <p className="ws-panel__sub">Aún no hay corridas.</p> : (
          <div className="ws-tabla-wrap">
            <table className="ws-tabla">
              <thead><tr><th className="izq">Inicio</th><th className="izq">Estado</th><th className="izq">Rango</th><th>Días</th><th>Filas</th><th className="izq">Mensaje</th></tr></thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td className="izq">{h.iniciado_en}</td>
                    <td className="izq"><span className={`chip ${h.estado === "ok" ? "chip--activo" : h.estado === "error" ? "chip--oculto" : "chip--tag"}`}>{h.estado}</span></td>
                    <td className="izq">{h.desde} → {h.hasta}</td>
                    <td>{h.dias}</td>
                    <td>{h.filas}</td>
                    <td className="izq" style={{ whiteSpace: "normal", maxWidth: 320 }}>{h.mensaje}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
