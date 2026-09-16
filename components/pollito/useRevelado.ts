"use client";

import { useEffect, useRef, useState } from "react";

// ============================================================
//  "Máquina de escribir": revela el texto de poyito poco a poco para que
//  el pico se mueva al ritmo de lo que dice. `objetivo === null` = inactivo.
// ============================================================

const CPS_POR_DEFECTO = 48; // caracteres por segundo
const PASO_MS = 30;

type Opciones = {
  cps?: number;
  onFin?: () => void;
};

export function useRevelado(objetivo: string | null, { cps = CPS_POR_DEFECTO, onFin }: Opciones = {}) {
  const [visible, setVisible] = useState("");
  const [terminado, setTerminado] = useState(true);
  const finRef = useRef(onFin);
  finRef.current = onFin;

  useEffect(() => {
    if (objetivo === null) {
      setVisible("");
      setTerminado(true);
      return;
    }
    setVisible("");
    setTerminado(false);
    const porPaso = Math.max(1, Math.ceil((cps * PASO_MS) / 1000));
    let indice = 0;
    const id = setInterval(() => {
      indice = Math.min(objetivo.length, indice + porPaso);
      setVisible(objetivo.slice(0, indice));
      if (indice >= objetivo.length) {
        clearInterval(id);
        setTerminado(true);
        finRef.current?.();
      }
    }, PASO_MS);
    return () => clearInterval(id);
  }, [objetivo, cps]);

  return { visible, terminado };
}
