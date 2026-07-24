/* ============================================================
   Utilidades de interfaz: avisos, modal, formato y campos
   ============================================================ */

var UI = (function () {
  "use strict";

  var formatoMoneda = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function dinero(valor) { return formatoMoneda.format(Number(valor) || 0); }

  function escapar(texto) {
    return String(texto == null ? "" : texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- Aviso flotante ---------- */
  var temporizador = null;
  function aviso(mensaje, esError) {
    var nodo = $("#aviso");
    nodo.textContent = mensaje;
    nodo.classList.toggle("error", Boolean(esError));
    nodo.classList.add("visible");
    clearTimeout(temporizador);
    temporizador = setTimeout(function () { nodo.classList.remove("visible"); }, esError ? 5000 : 2800);
  }

  var error = function (e) { aviso(e && e.message ? e.message : String(e), true); };

  /* ---------- Modal ---------- */
  var alGuardar = null;

  function abrirModal(titulo, html, manejador) {
    $("#modal-titulo").textContent = titulo;
    $("#modal-form").innerHTML = html;
    $("#modal").hidden = false;
    document.body.style.overflow = "hidden";
    alGuardar = manejador;

    var primero = $("#modal-form input, #modal-form select, #modal-form textarea");
    if (primero) primero.focus();
  }

  function cerrarModal() {
    $("#modal").hidden = true;
    $("#modal-form").innerHTML = "";
    document.body.style.overflow = "";
    alGuardar = null;
  }

  function iniciarModal() {
    $$("[data-cerrar-modal]").forEach(function (nodo) {
      nodo.addEventListener("click", cerrarModal);
    });
    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && !$("#modal").hidden) cerrarModal();
    });
    $("#modal-form").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      if (!alGuardar) return;
      var boton = $("#modal-guardar");
      boton.disabled = true;
      try {
        await alGuardar(valoresDelFormulario(evento.target));
      } catch (e) {
        error(e);
      } finally {
        boton.disabled = false;
      }
    });
  }

  /** Lee un formulario como objeto, con checkboxes como booleanos. */
  function valoresDelFormulario(formulario) {
    var valores = {};
    $$("[name]", formulario).forEach(function (campo) {
      if (campo.type === "checkbox") valores[campo.name] = campo.checked;
      else valores[campo.name] = campo.value;
    });
    return valores;
  }

  /* ---------- Constructores de campos ---------- */
  function campoTexto(nombre, etiqueta, valor, opciones) {
    var o = opciones || {};
    return (
      '<label class="campo"><span>' + escapar(etiqueta) + "</span>" +
      '<input type="' + (o.tipo || "text") + '" name="' + nombre + '"' +
      ' value="' + escapar(valor == null ? "" : valor) + '"' +
      (o.placeholder ? ' placeholder="' + escapar(o.placeholder) + '"' : "") +
      (o.requerido ? " required" : "") +
      (o.paso ? ' step="' + o.paso + '"' : "") +
      (o.min !== undefined ? ' min="' + o.min + '"' : "") +
      ">" +
      (o.ayuda ? "<small>" + escapar(o.ayuda) + "</small>" : "") +
      "</label>"
    );
  }

  function campoArea(nombre, etiqueta, valor, ayuda) {
    return (
      '<label class="campo"><span>' + escapar(etiqueta) + "</span>" +
      '<textarea name="' + nombre + '">' + escapar(valor == null ? "" : valor) + "</textarea>" +
      (ayuda ? "<small>" + escapar(ayuda) + "</small>" : "") +
      "</label>"
    );
  }

  function campoSelect(nombre, etiqueta, valor, opciones) {
    var items = opciones
      .map(function (op) {
        return (
          '<option value="' + escapar(op.valor) + '"' +
          (String(op.valor) === String(valor) ? " selected" : "") + ">" +
          escapar(op.texto) + "</option>"
        );
      })
      .join("");
    return (
      '<label class="campo"><span>' + escapar(etiqueta) + "</span>" +
      '<select name="' + nombre + '">' + items + "</select></label>"
    );
  }

  function campoCheck(nombre, etiqueta, marcado) {
    return (
      '<label class="campo campo--check">' +
      '<input type="checkbox" name="' + nombre + '"' + (marcado ? " checked" : "") + ">" +
      "<span>" + escapar(etiqueta) + "</span></label>"
    );
  }

  /** Campo de imagen con vista previa y botón de subida. */
  function campoImagen(nombre, etiqueta, valor, carpeta) {
    var tieneImagen = Boolean(valor);
    return (
      '<div class="campo"><span>' + escapar(etiqueta) + "</span>" +
      '<div class="subida" data-subida data-carpeta="' + carpeta + '">' +
        (tieneImagen
          ? '<img class="subida__vista" data-vista src="' + escapar(valor) + '" alt="">'
          : '<div class="subida__vista" data-vista>🍗</div>') +
        '<div class="subida__controles">' +
          '<input type="hidden" name="' + nombre + '" value="' + escapar(valor || "") + '">' +
          '<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" data-archivo>' +
          '<button type="button" class="btn btn--negro btn--sm" data-elegir>Subir foto</button>' +
          '<button type="button" class="btn btn--fantasma btn--sm" data-quitar' + (tieneImagen ? "" : " hidden") + ">Quitar</button>" +
          "<small>JPG, PNG o WEBP · máximo 5 MB</small>" +
        "</div>" +
      "</div></div>"
    );
  }

  /** Conecta los campos de imagen que existan dentro de un contenedor. */
  function activarSubidas(contenedor) {
    $$("[data-subida]", contenedor).forEach(function (bloque) {
      var archivo = $("[data-archivo]", bloque);
      var oculto = $('input[type="hidden"]', bloque);
      var quitar = $("[data-quitar]", bloque);

      $("[data-elegir]", bloque).addEventListener("click", function () { archivo.click(); });

      archivo.addEventListener("change", async function () {
        if (!archivo.files || !archivo.files[0]) return;
        try {
          aviso("Subiendo imagen…");
          var url = await API.subirImagen(archivo.files[0], bloque.dataset.carpeta);
          oculto.value = url;
          reemplazarVista(bloque, url);
          quitar.hidden = false;
          aviso("Imagen lista.");
        } catch (e) {
          error(e);
        }
      });

      quitar.addEventListener("click", function () {
        oculto.value = "";
        reemplazarVista(bloque, null);
        quitar.hidden = true;
      });
    });
  }

  function reemplazarVista(bloque, url) {
    var actual = $("[data-vista]", bloque);
    var nuevo;
    if (url) {
      nuevo = document.createElement("img");
      nuevo.src = url;
      nuevo.alt = "";
    } else {
      nuevo = document.createElement("div");
      nuevo.textContent = "🍗";
    }
    nuevo.className = "subida__vista";
    nuevo.setAttribute("data-vista", "");
    actual.replaceWith(nuevo);
  }

  function confirmar(mensaje) {
    return window.confirm(mensaje);
  }

  return {
    $: $,
    $$: $$,
    dinero: dinero,
    escapar: escapar,
    aviso: aviso,
    error: error,
    abrirModal: abrirModal,
    cerrarModal: cerrarModal,
    iniciarModal: iniciarModal,
    campoTexto: campoTexto,
    campoArea: campoArea,
    campoSelect: campoSelect,
    campoCheck: campoCheck,
    campoImagen: campoImagen,
    activarSubidas: activarSubidas,
    confirmar: confirmar,
  };
})();
