/* ============================================================
   Pollo Medina — Utilidades compartidas
   ============================================================ */

var PM_Utils = (function () {
  "use strict";

  var formatoMoneda = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  /** Formatea un número como precio en pesos mexicanos. */
  function dinero(valor) {
    return formatoMoneda.format(Number(valor) || 0);
  }

  /** Escapa texto antes de insertarlo como HTML. */
  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function $(selector, contexto) {
    return (contexto || document).querySelector(selector);
  }

  function $$(selector, contexto) {
    return Array.prototype.slice.call((contexto || document).querySelectorAll(selector));
  }

  /** Muestra un aviso flotante temporal. */
  var temporizadorToast = null;
  function toast(mensaje) {
    var nodo = $("#toast");
    if (!nodo) return;
    nodo.textContent = mensaje;
    nodo.classList.add("visible");
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(function () {
      nodo.classList.remove("visible");
    }, 2600);
  }

  /** Enlace de WhatsApp con mensaje precargado. */
  function enlaceWhatsApp(numero, mensaje) {
    return "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensaje);
  }

  return {
    dinero: dinero,
    escapar: escapar,
    $: $,
    $$: $$,
    toast: toast,
    enlaceWhatsApp: enlaceWhatsApp,
  };
})();
