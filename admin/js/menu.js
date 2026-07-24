/* ============================================================
   Vista "Menú": categorías, productos y sus opciones
   ============================================================ */

var VistaMenu = (function (UI, API) {
  "use strict";

  var categorias = [];

  async function cargar() {
    var respuesta = await API.menu();
    categorias = respuesta.menu;
    pintar();
  }

  /* ---------- Render ---------- */
  function pintar() {
    var contenedor = UI.$("#lista-menu");
    if (!categorias.length) {
      contenedor.innerHTML = '<p class="vacio">Todavía no hay categorías. Crea la primera con "+ Categoría".</p>';
      return;
    }
    contenedor.innerHTML = categorias.map(plantillaCategoria).join("");
  }

  function plantillaCategoria(cat) {
    var productos = cat.productos.length
      ? cat.productos.map(plantillaProducto).join("")
      : '<p class="vacio">Sin productos en esta categoría.</p>';

    return (
      '<section class="categoria" data-categoria="' + cat.idNumerico + '">' +
        '<header class="categoria__head">' +
          '<span aria-hidden="true">' + UI.escapar(cat.emoji || "🍽️") + "</span>" +
          '<span class="categoria__nombre">' + UI.escapar(cat.nombre) + "</span>" +
          '<span class="chip ' + (cat.activo ? "chip--activo" : "chip--oculto") + '">' +
            (cat.activo ? "Visible" : "Oculta") + "</span>" +
          '<span class="categoria__meta">' + cat.productos.length + " productos</span>" +
          '<span class="categoria__acciones">' +
            '<button class="btn btn--fantasma btn--sm" data-accion="agregar-producto" data-id="' + cat.idNumerico + '">+ Producto</button>' +
            '<button class="btn btn--fantasma btn--sm" data-accion="editar-categoria" data-id="' + cat.idNumerico + '">Editar</button>' +
            '<button class="btn btn--peligro btn--sm" data-accion="borrar-categoria" data-id="' + cat.idNumerico + '">Borrar</button>' +
          "</span>" +
        "</header>" +
        productos +
      "</section>"
    );
  }

  function plantillaProducto(p) {
    var opciones = p.opciones
      .map(function (o) {
        return o.label + ": " + o.elecciones.map(function (e) { return e.label; }).join(" / ");
      })
      .join(" · ");

    return (
      '<div class="producto-fila" data-producto="' + p.idNumerico + '">' +
        (p.img
          ? '<img class="miniatura" src="' + UI.escapar(p.img) + '" alt="" loading="lazy">'
          : '<div class="miniatura">🍗</div>') +
        "<div>" +
          '<div class="producto-fila__nombre">' + UI.escapar(p.nombre) +
            (p.tag ? ' <span class="chip chip--tag">' + UI.escapar(p.tag) + "</span>" : "") +
            (p.activo ? "" : ' <span class="chip chip--oculto">Oculto</span>') +
          "</div>" +
          '<div class="producto-fila__desc">' + UI.escapar(p.desc) + "</div>" +
          (opciones ? '<div class="producto-fila__opts">' + UI.escapar(opciones) + "</div>" : "") +
        "</div>" +
        '<div class="producto-fila__precio">' + UI.dinero(p.precio) + "</div>" +
        '<div class="producto-fila__acciones">' +
          '<button class="btn btn--fantasma btn--sm" data-accion="editar-producto" data-id="' + p.idNumerico + '">Editar</button>' +
          '<button class="btn btn--peligro btn--sm" data-accion="borrar-producto" data-id="' + p.idNumerico + '">Borrar</button>' +
        "</div>" +
      "</div>"
    );
  }

  /* ---------- Categorías ---------- */
  function formularioCategoria(cat) {
    return (
      UI.campoTexto("nombre", "Nombre de la categoría", cat ? cat.nombre : "", { requerido: true, placeholder: "Ej. Pollos y Paquetes" }) +
      '<div class="fila-campos">' +
        UI.campoTexto("emoji", "Emoji", cat ? cat.emoji : "", { placeholder: "🍗" }) +
        UI.campoTexto("orden", "Orden", cat ? cat.orden : 99, { tipo: "number", min: 0 }) +
      "</div>" +
      UI.campoCheck("activo", "Mostrar en el sitio", cat ? cat.activo : true)
    );
  }

  function nuevaCategoria() {
    UI.abrirModal("Nueva categoría", formularioCategoria(null), async function (valores) {
      await API.crearCategoria(valores);
      UI.cerrarModal();
      UI.aviso("Categoría creada.");
      await cargar();
    });
  }

  function editarCategoria(id) {
    var cat = categorias.find(function (c) { return c.idNumerico === id; });
    if (!cat) return;
    UI.abrirModal("Editar categoría", formularioCategoria(cat), async function (valores) {
      await API.actualizarCategoria(id, valores);
      UI.cerrarModal();
      UI.aviso("Categoría actualizada.");
      await cargar();
    });
  }

  async function borrarCategoria(id) {
    var cat = categorias.find(function (c) { return c.idNumerico === id; });
    if (!cat) return;
    var mensaje =
      'Se borrará la categoría "' + cat.nombre + '"' +
      (cat.productos.length ? " y sus " + cat.productos.length + " productos" : "") +
      ". Esta acción no se puede deshacer. ¿Continuar?";
    if (!UI.confirmar(mensaje)) return;

    try {
      await API.borrarCategoria(id);
      UI.aviso("Categoría eliminada.");
      await cargar();
    } catch (e) {
      UI.error(e);
    }
  }

  /* ---------- Productos ---------- */
  function formularioProducto(producto, categoriaId) {
    var opcionesCategorias = categorias.map(function (c) {
      return { valor: c.idNumerico, texto: c.nombre };
    });

    return (
      UI.campoTexto("nombre", "Nombre del producto", producto ? producto.nombre : "", { requerido: true, placeholder: "Ej. Pollo Entero Asado" }) +
      UI.campoArea("descripcion", "Descripción", producto ? producto.descripcion : "", "Corta y antojable. Aparece debajo del nombre.") +
      '<div class="fila-campos">' +
        UI.campoTexto("precio", "Precio (MXN)", producto ? producto.precio : "", { tipo: "number", paso: "0.01", min: 0, requerido: true }) +
        UI.campoSelect("categoria_id", "Categoría", producto ? producto.categoria_id : categoriaId, opcionesCategorias) +
      "</div>" +
      '<div class="fila-campos">' +
        UI.campoTexto("etiqueta", "Etiqueta", producto ? producto.etiqueta : "", { placeholder: "Ej. El más pedido" }) +
        UI.campoTexto("orden", "Orden", producto ? producto.orden : 99, { tipo: "number", min: 0 }) +
      "</div>" +
      UI.campoImagen("imagen", "Foto del producto", producto ? producto.imagen : "", "menu") +
      UI.campoCheck("activo", "Mostrar en el sitio", producto ? Boolean(producto.activo) : true) +
      editorOpciones(producto ? producto.opciones : [])
    );
  }

  /** Editor de grupos de opciones (tortillas, tamaño, etc.). */
  function editorOpciones(opciones) {
    var grupos = (opciones || []).map(plantillaGrupoOpcion).join("");
    return (
      '<div class="campo"><span>Opciones del producto</span>' +
        '<small>Variantes que el cliente elige (ej. Tortillas: Maíz / Harina +$20).</small>' +
        '<div class="opciones-editor" id="opciones-editor">' + grupos + "</div>" +
        '<button type="button" class="btn btn--fantasma btn--sm" id="btn-agregar-grupo" style="align-self:flex-start;margin-top:.5rem">+ Agregar grupo de opciones</button>' +
      "</div>"
    );
  }

  function plantillaGrupoOpcion(opcion) {
    var elecciones = (opcion && opcion.elecciones ? opcion.elecciones : [{ etiqueta: "", extra: 0 }])
      .map(plantillaEleccion)
      .join("");
    return (
      '<div class="opcion-grupo" data-grupo>' +
        '<div class="opcion-grupo__head">' +
          '<label class="campo"><span>Nombre del grupo</span>' +
            '<input type="text" data-grupo-etiqueta value="' + UI.escapar(opcion ? opcion.etiqueta : "") + '" placeholder="Ej. Tortillas"></label>' +
          '<button type="button" class="mini-btn" data-borrar-grupo title="Quitar grupo">✕</button>' +
        "</div>" +
        '<div data-elecciones>' + elecciones + "</div>" +
        '<button type="button" class="btn btn--fantasma btn--sm" data-agregar-eleccion>+ Opción</button>' +
      "</div>"
    );
  }

  function plantillaEleccion(eleccion) {
    return (
      '<div class="eleccion-fila" data-eleccion>' +
        '<input type="text" data-eleccion-etiqueta value="' + UI.escapar(eleccion ? eleccion.etiqueta : "") + '" placeholder="Ej. Maíz">' +
        '<input type="number" step="0.01" min="0" data-eleccion-extra value="' + (eleccion ? Number(eleccion.extra) : 0) + '" placeholder="Extra $">' +
        '<button type="button" class="mini-btn" data-borrar-eleccion title="Quitar">✕</button>' +
      "</div>"
    );
  }

  /** Lee el editor de opciones y arma el arreglo que espera la API. */
  function leerOpciones() {
    return UI.$$("#opciones-editor [data-grupo]")
      .map(function (grupo) {
        var etiqueta = UI.$("[data-grupo-etiqueta]", grupo).value.trim();
        var elecciones = UI.$$("[data-eleccion]", grupo)
          .map(function (fila) {
            return {
              etiqueta: UI.$("[data-eleccion-etiqueta]", fila).value.trim(),
              extra: Number(UI.$("[data-eleccion-extra]", fila).value) || 0,
            };
          })
          .filter(function (e) { return e.etiqueta; });
        return { etiqueta: etiqueta, elecciones: elecciones };
      })
      .filter(function (g) { return g.etiqueta && g.elecciones.length; });
  }

  /** Conecta los botones del editor de opciones (se llama tras abrir el modal). */
  function activarEditorOpciones() {
    var editor = UI.$("#opciones-editor");
    var agregar = UI.$("#btn-agregar-grupo");
    if (!editor || !agregar) return;

    agregar.addEventListener("click", function () {
      editor.insertAdjacentHTML("beforeend", plantillaGrupoOpcion(null));
    });

    editor.addEventListener("click", function (evento) {
      var boton = evento.target.closest("button");
      if (!boton) return;

      if (boton.hasAttribute("data-borrar-grupo")) {
        boton.closest("[data-grupo]").remove();
      } else if (boton.hasAttribute("data-agregar-eleccion")) {
        UI.$("[data-elecciones]", boton.closest("[data-grupo]"))
          .insertAdjacentHTML("beforeend", plantillaEleccion(null));
      } else if (boton.hasAttribute("data-borrar-eleccion")) {
        var fila = boton.closest("[data-eleccion]");
        var contenedor = fila.parentElement;
        fila.remove();
        if (!contenedor.children.length) {
          contenedor.insertAdjacentHTML("beforeend", plantillaEleccion(null));
        }
      }
    });
  }

  function nuevoProducto(categoriaId) {
    if (!categorias.length) {
      UI.aviso("Primero crea una categoría.", true);
      return;
    }
    var id = categoriaId || categorias[0].idNumerico;
    UI.abrirModal("Nuevo producto", formularioProducto(null, id), async function (valores) {
      valores.opciones = leerOpciones();
      await API.crearProducto(valores);
      UI.cerrarModal();
      UI.aviso("Producto creado.");
      await cargar();
    });
    UI.activarSubidas(UI.$("#modal-form"));
    activarEditorOpciones();
  }

  async function editarProducto(id) {
    try {
      var respuesta = await API.producto(id);
      var producto = respuesta.producto;
      UI.abrirModal("Editar producto", formularioProducto(producto, producto.categoria_id), async function (valores) {
        valores.opciones = leerOpciones();
        await API.actualizarProducto(id, valores);
        UI.cerrarModal();
        UI.aviso("Producto actualizado.");
        await cargar();
      });
      UI.activarSubidas(UI.$("#modal-form"));
      activarEditorOpciones();
    } catch (e) {
      UI.error(e);
    }
  }

  async function borrarProducto(id) {
    if (!UI.confirmar("¿Borrar este producto? No se puede deshacer.")) return;
    try {
      await API.borrarProducto(id);
      UI.aviso("Producto eliminado.");
      await cargar();
    } catch (e) {
      UI.error(e);
    }
  }

  /* ---------- Eventos ---------- */
  function iniciar() {
    UI.$("#btn-nueva-categoria").addEventListener("click", nuevaCategoria);
    UI.$("#btn-nuevo-producto").addEventListener("click", function () { nuevoProducto(null); });

    UI.$("#lista-menu").addEventListener("click", function (evento) {
      var boton = evento.target.closest("[data-accion]");
      if (!boton) return;
      var id = Number(boton.dataset.id);

      switch (boton.dataset.accion) {
        case "agregar-producto": return nuevoProducto(id);
        case "editar-categoria": return editarCategoria(id);
        case "borrar-categoria": return borrarCategoria(id);
        case "editar-producto": return editarProducto(id);
        case "borrar-producto": return borrarProducto(id);
        default: return undefined;
      }
    });
  }

  return { iniciar: iniciar, cargar: cargar };
})(UI, API);
