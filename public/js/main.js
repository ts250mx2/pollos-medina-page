/* ============================================================
   Pollo Medina — Arranque, navegación y detalles de la página
   ============================================================ */

(function (Utils, config) {
  "use strict";

  document.addEventListener("DOMContentLoaded", async function () {
    // Primero los datos (API o respaldo estático), luego se dibuja todo.
    var datos = await PM_Datos.cargar();

    PM_Menu.iniciar(datos.menu);
    PM_CarritoUI.iniciar();
    aplicarDestacados(datos.destacados);
    pintarDatosDeContacto();
    pintarRedes();
    pintarSucursales();
    activarMenuMovil();
    activarHeaderPegado();
    activarAnimacionScroll();
    activarNavActiva();
  });

  /**
   * Aplica la foto principal (hero) y las promociones elegidas en el panel.
   * Si no hay datos, se conserva el contenido escrito en el HTML.
   */
  function aplicarDestacados(destacados) {
    if (!destacados) return;
    if (destacados.hero) aplicarHero(destacados.hero);
    if (destacados.promos && destacados.promos.length) pintarPromos(destacados.promos);
  }

  function aplicarHero(hero) {
    var marco = Utils.$(".hero__marco");
    if (!marco) return;

    // Foto: la del producto elegido; si no tiene, se queda el panel de marca.
    var foto = Utils.$(".hero__marco-foto", marco);
    if (hero.img) {
      if (!foto) {
        foto = document.createElement("img");
        foto.className = "hero__marco-foto";
        marco.appendChild(foto);
      }
      foto.alt = hero.nombre || "";
      foto.src = hero.img;
    } else if (foto) {
      foto.remove();
    }

    var cinta = Utils.$(".hero__cinta");
    if (cinta) cinta.textContent = hero.etiqueta || "Especialidad de la casa";

    var precio = Utils.$(".hero__sello b");
    if (precio) precio.textContent = Utils.dinero(hero.precio);

    var sub = Utils.$(".hero__sello small");
    if (sub) sub.textContent = hero.subtitulo || hero.nombre || "";
  }

  function pintarPromos(promos) {
    var grid = Utils.$("#promos-grid");
    if (!grid) return;

    grid.innerHTML = promos
      .map(function (promo, i) {
        var destacada = i === 0;
        var color = destacada ? "etiqueta--amarilla" : "etiqueta--roja";
        var boton = destacada ? "btn--amarillo" : "btn--rojo";
        var textoBoton = destacada ? "Pedir esta promo" : "Ver el paquete";

        var media =
          '<div class="promo__media">' +
          (promo.img
            ? '<img src="' + Utils.escapar(promo.img) + '" alt="' + Utils.escapar(promo.nombre) + '" loading="lazy">'
            : "") +
          "</div>";

        return (
          '<article class="promo ' + (destacada ? "promo--destacada textura-papel " : "") + 'aparece visible">' +
            media +
            '<div class="promo__cuerpo">' +
              (promo.etiqueta
                ? '<span class="etiqueta ' + color + '" style="align-self:flex-start">' + Utils.escapar(promo.etiqueta) + "</span>"
                : "") +
              '<h3 class="promo__titulo">' + Utils.escapar(promo.nombre) + "</h3>" +
              (promo.desc ? '<p class="promo__desc">' + Utils.escapar(promo.desc) + "</p>" : "") +
              '<span class="promo__precio">' + Utils.dinero(promo.precio) + "</span>" +
              '<a class="btn ' + boton + '" href="#menu">' + textoBoton + "</a>" +
              (destacada ? '<p class="promo__legal" data-aviso-precios></p>' : "") +
            "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  /** Coloca las ligas reales de redes sociales donde estén marcadas. */
  function pintarRedes() {
    var redes = config.redes || {};
    Utils.$$("[data-red]").forEach(function (nodo) {
      var url = redes[nodo.dataset.red];
      if (url) {
        nodo.href = url;
      } else {
        nodo.hidden = true;
      }
    });
  }

  /** Rellena teléfonos y enlaces de WhatsApp marcados con data-*. */
  function pintarDatosDeContacto() {
    var mensajeBase =
      "¡Hola! Vengo de la página de " + config.marca + " y quiero hacer un pedido 🍗";

    Utils.$$("[data-wa]").forEach(function (nodo) {
      nodo.href = Utils.enlaceWhatsApp(config.whatsapp.numero, mensajeBase);
    });
    Utils.$$("[data-wa-texto]").forEach(function (nodo) {
      nodo.textContent = config.whatsapp.visible;
    });
    Utils.$$("[data-tel]").forEach(function (nodo) {
      nodo.href = "tel:" + config.telefono.tel;
    });
    Utils.$$("[data-tel-texto]").forEach(function (nodo) {
      nodo.textContent = config.telefono.visible;
    });
    Utils.$$("[data-horario]").forEach(function (nodo) {
      nodo.textContent = config.horario;
    });
    Utils.$$("[data-aviso-precios]").forEach(function (nodo) {
      nodo.textContent = config.avisoPrecios + " " + config.costoEnvioTexto;
    });
    Utils.$$("[data-anio]").forEach(function (nodo) {
      nodo.textContent = new Date().getFullYear();
    });
  }

  function pintarSucursales() {
    var contenedor = Utils.$("#lista-sucursales");
    if (!contenedor) return;

    contenedor.innerHTML = config.sucursales
      .map(function (s) {
        return (
          '<article class="sucursal aparece">' +
            (s.imagen
              ? '<img class="sucursal__foto" src="' + Utils.escapar(s.imagen) +
                '" alt="Sucursal ' + Utils.escapar(s.nombre) + '" loading="lazy" width="600" height="340">'
              : "") +
            "<h3>" + Utils.escapar(s.nombre) + "</h3>" +
            '<p class="sucursal__dato">' + icono("pin") + "<span>" + Utils.escapar(s.direccion) + "</span></p>" +
            '<p class="sucursal__dato">' + icono("reloj") + "<span>" + Utils.escapar(s.horario) + "</span></p>" +
            '<p class="sucursal__dato">' + icono("tel") + "<span>" + Utils.escapar(s.telefono) + "</span></p>" +
            '<div class="sucursal__links">' +
              '<a class="btn btn--negro btn--sm" href="' + Utils.escapar(s.mapa) + '" target="_blank" rel="noopener">Cómo llegar</a>' +
              '<button class="btn btn--amarillo btn--sm" data-abrir-carrito type="button">Pedir aquí</button>' +
            "</div>" +
          "</article>"
        );
      })
      .join("");

    // Los botones recién creados también deben abrir el carrito.
    Utils.$$("#lista-sucursales [data-abrir-carrito]").forEach(function (boton) {
      boton.addEventListener("click", function () {
        var principal = Utils.$("#btn-carrito");
        if (principal) principal.click();
      });
    });
  }

  var ICONOS = {
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>',
    reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    tel: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  };

  function icono(nombre) {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONOS[nombre] + "</svg>"
    );
  }

  function activarMenuMovil() {
    var boton = Utils.$("#btn-menu-movil");
    var menu = Utils.$("#nav-movil");
    if (!boton || !menu) return;

    boton.addEventListener("click", function () {
      var abierto = menu.classList.toggle("abierto");
      boton.setAttribute("aria-expanded", String(abierto));
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName !== "A") return;
      menu.classList.remove("abierto");
      boton.setAttribute("aria-expanded", "false");
    });
  }

  function activarHeaderPegado() {
    var header = Utils.$("#header");
    if (!header) return;
    var alPasar = function () {
      header.classList.toggle("pegado", window.scrollY > 12);
    };
    window.addEventListener("scroll", alPasar, { passive: true });
    alPasar();
  }

  function activarAnimacionScroll() {
    if (!("IntersectionObserver" in window)) {
      Utils.$$(".aparece").forEach(function (n) { n.classList.add("visible"); });
      return;
    }
    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          entrada.target.classList.add("visible");
          observador.unobserve(entrada.target);
        });
      },
      { rootMargin: "0px 0px -60px 0px", threshold: 0.08 }
    );
    Utils.$$(".aparece").forEach(function (n) { observador.observe(n); });
  }

  function activarNavActiva() {
    var enlaces = Utils.$$(".nav__lista a[href^='#']");
    var secciones = enlaces
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!secciones.length || !("IntersectionObserver" in window)) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          enlaces.forEach(function (a) {
            a.classList.toggle("activo", a.getAttribute("href") === "#" + entrada.target.id);
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    secciones.forEach(function (s) { observador.observe(s); });
  }
})(PM_Utils, PM_CONFIG);
