/* ============================================================
   Pollo Medina — Panel del carrito y envío del pedido a WhatsApp
   ============================================================ */

var PM_CarritoUI = (function (Utils, Carrito, config) {
  "use strict";

  var lineas = [];
  var nodos = {};

  function iniciar() {
    nodos = {
      panel: Utils.$("#carrito"),
      fondo: Utils.$("#carrito-fondo"),
      abrir: Utils.$$("[data-abrir-carrito]"),
      cerrar: Utils.$("#carrito-cerrar"),
      cuerpo: Utils.$("#carrito-lineas"),
      formulario: Utils.$("#form-pedido"),
      pie: Utils.$("#carrito-pie"),
      total: Utils.$("#carrito-total"),
      contador: Utils.$("#carrito-contador"),
      botonEnviar: Utils.$("#enviar-pedido"),
      vaciar: Utils.$("#vaciar-carrito"),
      sucursal: Utils.$("#pedido-sucursal"),
      direccion: Utils.$("#campo-direccion"),
    };
    if (!nodos.panel) return;

    llenarSucursales();
    lineas = Carrito.cargar();
    pintar();

    document.addEventListener("pm:agregar", function (e) { agregar(e.detail); });
    nodos.abrir.forEach(function (b) { b.addEventListener("click", abrir); });
    nodos.cerrar.addEventListener("click", cerrar);
    nodos.fondo.addEventListener("click", cerrar);
    nodos.cuerpo.addEventListener("click", alClicLinea);
    nodos.vaciar.addEventListener("click", alVaciar);
    nodos.formulario.addEventListener("submit", alEnviar);
    nodos.formulario.addEventListener("change", alCambiarTipo);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") cerrar();
    });
  }

  /* ---------- Estado ---------- */
  function agregar(linea) {
    lineas = Carrito.agregar(lineas, linea);
    Carrito.guardar(lineas);
    pintar();
    Utils.toast("¡Agregado! " + linea.nombre);
    animarBoton();
  }

  function alClicLinea(evento) {
    var boton = evento.target.closest("[data-accion]");
    if (!boton) return;
    var clave = boton.closest(".linea").dataset.clave;

    if (boton.dataset.accion === "mas") lineas = Carrito.cambiarCantidad(lineas, clave, 1);
    if (boton.dataset.accion === "menos") lineas = Carrito.cambiarCantidad(lineas, clave, -1);
    if (boton.dataset.accion === "quitar") lineas = Carrito.quitar(lineas, clave);

    Carrito.guardar(lineas);
    pintar();
  }

  function alVaciar() {
    if (!lineas.length) return;
    if (!window.confirm("¿Vaciar todo el pedido?")) return;
    lineas = Carrito.vaciar();
    Carrito.guardar(lineas);
    pintar();
  }

  /* ---------- Render ---------- */
  function pintar() {
    var piezas = Carrito.totalPiezas(lineas);
    nodos.contador.textContent = piezas;
    nodos.contador.hidden = piezas === 0;
    nodos.total.textContent = Utils.dinero(Carrito.subtotal(lineas));
    nodos.botonEnviar.disabled = piezas === 0;
    nodos.formulario.hidden = piezas === 0;
    nodos.vaciar.hidden = piezas === 0;

    nodos.cuerpo.innerHTML = lineas.length
      ? lineas.map(plantillaLinea).join("")
      : '<div class="carrito__vacio"><span aria-hidden="true">🛒</span>' +
        "<p><strong>Tu pedido está vacío.</strong><br>Agrega algo del menú y arma tu antojo.</p></div>";
  }

  function plantillaLinea(l) {
    return (
      '<div class="linea" data-clave="' + Utils.escapar(l.clave) + '">' +
        "<div>" +
          '<p class="linea__nombre">' + Utils.escapar(l.nombre) + "</p>" +
          (l.opciones && l.opciones.length
            ? '<p class="linea__opts">' + Utils.escapar(l.opciones.join(" · ")) + "</p>"
            : "") +
        "</div>" +
        '<p class="linea__precio">' + Utils.dinero(l.precio * l.cantidad) + "</p>" +
        '<div class="qty">' +
          '<button type="button" data-accion="menos" aria-label="Quitar uno de ' + Utils.escapar(l.nombre) + '">−</button>' +
          "<span>" + l.cantidad + "</span>" +
          '<button type="button" data-accion="mas" aria-label="Agregar uno de ' + Utils.escapar(l.nombre) + '">+</button>' +
        "</div>" +
        '<button type="button" class="linea__quitar" data-accion="quitar">Quitar</button>' +
      "</div>"
    );
  }

  function llenarSucursales() {
    if (!nodos.sucursal) return;
    nodos.sucursal.innerHTML = config.sucursales
      .map(function (s) {
        return '<option value="' + Utils.escapar(s.nombre) + '">' + Utils.escapar(s.nombre) + "</option>";
      })
      .join("");
  }

  /* ---------- Apertura / cierre ---------- */
  function abrir() {
    nodos.panel.classList.add("abierto");
    nodos.fondo.classList.add("abierto");
    document.body.classList.add("is-locked");
    nodos.cerrar.focus();
  }

  function cerrar() {
    nodos.panel.classList.remove("abierto");
    nodos.fondo.classList.remove("abierto");
    document.body.classList.remove("is-locked");
  }

  function animarBoton() {
    var boton = Utils.$("#btn-carrito");
    if (!boton) return;
    boton.classList.remove("late");
    void boton.offsetWidth;
    boton.classList.add("late");
  }

  /* ---------- Envío del pedido ---------- */
  function alCambiarTipo(evento) {
    if (evento.target.name !== "tipo") return;
    var esDomicilio = evento.target.value === "domicilio";
    nodos.direccion.hidden = !esDomicilio;
    Utils.$("#pedido-direccion").required = esDomicilio;
  }

  function alEnviar(evento) {
    evento.preventDefault();
    if (!lineas.length) return;

    var datos = leerFormulario();
    var error = validar(datos);
    if (error) {
      Utils.toast(error.mensaje);
      var campo = Utils.$("#" + error.campo);
      if (campo) campo.focus();
      return;
    }

    var url = Utils.enlaceWhatsApp(config.whatsapp.numero, construirMensaje(datos));
    window.open(url, "_blank", "noopener");
    Utils.toast("Abriendo WhatsApp con tu pedido…");
  }

  function leerFormulario() {
    var f = nodos.formulario;
    return {
      tipo: f.elements.tipo.value,
      nombre: f.elements.nombre.value.trim(),
      telefono: f.elements.telefono.value.trim(),
      direccion: f.elements.direccion.value.trim(),
      sucursal: f.elements.sucursal.value,
      pago: f.elements.pago.value,
      notas: f.elements.notas.value.trim(),
    };
  }

  function validar(datos) {
    if (datos.nombre.length < 2) {
      return { campo: "pedido-nombre", mensaje: "Escribe tu nombre, por favor." };
    }
    if (datos.telefono.replace(/\D/g, "").length < 10) {
      return { campo: "pedido-telefono", mensaje: "Escribe un teléfono de 10 dígitos." };
    }
    if (datos.tipo === "domicilio" && datos.direccion.length < 8) {
      return { campo: "pedido-direccion", mensaje: "Necesitamos tu dirección completa." };
    }
    return null;
  }

  function construirMensaje(datos) {
    var esDomicilio = datos.tipo === "domicilio";
    var partes = [
      "*NUEVO PEDIDO — " + config.marca + "*",
      "──────────────",
    ];

    lineas.forEach(function (l) {
      partes.push(
        "• " + l.cantidad + "x " + l.nombre +
        (l.opciones && l.opciones.length ? " (" + l.opciones.join(", ") + ")" : "") +
        " — " + Utils.dinero(l.precio * l.cantidad)
      );
    });

    partes.push("──────────────");
    partes.push("*Subtotal: " + Utils.dinero(Carrito.subtotal(lineas)) + "*");
    partes.push("");
    partes.push("*Entrega:* " + (esDomicilio ? "A domicilio" : "Paso a recoger"));
    partes.push("*Sucursal:* " + datos.sucursal);
    partes.push("*Nombre:* " + datos.nombre);
    partes.push("*Teléfono:* " + datos.telefono);
    if (esDomicilio) partes.push("*Dirección:* " + datos.direccion);
    partes.push("*Pago:* " + datos.pago);
    if (datos.notas) partes.push("*Notas:* " + datos.notas);
    partes.push("");
    partes.push(esDomicilio ? "_" + config.costoEnvioTexto + "_" : "_Gracias por su preferencia._");

    return partes.join("\n");
  }

  return { iniciar: iniciar };
})(PM_Utils, PM_Carrito, PM_CONFIG);
