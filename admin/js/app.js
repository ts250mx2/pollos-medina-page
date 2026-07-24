/* ============================================================
   Arranque del panel: sesión, pestañas y carga de vistas
   ============================================================ */

(function (UI, API) {
  "use strict";

  var VISTAS = {
    menu: VistaMenu,
    portada: VistaPortada,
    sucursales: VistaSucursales,
    configuracion: VistaConfiguracion,
    cuenta: null,
  };

  var cargadas = {};

  document.addEventListener("DOMContentLoaded", async function () {
    UI.iniciarModal();
    conectarLogin();
    conectarPanel();

    try {
      var sesion = await API.yo();
      entrarAlPanel(sesion.usuario);
    } catch (error) {
      mostrarLogin();
    }
  });

  /* ---------- Login ---------- */
  function conectarLogin() {
    UI.$("#form-login").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      var boton = evento.target.querySelector('button[type="submit"]');
      var error = UI.$("#login-error");
      error.hidden = true;
      boton.disabled = true;

      try {
        var respuesta = await API.login(
          evento.target.elements.usuario.value.trim(),
          evento.target.elements.password.value
        );
        evento.target.reset();
        entrarAlPanel(respuesta.usuario);
      } catch (e) {
        error.textContent = e.message;
        error.hidden = false;
      } finally {
        boton.disabled = false;
      }
    });
  }

  function mostrarLogin() {
    UI.$("#pantalla-login").hidden = false;
    UI.$("#pantalla-panel").hidden = true;
    cargadas = {};
  }

  async function entrarAlPanel(usuario) {
    UI.$("#pantalla-login").hidden = true;
    UI.$("#pantalla-panel").hidden = false;
    UI.$("#usuario-actual").textContent = usuario.nombre || usuario.usuario;
    await mostrarVista("menu");
  }

  /* ---------- Panel ---------- */
  function conectarPanel() {
    VistaMenu.iniciar();
    VistaPortada.iniciar();
    VistaSucursales.iniciar();
    VistaConfiguracion.iniciar();
    conectarCambioPassword();

    UI.$$(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () { mostrarVista(tab.dataset.vista); });
    });

    UI.$("#btn-salir").addEventListener("click", async function () {
      try {
        await API.logout();
      } finally {
        mostrarLogin();
      }
    });
  }

  async function mostrarVista(nombre) {
    UI.$$(".tab").forEach(function (tab) {
      tab.setAttribute("aria-selected", String(tab.dataset.vista === nombre));
    });
    UI.$$(".vista").forEach(function (vista) {
      vista.hidden = vista.id !== "vista-" + nombre;
    });

    var modulo = VISTAS[nombre];
    if (!modulo || cargadas[nombre]) return;

    try {
      await modulo.cargar();
      cargadas[nombre] = true;
    } catch (error) {
      if (error.estado === 401) return mostrarLogin();
      UI.error(error);
    }
  }

  /* ---------- Cambio de contraseña ---------- */
  function conectarCambioPassword() {
    UI.$("#form-password").addEventListener("submit", async function (evento) {
      evento.preventDefault();
      var campos = evento.target.elements;

      if (campos.nueva.value !== campos.repetir.value) {
        return UI.aviso("Las contraseñas nuevas no coinciden.", true);
      }
      if (campos.nueva.value.length < 8) {
        return UI.aviso("La contraseña debe tener al menos 8 caracteres.", true);
      }

      try {
        await API.cambiarPassword(campos.actual.value, campos.nueva.value);
        evento.target.reset();
        UI.aviso("Contraseña cambiada. Vuelve a entrar.");
        setTimeout(mostrarLogin, 1200);
      } catch (e) {
        UI.error(e);
      }
      return undefined;
    });
  }
})(UI, API);
