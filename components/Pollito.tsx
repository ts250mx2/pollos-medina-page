"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { PoyitoMascota, type EstadoPoyito } from "./pollito/PoyitoMascota";
import { useVoz } from "./pollito/useVoz";
import { useRevelado } from "./pollito/useRevelado";
import { BarraCarrito, type ItemCarrito } from "./pollito/BarraCarrito";
import "./pollito/pollito.css";

// ============================================================
//  "poyito": chat de ventas flotante (habla con /api/pollito).
//  Fase 1 "agente vivo":
//   - La mascota REACCIONA al chat (piensa, habla con el pico sincronizado,
//     señala las tarjetas, celebra el pedido).
//   - Habla en voz alta (Web Speech) con botón de silencio.
//   - Carrito visible con total: "Agregar" es instantáneo (sin esperar al
//     modelo) y "Pedir ahora" le pasa todo al agente para cerrar.
//   - Promos del día al abrir.
// ============================================================

interface Tarjeta { nombre: string; precio: number; img: string | null; desc?: string | null; etiqueta?: string | null }
interface IAUsada { proveedor: string; modelo: string }
interface Mensaje { role: "user" | "assistant"; content: string; display?: string; tarjetas?: Tarjeta[]; ia?: IAUsada }

const NOMBRE_PROVEEDOR: Record<string, string> = { claude: "Claude", openai: "OpenAI", gemini: "Gemini", deepseek: "DeepSeek", groq: "Groq", mistral: "Mistral", xai: "xAI", openrouter: "OpenRouter", kimi: "Kimi", qwen: "Qwen", glm: "GLM" };
const etiquetaIA = (ia: IAUsada) => `${NOMBRE_PROVEEDOR[ia.proveedor] ?? ia.proveedor} · ${ia.modelo}`;

const CLAVE_MSGS = "pollito.msgs.v2";
const CLAVE_CARRITO = "pollito.carrito.v1";
const MS_CELEBRAR = 2600;
const MS_SENALAR = 1500;
const SALUDO: Mensaje = {
  role: "assistant",
  content: "¡Quiquiriquí! Soy poyito 🐥 de Pollo Medina. ¿Armamos algo rico para recoger o te lo llevamos?",
};
const money = (n: number) => `$${Number(n || 0).toFixed(0)}`;

function leerJSON<T>(clave: string, porDefecto: T): T {
  try {
    const g = localStorage.getItem(clave);
    if (!g) return porDefecto;
    const v = JSON.parse(g);
    return (v ?? porDefecto) as T;
  } catch {
    return porDefecto;
  }
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
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [promos, setPromos] = useState<Tarjeta[]>([]);
  const [cargado, setCargado] = useState(false);

  // Estado de la mascota (derivado de lo que pasa en el chat).
  const [celebrando, setCelebrando] = useState(false);
  const [senalando, setSenalando] = useState(false);
  const [reveladoIdx, setReveladoIdx] = useState<number | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  const { soportada: vozSoportada, silenciada, hablando: hablandoVoz, hablar, callar, alternar } = useVoz();

  // Texto que se está "escribiendo" (solo el último mensaje nuevo de poyito).
  const objetivoRevelado = reveladoIdx !== null ? mensajes[reveladoIdx]?.content ?? null : null;
  const { visible: textoRevelado, terminado: reveladoTerminado } = useRevelado(objetivoRevelado, {
    onFin: () => {
      const m = reveladoIdx !== null ? mensajes[reveladoIdx] : null;
      if (m?.tarjetas?.length) setSenalando(true);
    },
  });
  useEffect(() => {
    if (reveladoTerminado && reveladoIdx !== null) setReveladoIdx(null);
  }, [reveladoTerminado, reveladoIdx]);

  const hablandoTexto = reveladoIdx !== null && !reveladoTerminado;
  const estado: EstadoPoyito = enviando
    ? "pensando"
    : celebrando
      ? "celebrando"
      : hablandoTexto || hablandoVoz
        ? "hablando"
        : senalando
          ? "senalando"
          : "idle";

  useEffect(() => {
    if (!celebrando) return;
    const id = setTimeout(() => setCelebrando(false), MS_CELEBRAR);
    return () => clearTimeout(id);
  }, [celebrando]);
  useEffect(() => {
    if (!senalando) return;
    const id = setTimeout(() => setSenalando(false), MS_SENALAR);
    return () => clearTimeout(id);
  }, [senalando]);

  // Persistencia local (historial + carrito).
  useEffect(() => {
    const msgs = leerJSON<Mensaje[]>(CLAVE_MSGS, []);
    if (Array.isArray(msgs) && msgs.length) setMensajes(msgs);
    const c = leerJSON<ItemCarrito[]>(CLAVE_CARRITO, []);
    if (Array.isArray(c)) setCarrito(c);
    setCargado(true);
  }, []);
  useEffect(() => {
    if (!cargado) return;
    try { localStorage.setItem(CLAVE_MSGS, JSON.stringify(mensajes.slice(-40))); } catch { /* nada */ }
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, abierto, enviando, textoRevelado, cargado]);
  useEffect(() => {
    if (!cargado) return;
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)); } catch { /* nada */ }
  }, [carrito, cargado]);

  // Promos del día (una sola vez) y saludo hablado al abrir una conversación nueva.
  useEffect(() => {
    if (!abierto) { callar(); return; }
    if (promos.length === 0) {
      fetch("/api/publico/sitio")
        .then((r) => r.json())
        .then((d) => {
          const lista: Tarjeta[] = (d?.destacados?.promos || []).slice(0, 4).map((p: Tarjeta) => ({
            nombre: p.nombre, precio: Number(p.precio), img: p.img || null, desc: p.desc || null, etiqueta: p.etiqueta || null,
          }));
          setPromos(lista);
        })
        .catch(() => { /* sin promos: no pasa nada */ });
    }
    if (mensajes.length === 1) hablar(SALUDO.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

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

  const enviarContenido = useCallback(async (content: string, display?: string) => {
    if (!content.trim() || enviando) return;
    callar();
    setReveladoIdx(null);
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
      const respuesta: Mensaje = d.ok
        ? { role: "assistant", content: d.reply, tarjetas: d.tarjetas || [], ia: d.ia || undefined }
        : { role: "assistant", content: d.error || "Uy, algo falló. Intenta de nuevo." };
      const siguiente = [...nuevos, respuesta];
      setMensajes(siguiente);
      setReveladoIdx(siguiente.length - 1);
      hablar(respuesta.content);
      if (d.ok && d.pedido?.folio) {
        setFolio(d.pedido.folio);
        setCarrito([]);
        setCelebrando(true);
        onPedido?.(d.pedido.folio);
      }
    } catch {
      setMensajes((prev) => [...prev, { role: "assistant", content: "Sin conexión. Intenta de nuevo en un momento." }]);
    } finally {
      setEnviando(false);
    }
  }, [enviando, mensajes, callar, hablar, onPedido]);

  // ---- Carrito: agregar es instantáneo; "Pedir ahora" se lo pasa al agente ----
  const agregar = (t: Tarjeta) => {
    setCarrito((prev) => {
      const i = prev.findIndex((x) => x.nombre === t.nombre);
      if (i === -1) return [...prev, { nombre: t.nombre, precio: Number(t.precio), cant: 1 }];
      return prev.map((x, k) => (k === i ? { ...x, cant: x.cant + 1 } : x));
    });
  };
  const quitarUno = (nombre: string) =>
    setCarrito((prev) => prev.flatMap((x) => (x.nombre !== nombre ? [x] : x.cant > 1 ? [{ ...x, cant: x.cant - 1 }] : [])));
  const masUno = (nombre: string) => setCarrito((prev) => prev.map((x) => (x.nombre === nombre ? { ...x, cant: x.cant + 1 } : x)));
  const pedirCarrito = () => {
    if (!carrito.length) return;
    const lineas = carrito.map((i) => `${i.cant} x ${i.nombre}`).join(", ");
    const total = carrito.reduce((s, i) => s + i.precio * i.cant, 0);
    enviarContenido(`Quiero pedir: ${lineas}. (Total aprox. ${money(total)}.)`, `🛒 Quiero pedir: ${lineas}`);
    setCarrito([]);
  };
  const cantidadEn = (nombre: string) => carrito.find((x) => x.nombre === nombre)?.cant ?? 0;

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
    callar();
    setReveladoIdx(null);
    setMensajes([SALUDO]);
    setFolio(null);
    setCarrito([]);
    try { localStorage.removeItem(CLAVE_MSGS); localStorage.removeItem(CLAVE_CARRITO); } catch { /* nada */ }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviarContenido(texto); }
  };

  const renderTarjetas = (tarjetas: Tarjeta[], titulo?: string) => (
    <div className="pollito-cards">
      {titulo && <div className="pollito-cards__titulo">{titulo}</div>}
      {tarjetas.map((t) => {
        const n = cantidadEn(t.nombre);
        return (
          <div key={t.nombre} className={`pollito-card${n ? " pollito-card--en-carrito" : ""}`}>
            <span className="pollito-card__img">{t.img ? <img src={t.img} alt={t.nombre} loading="lazy" /> : <span className="pollito-card__ph">🍗</span>}</span>
            <span className="pollito-card__body">
              <span className="pollito-card__nom">{t.nombre}{t.etiqueta ? <em className="pollito-card__tag">{t.etiqueta}</em> : null}</span>
              <span className="pollito-card__precio">{money(t.precio)}</span>
            </span>
            {n ? (
              <span className="pollito-card__qty">
                <button type="button" onClick={() => quitarUno(t.nombre)} aria-label={`Quitar uno de ${t.nombre}`}>−</button>
                <b>{n}</b>
                <button type="button" onClick={() => agregar(t)} aria-label={`Agregar uno de ${t.nombre}`}>+</button>
              </span>
            ) : (
              <button type="button" className="pollito-card__add" onClick={() => agregar(t)}>＋ Agregar</button>
            )}
          </div>
        );
      })}
    </div>
  );

  const estadoTexto: Record<EstadoPoyito, string> = {
    idle: "En línea · listo para ayudarte",
    pensando: "Pensando…",
    hablando: "Hablando…",
    senalando: "Mira estas opciones",
    celebrando: "¡Pedido listo! 🎉",
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
        <div className={`pollito${maximizado ? " pollito--maximizado" : ""}`} role="dialog" aria-label="poyito, asistente de pedidos" data-estado={estado}>
          <header className="pollito__head">
            <div className="pollito__id">
              <span className="pollito__avatar"><PoyitoMascota compacta estado={estado} /></span>
              <div><strong>poyito</strong><span><i /> {estadoTexto[estado]}</span></div>
            </div>
            <div className="pollito__acc">
              {vozSoportada && (
                <button type="button" onClick={alternar} title={silenciada ? "Activar voz" : "Silenciar voz"} aria-label={silenciada ? "Activar voz de poyito" : "Silenciar voz de poyito"} aria-pressed={!silenciada}>
                  {silenciada ? "🔇" : "🔊"}
                </button>
              )}
              <button type="button" onClick={reiniciar} title="Empezar de nuevo" aria-label="Reiniciar">↺</button>
              <button type="button" onClick={() => setMaximizado((v) => !v)} title={maximizado ? "Restaurar tamaño" : "Maximizar"} aria-label={maximizado ? "Restaurar tamaño del chat" : "Maximizar chat"} aria-pressed={maximizado}>
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
            {mensajes.map((m, i) => {
              const escribiendo = i === reveladoIdx;
              const contenido = escribiendo ? textoRevelado : (m.display || m.content);
              return (
                <div key={i} className={`pollito-fila pollito-fila--${m.role}`}>
                  <div className={`pollito-msg pollito-msg--${m.role}${escribiendo ? " pollito-msg--escribiendo" : ""}`}>{contenido}</div>
                  {!escribiendo && m.ia && <div className="pollito-ia">{etiquetaIA(m.ia)}</div>}
                  {i === 0 && mensajes.length === 1 && promos.length > 0 && renderTarjetas(promos, "🔥 Promos de hoy")}
                  {!escribiendo && m.tarjetas && m.tarjetas.length > 0 && renderTarjetas(m.tarjetas)}
                </div>
              );
            })}
            {enviando && <div className="pollito-msg pollito-msg--assistant pollito-msg--cargando"><span></span><span></span><span></span></div>}
            {folio && <div className="pollito-folio">✅ Pedido registrado · Folio <strong>{folio}</strong></div>}
            <div ref={finRef} />
          </div>

          <BarraCarrito items={carrito} onMas={masUno} onMenos={quitarUno} onPedir={pedirCarrito} onVaciar={() => setCarrito([])} deshabilitado={enviando} />

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
