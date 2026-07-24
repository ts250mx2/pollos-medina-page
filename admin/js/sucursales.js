/* ============================================================
   Vista "Sucursales"
   ============================================================ */

var VistaSucursales = (function (UI, API) {
  "use strict";

  var sucursales = [];

  async function cargar() {
    var respuesta = await API.sucursales();
    sucursales = respuesta.sucursales;
    pintar();
  }

  function pintar() {
    var contenedor = UI.$("#lista-sucursales");
    if (!sucursales.length) {
      contenedor.innerHTML = '<p class="vacio">Aún no hay sucursales registradas.</p>';
      return;
    }
    contenedor.innerHTML = sucursales.map(plantilla).join("");
  }

  function plantilla(s) {
    var ubicacion = [s.direccion, s.colonia, s.ciudad].filter(Boolean).join(", ");
    return (
      '<article class="tarjeta" data-id="' + s.id + '">' +
        '<div class="tarjeta__foto">' +
          (s.imagen ? '<img src="' + UI.escapar(s.imagen) + '" alt="" loading="lazy">' : "🏪") +
        "</div>" +
        '<div class="tarjeta__cuerpo">' +
          "<h3>" + UI.escapar(s.nombre) +
            ' <span class="chip ' + (s.activo ? "chip--activo" : "chip--oculto") + '">' +
            (s.activo ? "Visible" : "Oculta") + "</span></h3>" +
          '<p class="tarjeta__dato">📍 ' + UI.escapar(ubicacion) + "</p>" +
          (s.telefono ? '<p class="tarjeta__dato">📞 ' + UI.escapar(s.telefono) + "</p>" : "") +
          (s.horario ? '<p class="tarjeta__dato">🕐 ' + UI.escapar(s.horario) + "</p>" : "") +
          (s.mapa_url ? '<p class="tarjeta__dato"><a href="' + UI.escapar(s.mapa_url) + '" target="_blank" rel="noopener">Ver en el mapa ↗</a></p>' : "") +
        "</div>" +
        '<div class="tarjeta__pie">' +
          '<button class="btn btn--fantasma btn--sm" data-accion="editar" data-id="' + s.id + '">Editar</button>' +
          '<button class="btn btn--peligro btn--sm" data-accion="borrar" data-id="' + s.id + '">Borrar</button>' +
        "</div>" +
      "</article>"
    );
  }

  function formulario(s) {
    return (
      UI.campoTexto("nombre", "Nombre de la sucursal", s ? s.nombre : "", { requerido: true, placeholder: "Ej. Eloy Cavazos" }) +
      UI.campoTexto("direccion", "Calle y número", s ? s.direccion : "", { requerido: true, placeholder: "Av. Eloy Cavazos #6907" }) +
      '<div class="fila-campos">' +
        UI.campoTexto("colonia", "Colonia", s ? s.colonia : "", { placeholder: "Santa María" }) +
        UI.campoTexto("ciudad", "Ciudad y estado", s ? s.ciudad : "", { placeholder: "Guadalupe, N.L." }) +
      "</div>" +
      '<div class="fila-campos">' +
        UI.campoTexto("telefono", "Teléfono", s ? s.telefono : "", { placeholder: "81 1469 6373" }) +
        UI.campoTexto("whatsapp", "WhatsApp (opcional)", s ? s.whatsapp : "", { placeholder: "81 2230 9008" }) +
      "</div>" +
      UI.campoTexto("horario", "Horario", s ? s.horario : "", { placeholder: "Lun a Dom · 11:00 – 21:00 h" }) +
      UI.campoTexto("mapa_url", "Enlace de Google Maps", s ? s.mapa_url : "", {
        placeholder: "https://share.google/…",
        ayuda: "Pega la liga que te da el botón Compartir de Google Maps.",
      }) +
      '<div class="fila-campos">' +
        UI.campoTexto("lat", "Latitud (opcional)", s ? s.lat : "", { tipo: "number", paso: "0.0000001" }) +
        UI.campoTexto("lng", "Longitud (opcional)", s ? s.lng : "", { tipo: "number", paso: "0.0000001" }) +
      "</div>" +
      UI.campoImagen("imagen", "Foto de la sucursal", s ? s.imagen : "", "sucursales") +
      '<div class="fila-campos">' +
        UI.campoTexto("orden", "Orden", s ? s.orden : 99, { tipo: "number", min: 0 }) +
        UI.campoCheck("activo", "Mostrar en el sitio", s ? s.activo : true) +
      "</div>"
    );
  }

  function nueva() {
    UI.abrirModal("Nueva sucursal", formulario(null), async function (valores) {
      await API.crearSucursal(valores);
      UI.cerrarModal();
      UI.aviso("Sucursal creada.");
      await cargar();
    });
    UI.activarSubidas(UI.$("#modal-form"));
  }

  function editar(id) {
    var s = sucursales.find(function (x) { return x.id === id; });
    if (!s) return;
    UI.abrirModal("Editar sucursal", formulario(s), async function (valores) {
      await API.actualizarSucursal(id, valores);
      UI.cerrarModal();
      UI.aviso("Sucursal actualizada.");
      await cargar();
    });
    UI.activarSubidas(UI.$("#modal-form"));
  }

  async function borrar(id) {
    var s = sucursales.find(function (x) { return x.id === id; });
    if (!s) return;
    if (!UI.confirmar('¿Borrar la sucursal "' + s.nombre + '"? No se puede deshacer.')) return;
    try {
      await API.borrarSucursal(id);
      UI.aviso("Sucursal eliminada.");
      await cargar();
    } catch (e) {
      UI.error(e);
    }
  }

  function iniciar() {
    UI.$("#btn-nueva-sucursal").addEventListener("click", nueva);
    UI.$("#lista-sucursales").addEventListener("click", function (evento) {
      var boton = evento.target.closest("[data-accion]");
      if (!boton) return;
      var id = Number(boton.dataset.id);
      if (boton.dataset.accion === "editar") editar(id);
      if (boton.dataset.accion === "borrar") borrar(id);
    });
  }

  return { iniciar: iniciar, cargar: cargar };
})(UI, API);
