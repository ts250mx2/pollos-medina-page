"use client";

import { useState } from "react";

// ============================================================
//  Carrito visible de poyito: total siempre a la vista, +/- por producto
//  y un solo botón "Pedir ahora" que le pasa el pedido al agente.
// ============================================================

export interface ItemCarrito {
  nombre: string;
  precio: number;
  cant: number;
}

type Props = {
  items: ItemCarrito[];
  onMas: (nombre: string) => void;
  onMenos: (nombre: string) => void;
  onPedir: () => void;
  onVaciar: () => void;
  deshabilitado?: boolean;
};

const money = (n: number) => `$${Number(n || 0).toFixed(0)}`;

export function totalCarrito(items: ItemCarrito[]): number {
  return items.reduce((s, i) => s + i.precio * i.cant, 0);
}

export function BarraCarrito({ items, onMas, onMenos, onPedir, onVaciar, deshabilitado = false }: Props) {
  const [abierto, setAbierto] = useState(false);
  if (!items.length) return null;

  const piezas = items.reduce((s, i) => s + i.cant, 0);
  const total = totalCarrito(items);
  const etiquetaPiezas = `${piezas} ${piezas === 1 ? "artículo" : "artículos"}`;

  return (
    <div className="pollito-carrito" aria-live="polite">
      <button type="button" className="pollito-carrito__resumen" onClick={() => setAbierto((v) => !v)} aria-expanded={abierto}>
        <span className="pollito-carrito__icono">🛒</span>
        <span className="pollito-carrito__txt"><strong>{etiquetaPiezas}</strong> · {money(total)}</span>
        <span className="pollito-carrito__flecha">{abierto ? "▾" : "▴"}</span>
      </button>

      {abierto && (
        <ul className="pollito-carrito__lista">
          {items.map((i) => (
            <li key={i.nombre} className="pollito-carrito__item">
              <span className="pollito-carrito__nom">{i.nombre}</span>
              <span className="pollito-carrito__ctl">
                <button type="button" onClick={() => onMenos(i.nombre)} aria-label={`Quitar uno de ${i.nombre}`}>−</button>
                <b>{i.cant}</b>
                <button type="button" onClick={() => onMas(i.nombre)} aria-label={`Agregar uno de ${i.nombre}`}>+</button>
              </span>
              <span className="pollito-carrito__sub">{money(i.precio * i.cant)}</span>
            </li>
          ))}
          <li className="pollito-carrito__vaciar"><button type="button" onClick={onVaciar}>Vaciar</button></li>
        </ul>
      )}

      <button type="button" className="pollito-carrito__pedir" onClick={onPedir} disabled={deshabilitado}>
        Pedir ahora · {money(total)}
      </button>
    </div>
  );
}
