/* ============================================================
   Pollo Medina — Render del menú y selección de variantes
   Emite el evento "pm:agregar" con la línea lista para el carrito.
   ============================================================ */

var PM_Menu = (function (Utils) {
  "use strict";

  var TODO = "todo";
  var seleccion = {}; // { idProducto: { idGrupo: idEleccion } }
  var indice = {};    // { idProducto: producto }

  function iniciar(categorias) {
    var tabs = Utils.$("#menu-tabs");
    var grid = Utils.$("#menu-grid");
    if (!tabs || !grid) return;

    categorias.forEach(function (cat) {
      cat.productos.forEach(function (p) {
        indice[p.id] = p;
        seleccion[p.id] = seleccionInicial(p);
      });
    });

    tabs.innerHTML = plantillaTabs(categorias);
    grid.innerHTML = categorias
      .map(function (cat) {
        return cat.productos.map(function (p) { return plantillaProducto(p, cat.id); }).join("");
      })
      .join("");

    tabs.addEventListener("click", alClicTab);
    grid.addEventListener("click", alClicGrid);
    filtrar(TODO);
  }

  function seleccionInicial(producto) {
    return (producto.opciones || []).reduce(function (acc, grupo) {
      acc[grupo.id] = grupo.elecciones[0].id;
      return acc;
    }, {});
  }

  /* ---------- Plantillas ---------- */
  function plantillaTabs(categorias) {
    var todas =
      '<button class="tab" role="tab" data-cat="' + TODO + '" aria-selected="true">Todo</button>';
    return (
      todas +
      categorias
        .map(function (cat) {
          return (
            '<button class="tab" role="tab" data-cat="' + Utils.escapar(cat.id) + '" aria-selected="false">' +
            '<span aria-hidden="true">' + cat.emoji + "</span> " +
            Utils.escapar(cat.nombre) +
            "</button>"
          );
        })
        .join("")
    );
  }

  function plantillaProducto(p, idCategoria) {
    var precio = precioActual(p);
    return (
      '<article class="producto aparece" data-cat="' + Utils.escapar(idCategoria) + '" data-id="' + Utils.escapar(p.id) + '">' +
        '<div class="producto__media">' +
          (p.tag ? '<span class="etiqueta etiqueta--amarilla producto__tag">' + Utils.escapar(p.tag) + "</span>" : "") +
          (p.img ? '<img src="' + Utils.escapar(p.img) + '" alt="' + Utils.escapar(p.nombre) + '" loading="lazy" width="400" height="300">' : "") +
        "</div>" +
        '<div class="producto__cuerpo">' +
          '<h3 class="producto__nombre">' + Utils.escapar(p.nombre) + "</h3>" +
          '<p class="producto__desc">' + Utils.escapar(p.desc || "") + "</p>" +
          plantillaOpciones(p) +
        "</div>" +
        '<div class="producto__pie">' +
          '<div class="producto__precio" data-precio>' + Utils.dinero(precio) +
            "<small>Precio final</small>" +
          "</div>" +
          '<button class="btn btn--rojo btn--sm" data-accion="agregar" aria-label="Agregar ' + Utils.escapar(p.nombre) + ' al pedido">Agregar</button>' +
        "</div>" +
      "</article>"
    );
  }

  function plantillaOpciones(p) {
    if (!p.opciones || !p.opciones.length) return "";
    var grupos = p.opciones
      .map(function (grupo) {
        var pills = grupo.elecciones
          .map(function (op, i) {
            return (
              '<button type="button" class="pill" data-grupo="' + Utils.escapar(grupo.id) + '"' +
              ' data-eleccion="' + Utils.escapar(op.id) + '" aria-pressed="' + (i === 0 ? "true" : "false") + '">' +
              Utils.escapar(op.label) +
              (op.extra ? " +" + Utils.dinero(op.extra) : "") +
              "</button>"
            );
          })
          .join("");
        return (
          '<div class="opcion">' +
            '<span class="opcion__label">' + Utils.escapar(grupo.label) + "</span>" +
            '<div class="opcion__pills" role="group" aria-label="' + Utils.escapar(grupo.label) + '">' + pills + "</div>" +
          "</div>"
        );
      })
      .join("");
    return '<div class="producto__opciones">' + grupos + "</div>";
  }

  /* ---------- Interacción ---------- */
  function alClicTab(evento) {
    var tab = evento.target.closest(".tab");
    if (!tab) return;
    Utils.$$(".tab").forEach(function (t) {
      t.setAttribute("aria-selected", String(t === tab));
    });
    filtrar(tab.dataset.cat);
  }

  function filtrar(categoria) {
    Utils.$$("#menu-grid .producto").forEach(function (tarjeta) {
      var visible = categoria === TODO || tarjeta.dataset.cat === categoria;
      tarjeta.hidden = !visible;
    });
  }

  function alClicGrid(evento) {
    var pill = evento.target.closest(".pill");
    if (pill) return elegirVariante(pill);

    var boton = evento.target.closest('[data-accion="agregar"]');
    if (boton) return agregarAlPedido(boton.closest(".producto"));
  }

  function elegirVariante(pill) {
    var tarjeta = pill.closest(".producto");
    var idProducto = tarjeta.dataset.id;
    var grupo = pill.dataset.grupo;

    Utils.$$('.pill[data-grupo="' + grupo + '"]', tarjeta).forEach(function (p) {
      p.setAttribute("aria-pressed", String(p === pill));
    });

    seleccion[idProducto] = Object.assign({}, seleccion[idProducto]);
    seleccion[idProducto][grupo] = pill.dataset.eleccion;

    var nodoPrecio = Utils.$("[data-precio]", tarjeta);
    nodoPrecio.innerHTML =
      Utils.dinero(precioActual(indice[idProducto])) + "<small>Precio final</small>";
  }

  function precioActual(producto) {
    var elegido = seleccion[producto.id] || {};
    return (producto.opciones || []).reduce(function (total, grupo) {
      var op = grupo.elecciones.find(function (e) { return e.id === elegido[grupo.id]; });
      return total + (op ? op.extra || 0 : 0);
    }, producto.precio);
  }

  function eleccionesLegibles(producto) {
    var elegido = seleccion[producto.id] || {};
    return (producto.opciones || []).map(function (grupo) {
      var op = grupo.elecciones.find(function (e) { return e.id === elegido[grupo.id]; });
      return {
        grupoId: grupo.id,
        eleccionId: op.id,
        texto: grupo.label + ": " + op.label,
      };
    });
  }

  function agregarAlPedido(tarjeta) {
    var producto = indice[tarjeta.dataset.id];
    if (!producto) return;

    var elecciones = eleccionesLegibles(producto);
    var linea = {
      clave: PM_Carrito.claveLinea(producto.id, elecciones),
      id: producto.id,
      nombre: producto.nombre,
      precio: precioActual(producto),
      cantidad: 1,
      opciones: elecciones.map(function (e) { return e.texto; }),
    };

    document.dispatchEvent(new CustomEvent("pm:agregar", { detail: linea }));
  }

  return { iniciar: iniciar };
})(PM_Utils);
