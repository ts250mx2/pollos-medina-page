/* ============================================================
   Vista "Portada": foto principal (hero) y promociones de la semana
   ============================================================ */

var VistaPortada = (function (UI, API) {
  "use strict";

  var productos = []; // lista plana { id, nombre, categoria } para los selects
  var estado = { hero: null, promos: [] };

  /* ---------- Carga ---------- */
  async function cargar() {
    var respMenu = await API.menu();
    productos = aplanarProductos(respMenu.menu);

    var resp = await API.destacados();
    estado = resp.destacados || { hero: null, promos: [] };

    pintarHero();
    pintarPromos();
  }

  function aplanarProductos(categorias) {
    var lista = [];
    categorias.forEach(function (cat) {
      cat.productos.forEach(function (p) {
        lista.push({ id: p.idNumerico, nombre: p.nombre, categoria: cat.nombre, activo: p.activo });
      });
    });
    return lista;
  }

  /** <option>s de todos los productos, con uno seleccionado. */
  function opcionesProducto(seleccionado, incluirVacio) {
    var vacio = incluirVacio
      ? '<option value="">— Sin foto principal (usar diseño por defecto) —</option>'
      : "";
    return (
      vacio +
      productos
        .map(function (p) {
          return (
            '<option value="' + p.id + '"' + (String(p.id) === String(seleccionado) ? " selected" : "") + ">" +
            UI.escapar(p.categoria + " · " + p.nombre) + (p.activo ? "" : " (oculto)") +
            "</option>"
          );
        })
        .join("")
    );
  }

  /* ---------- Hero ---------- */
  function pintarHero() {
    var hero = estado.hero || {};
    UI.$("#hero-producto").innerHTML = opcionesProducto(hero.productoId || "", true);
    UI.$("#hero-etiqueta").value = hero.etiqueta || "";
    UI.$("#hero-subtitulo").value = hero.subtitulo || "";
  }

  async function guardarHero() {
    var boton = UI.$("#guardar-hero");
    boton.disabled = true;
    try {
      await API.guardarHero({
        producto_id: UI.$("#hero-producto").value || null,
        etiqueta: UI.$("#hero-etiqueta").value,
        subtitulo: UI.$("#hero-subtitulo").value,
      });
      UI.aviso("Foto principal guardada. Refresca el sitio para verla.");
    } catch (e) {
      UI.error(e);
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- Promos ---------- */
  function pintarPromos() {
    var contenedor = UI.$("#promos-lista");
    if (!estado.promos.length) {
      contenedor.innerHTML =
        '<p class="vacio">Sin promociones. Agrega productos con "+ Agregar promo" (la primera será la grande).</p>';
      return;
    }
    contenedor.innerHTML = estado.promos.map(function (p, i) { return filaPromo(p, i); }).join("");
  }

  function filaPromo(promo, indice) {
    return (
      '<div class="promo-fila" data-fila>' +
        '<span class="promo-fila__num">' + (indice + 1) + "</span>" +
        '<label class="campo"><span>Producto</span>' +
          '<select data-promo-producto>' + opcionesProducto(promo ? promo.productoId : "", false) + "</select>" +
        "</label>" +
        '<label class="campo"><span>Insignia</span>' +
          '<input type="text" data-promo-etiqueta maxlength="60" placeholder="Ej. Rinde 6" value="' +
          UI.escapar(promo && promo.etiqueta ? promo.etiqueta : "") + '">' +
        "</label>" +
        '<div class="promo-fila__acciones">' +
          '<button type="button" class="mini-btn" data-subir title="Subir">↑</button>' +
          '<button type="button" class="mini-btn" data-bajar title="Bajar">↓</button>' +
          '<button type="button" class="mini-btn mini-btn--rojo" data-quitar title="Quitar">✕</button>' +
        "</div>" +
      "</div>"
    );
  }

  /** Lee las filas actuales del DOM y actualiza el estado. */
  function leerPromosDelDom() {
    return UI.$$("#promos-lista [data-fila]").map(function (fila) {
      return {
        productoId: UI.$("[data-promo-producto]", fila).value,
        etiqueta: UI.$("[data-promo-etiqueta]", fila).value.trim(),
      };
    });
  }

  function agregarPromo() {
    if (!productos.length) {
      UI.aviso("Primero crea productos en el Menú.", true);
      return;
    }
    estado.promos = leerPromosDelDom().concat([{ productoId: productos[0].id, etiqueta: "" }]);
    pintarPromos();
  }

  function alClicPromos(evento) {
    var boton = evento.target.closest("button[data-subir], button[data-bajar], button[data-quitar]");
    if (!boton) return;

    var filas = leerPromosDelDom();
    var fila = boton.closest("[data-fila]");
    var indice = UI.$$("#promos-lista [data-fila]").indexOf(fila);

    if (boton.hasAttribute("data-quitar")) {
      filas.splice(indice, 1);
    } else if (boton.hasAttribute("data-subir") && indice > 0) {
      var t = filas[indice - 1]; filas[indice - 1] = filas[indice]; filas[indice] = t;
    } else if (boton.hasAttribute("data-bajar") && indice < filas.length - 1) {
      var b = filas[indice + 1]; filas[indice + 1] = filas[indice]; filas[indice] = b;
    }
    estado.promos = filas;
    pintarPromos();
  }

  async function guardarPromos() {
    var boton = UI.$("#guardar-promos");
    var lista = leerPromosDelDom()
      .filter(function (p) { return p.productoId; })
      .map(function (p) { return { producto_id: p.productoId, etiqueta: p.etiqueta }; });

    boton.disabled = true;
    try {
      await API.guardarPromos(lista);
      UI.aviso("Promociones guardadas. Refresca el sitio para verlas.");
      await cargar();
    } catch (e) {
      UI.error(e);
    } finally {
      boton.disabled = false;
    }
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    UI.$("#guardar-hero").addEventListener("click", guardarHero);
    UI.$("#agregar-promo").addEventListener("click", agregarPromo);
    UI.$("#guardar-promos").addEventListener("click", guardarPromos);
    UI.$("#promos-lista").addEventListener("click", alClicPromos);
  }

  return { iniciar: iniciar, cargar: cargar };
})(UI, API);
