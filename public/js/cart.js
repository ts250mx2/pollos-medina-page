/* ============================================================
   Pollo Medina — Estado del carrito (funciones puras)
   Ninguna función muta el arreglo recibido: siempre devuelve uno nuevo.
   ============================================================ */

var PM_Carrito = (function () {
  "use strict";

  var CLAVE_STORAGE = "pm_carrito_v1";
  var MAX_CANTIDAD = 30;

  /** Clave única de una línea: producto + variantes elegidas. */
  function claveLinea(idProducto, elecciones) {
    var sufijo = (elecciones || [])
      .map(function (e) { return e.grupoId + ":" + e.eleccionId; })
      .join("|");
    return sufijo ? idProducto + "__" + sufijo : idProducto;
  }

  /** Agrega una línea o incrementa la cantidad si ya existe. */
  function agregar(lineas, nueva) {
    var existe = lineas.some(function (l) { return l.clave === nueva.clave; });
    if (!existe) return lineas.concat([Object.assign({}, nueva)]);

    return lineas.map(function (l) {
      if (l.clave !== nueva.clave) return l;
      return Object.assign({}, l, {
        cantidad: Math.min(l.cantidad + nueva.cantidad, MAX_CANTIDAD),
      });
    });
  }

  /** Cambia la cantidad de una línea; si llega a 0 la elimina. */
  function cambiarCantidad(lineas, clave, delta) {
    return lineas.reduce(function (acc, l) {
      if (l.clave !== clave) return acc.concat([l]);
      var cantidad = Math.min(Math.max(l.cantidad + delta, 0), MAX_CANTIDAD);
      return cantidad === 0 ? acc : acc.concat([Object.assign({}, l, { cantidad: cantidad })]);
    }, []);
  }

  function quitar(lineas, clave) {
    return lineas.filter(function (l) { return l.clave !== clave; });
  }

  function vaciar() {
    return [];
  }

  function subtotal(lineas) {
    return lineas.reduce(function (suma, l) { return suma + l.precio * l.cantidad; }, 0);
  }

  function totalPiezas(lineas) {
    return lineas.reduce(function (suma, l) { return suma + l.cantidad; }, 0);
  }

  /* ---------- Persistencia ---------- */
  function cargar() {
    try {
      var crudo = localStorage.getItem(CLAVE_STORAGE);
      if (!crudo) return [];
      var datos = JSON.parse(crudo);
      if (!Array.isArray(datos)) return [];
      return datos.filter(esLineaValida);
    } catch (error) {
      console.warn("No se pudo leer el carrito guardado:", error);
      return [];
    }
  }

  function guardar(lineas) {
    try {
      localStorage.setItem(CLAVE_STORAGE, JSON.stringify(lineas));
    } catch (error) {
      console.warn("No se pudo guardar el carrito:", error);
    }
  }

  function esLineaValida(l) {
    return (
      l &&
      typeof l.clave === "string" &&
      typeof l.nombre === "string" &&
      typeof l.precio === "number" &&
      typeof l.cantidad === "number" &&
      l.cantidad > 0
    );
  }

  return {
    claveLinea: claveLinea,
    agregar: agregar,
    cambiarCantidad: cambiarCantidad,
    quitar: quitar,
    vaciar: vaciar,
    subtotal: subtotal,
    totalPiezas: totalPiezas,
    cargar: cargar,
    guardar: guardar,
    MAX_CANTIDAD: MAX_CANTIDAD,
  };
})();
