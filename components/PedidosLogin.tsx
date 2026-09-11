"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function PedidosLogin({ configurado }: { configurado: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim() || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/pedidos/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const d = await res.json();
      if (d.ok) router.refresh();
      else setError(d.error || "No se pudo entrar.");
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="ped-login">
      <form className="ped-login__caja" onSubmit={entrar}>
        <h1>Mostrador de pedidos</h1>
        <p>Pollo Medina · acceso de cocina/mostrador</p>
        {configurado ? (
          <>
            <input
              type="password" inputMode="numeric" autoFocus value={pin}
              onChange={(e) => setPin(e.target.value)} placeholder="PIN" aria-label="PIN"
            />
            {error && <div className="ped-login__error">{error}</div>}
            <button className="ped-btn ped-btn--rojo" type="submit" disabled={enviando}>
              {enviando ? "Entrando…" : "Entrar"}
            </button>
          </>
        ) : (
          <div className="ped-login__error">
            Falta configurar el acceso. Define <code>PEDIDOS_PIN</code> en el archivo .env del servidor.
          </div>
        )}
      </form>
    </div>
  );
}
