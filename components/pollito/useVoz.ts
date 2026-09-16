"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ============================================================
//  Voz de poyito con la Web Speech API del navegador.
//  Sin llaves ni costo: usa la voz en español que tenga el dispositivo.
//  El silencio se recuerda en localStorage.
// ============================================================

const CLAVE_SILENCIO = "pollito.voz.silencio";

type Callbacks = {
  onInicio?: () => void;
  onFin?: () => void;
};

/** Quita emojis y marcas de formato para que la voz lea solo palabras. */
export function limpiarParaVoz(texto: string): string {
  return texto
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, " ")
    .replace(/[*_#`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function elegirVoz(): SpeechSynthesisVoice | null {
  const voces = window.speechSynthesis.getVoices();
  if (!voces.length) return null;
  const porPrioridad = [
    (v: SpeechSynthesisVoice) => /^es[-_]MX/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /^es[-_]US/i.test(v.lang),
    (v: SpeechSynthesisVoice) => /^es/i.test(v.lang),
  ];
  for (const prueba of porPrioridad) {
    const v = voces.find(prueba);
    if (v) return v;
  }
  return null;
}

export function useVoz({ onInicio, onFin }: Callbacks = {}) {
  const soportada = typeof window !== "undefined" && "speechSynthesis" in window;
  const [silenciada, setSilenciada] = useState<boolean>(false);
  const [hablando, setHablando] = useState(false);
  const inicioRef = useRef(onInicio);
  const finRef = useRef(onFin);
  inicioRef.current = onInicio;
  finRef.current = onFin;

  useEffect(() => {
    try {
      setSilenciada(localStorage.getItem(CLAVE_SILENCIO) === "1");
    } catch {
      /* sin persistencia */
    }
  }, []);

  const callar = useCallback(() => {
    if (!soportada) return;
    window.speechSynthesis.cancel();
    setHablando(false);
  }, [soportada]);

  const hablar = useCallback(
    (texto: string) => {
      if (!soportada || silenciada) return;
      const limpio = limpiarParaVoz(texto);
      if (!limpio) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(limpio);
      u.lang = "es-MX";
      u.rate = 1.06;
      u.pitch = 1.18; // un poco agudo: es un pollito
      const voz = elegirVoz();
      if (voz) u.voice = voz;
      u.onstart = () => {
        setHablando(true);
        inicioRef.current?.();
      };
      const terminar = () => {
        setHablando(false);
        finRef.current?.();
      };
      u.onend = terminar;
      u.onerror = terminar;
      window.speechSynthesis.speak(u);
    },
    [soportada, silenciada]
  );

  const alternar = useCallback(() => {
    setSilenciada((prev) => {
      const siguiente = !prev;
      try {
        localStorage.setItem(CLAVE_SILENCIO, siguiente ? "1" : "0");
      } catch {
        /* nada */
      }
      if (siguiente && soportada) {
        window.speechSynthesis.cancel();
        setHablando(false);
      }
      return siguiente;
    });
  }, [soportada]);

  useEffect(() => () => { if (soportada) window.speechSynthesis.cancel(); }, [soportada]);

  return { soportada, silenciada, hablando, hablar, callar, alternar };
}
