"use client";

import React, { useEffect, useRef, useState } from "react";

// ============================================================
//  "Pollito": chat de ventas flotante (habla con /api/pollito).
//  Muestra productos con foto, sugiere complementos y calcula el
//  envío a domicilio desde la ubicación del cliente.
// ============================================================

interface Tarjeta { nombre: string; precio: number; img: string | null; desc?: string | null }
interface Mensaje { role: "user" | "assistant"; content: string; display?: string; tarjetas?: Tarjeta[] }

const CLAVE = "pollito.msgs.v2";
const SALUDO: Mensaje = {
  role: "assistant",
  content: "¡Quiquiriquí! Soy poyito 🐥 de Pollo Medina. ¿Armamos algo rico para recoger o te lo llevamos?",
};
const money = (n: number) => `$${Number(n || 0).toFixed(0)}`;

function PoyitoMascota({ compacta = false }: { compacta?: boolean }) {
  return (
    <span className={`poyito-mascota${compacta ? " poyito-mascota--compacta" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 160 150" role="img">
        <defs>
          <radialGradient id="poyitoBody" cx="32%" cy="22%" r="78%"><stop offset="0" stopColor="#fff7a8"/><stop offset=".42" stopColor="#ffd832"/><stop offset="1" stopColor="#e99c05"/></radialGradient>
          <radialGradient id="poyitoHead" cx="34%" cy="25%" r="72%"><stop offset="0" stopColor="#fffbd0"/><stop offset=".38" stopColor="#ffe45d"/><stop offset="1" stopColor="#efad08"/></radialGradient>
          <linearGradient id="poyitoWing" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffe96c"/><stop offset="1" stopColor="#e9a407"/></linearGradient>
          <linearGradient id="poyitoBeak" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffb637"/><stop offset="1" stopColor="#e96816"/></linearGradient>
          <filter id="poyitoSoft" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="#6b3b00" floodOpacity=".28"/></filter>
        </defs>
        <ellipse className="poyito-mascota__sombra" cx="79" cy="137" rx="43" ry="8" />
        <g className="poyito-mascota__grito"><path d="M126 27l12-11M132 39l17-2M116 20l3-15" /></g>
        <g className="poyito-mascota__personaje" filter="url(#poyitoSoft)">
          <g className="poyito-mascota__patas">
            <path d="M61 120v13m-10 1 10-1 8 4M101 119v14m-9 3 9-3 9 2" />
          </g>
          <ellipse className="poyito-mascota__cuerpo" cx="80" cy="96" rx="45" ry="37" />
          <path className="poyito-mascota__ala poyito-mascota__ala--izq" d="M45 78C25 70 15 84 23 103c5 12 18 13 30 2-7-7-9-16-8-27Z" />
          <path className="poyito-mascota__ala poyito-mascota__ala--der" d="M114 78c20-8 30 7 21 25-5 10-15 12-27 3 7-9 8-18 6-28Z" />
          <ellipse className="poyito-mascota__panza" cx="80" cy="105" rx="26" ry="20" />
          <g className="poyito-mascota__cabeza">
            <path className="poyito-mascota__cresta" d="M57 43c-10-15 6-24 16-12 2-18 23-18 25-1 12-10 28 5 16 18" />
            <circle className="poyito-mascota__cara" cx="80" cy="62" r="39" />
            <ellipse className="poyito-mascota__mejilla" cx="50" cy="72" rx="9" ry="5" />
            <ellipse className="poyito-mascota__mejilla" cx="111" cy="72" rx="9" ry="5" />
            <g className="poyito-mascota__ojo poyito-mascota__ojo--izq"><ellipse cx="64" cy="58" rx="8" ry="10"/><circle cx="61" cy="54" r="2.8"/></g>
            <g className="poyito-mascota__ojo poyito-mascota__ojo--der"><ellipse cx="96" cy="58" rx="8" ry="10"/><circle cx="93" cy="54" r="2.8"/></g>
            <path className="poyito-mascota__ceja" d="M55 43q9-6 17 0M89 42q9-5 17 2" />
            <g className="poyito-mascota__pico"><path d="M70 68q10-11 21 0L80 78Z"/><path d="M71 69h19L80 84Z"/></g>
          </g>
          <path className="poyito-mascota__luz" d="M52 82c-8 9-8 22-2 29" />
        </g>
      </svg>
    </span>
  );
}

interface PollitoProps {
  /** Se llama cuando poyito registra un pedido (para refrescar el mostrador). */
  onPedido?: (folio: string) => void;
  /** Texto del botón flotante (por defecto, el del sitio público). */
  etiquetaFab?: string;
}

export default function Pollito({ onPedido, etiquetaFab }: PollitoProps = {}) {
  const [abierto, setAbierto] = useState(false);
  const [maximizado, setMaximizado] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const [folio, setFolio] = useState<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE);
      if (g) { const arr = JSON.parse(g); if (Array.isArray(arr) && arr.length) setMensajes(arr); }
    } catch { /* sin persistencia */ }
  }, []);

  useEffect(() => {
    try { localStorage.setItem(CLAVE, JSON.stringify(mensajes.slice(-40))); } catch { /* nada */ }
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto, enviando]);

  useEffect(() => {
    if (!abierto) return;
    const cerrarConEscape = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (maximizado) setMaximizado(false);
      else setAbierto(false);
    };
    window.addEventListener("keydown", cerrarConEscape);
    return () => window.removeEventListener("keydown", cerrarConEscape);
  }, [abierto, maximizado]);

  const enviarContenido = async (content: string, display?: string) => {
    if (!content.trim() || enviando) return;
    const nuevos: Mensaje[] = [...mensajes, { role: "user", content, display }];
    setMensajes(nuevos);
    setTexto("");
    setEnviando(true);
    try {
      const res = await fetch("/api/pollito", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mensajes: nuevos.map((m) => ({ role: m.role, content: m.content })) }),
      });
      const d = await res.json();
      if (d.ok) {
        setMensajes((prev) => [...prev, { role: "assistant", content: d.reply, tarjetas: d.tarjetas || [] }]);
        if (d.pedido?.folio) { setFolio(d.pedido.folio); onPedido?.(d.pedido.folio); }
      } else {
        setMensajes((prev) => [...prev, { role: "assistant", content: d.error || "Uy, algo falló. Intenta de nuevo." }]);
      }
    } catch {
      setMensajes((prev) => [...prev, { role: "assistant", content: "Sin conexión. Intenta de nuevo en un momento." }]);
    } finally {
      setEnviando(false);
    }
  };

  const compartirUbicacion = () => {
    if (ubicando || enviando) return;
    if (!navigator.geolocation) {
      setMensajes((prev) => [...prev, { role: "assistant", content: "Tu navegador no permite compartir ubicación. Dime tu colonia o mejor lo recoges 🙂" }]);
      return;
    }
    setUbicando(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUbicando(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        enviarContenido(`Mi ubicación: lat=${lat}, lng=${lng}`, "📍 Compartí mi ubicación");
      },
      () => {
        setUbicando(false);
        setMensajes((prev) => [...prev, { role: "assistant", content: "No pude leer tu ubicación (¿la bloqueaste?). Dime tu colonia/calle o elige recoger." }]);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const reiniciar = () => {
    setMensajes([SALUDO]); setFolio(null);
    try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarContenido(texto); }
  };

  return (
    <>
      {!abierto && (
        <button className="pollito-fab" type="button" onClick={() => setAbierto(true)} aria-label="Pedir con poyito">
          <PoyitoMascota />
          <span className="pollito-fab__txt">{etiquetaFab ? etiquetaFab : (<><small>¿Hambre?</small>Pide con poyito</>)}</span>
          <span className="pollito-fab__burbuja">¡Hola!</span>
        </button>
      )}

      {abierto && (
        <div className={`pollito${maximizado ? " pollito--maximizado" : ""}`} role="dialog" aria-label="poyito, asistente de pedidos">
          <header className="pollito__head">
            <div className="pollito__id">
              <span className="pollito__avatar"><PoyitoMascota compacta /></span>
              <div><strong>poyito</strong><span><i /> En línea · listo para ayudarte</span></div>
            </div>
            <div className="pollito__acc">
              <button type="button" onClick={reiniciar} title="Empezar de nuevo" aria-label="Reiniciar">↺</button>
              <button type="button" onClick={() => setMaximizado((valor) => !valor)} title={maximizado ? "Restaurar tamaño" : "Maximizar"} aria-label={maximizado ? "Restaurar tamaño del chat" : "Maximizar chat"} aria-pressed={maximizado}>
                {maximizado ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3v5H3M16 3v5h5M8 21v-5H3M16 21v-5h5" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M9 21H3v-6M15 21h6v-6" /></svg>
                )}
              </button>
              <button type="button" onClick={() => { setAbierto(false); setMaximizado(false); }} title="Cerrar" aria-label="Cerrar">✕</button>
            </div>
          </header>

          <div className="pollito__hilo">
            {mensajes.map((m, i) => (
              <div key={i} className={`pollito-fila pollito-fila--${m.role}`}>
                <div className={`pollito-msg pollito-msg--${m.role}`}>{m.display || m.content}</div>
                {m.tarjetas && m.tarjetas.length > 0 && (
                  <div className="pollito-cards">
                    {m.tarjetas.map((t, j) => (
                      <button key={j} className="pollito-card" type="button" onClick={() => enviarContenido(`Quiero ${t.nombre}`)}>
                        <span className="pollito-card__img">{t.img ? <img src={t.img} alt={t.nombre} loading="lazy" /> : <span className="pollito-card__ph">🍗</span>}</span>
                        <span className="pollito-card__body">
                          <span className="pollito-card__nom">{t.nombre}</span>
                          <span className="pollito-card__precio">{money(t.precio)}</span>
                        </span>
                        <span className="pollito-card__add">＋ Agregar</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {enviando && <div className="pollito-msg pollito-msg--assistant pollito-msg--cargando"><span></span><span></span><span></span></div>}
            {folio && <div className="pollito-folio">✅ Pedido registrado · Folio <strong>{folio}</strong></div>}
            <div ref={finRef} />
          </div>

          <div className="pollito__chips">
            <button type="button" onClick={() => enviarContenido("Es para recoger")} disabled={enviando}>🏪 Recoger</button>
            <button type="button" onClick={() => enviarContenido("Es a domicilio")} disabled={enviando}>🛵 Domicilio</button>
            <button type="button" onClick={compartirUbicacion} disabled={enviando || ubicando}>📍 {ubicando ? "Ubicando…" : "Mi ubicación"}</button>
          </div>

          <div className="pollito__barra">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={onKey} rows={1} placeholder="Escribe tu pedido…" aria-label="Tu mensaje" />
            <button type="button" onClick={() => enviarContenido(texto)} disabled={enviando || !texto.trim()} aria-label="Enviar">➤</button>
          </div>
        </div>
      )}
    </>
  );
}
