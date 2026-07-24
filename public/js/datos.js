/* ============================================================
   Pollo Medina — Origen de los datos del sitio
   ------------------------------------------------------------
   Intenta leer el menú y la configuración desde la API (base de
   datos). Si el servidor no responde —por ejemplo al abrir el
   index.html directamente— usa los datos estáticos de
   js/data/menu.js para que la página siga funcionando.
   ============================================================ */

var PM_Datos = (function () {
  "use strict";

  var RUTA = "/api/publico/sitio";
  var ESPERA_MAX_MS = 4000;

  /**
   * Devuelve { menu, destacados, desdeApi }. Nunca lanza: si algo falla, cae al respaldo.
   * `destacados` es null cuando no hay API o no se ha elegido nada: en ese caso el
   * sitio conserva el hero y las promos que vienen escritos en el HTML.
   */
  async function cargar() {
    try {
      var controlador = new AbortController();
      var temporizador = setTimeout(function () { controlador.abort(); }, ESPERA_MAX_MS);

      var respuesta = await fetch(RUTA, { signal: controlador.signal });
      clearTimeout(temporizador);
      if (!respuesta.ok) throw new Error("HTTP " + respuesta.status);

      var datos = await respuesta.json();
      if (!datos || !datos.ok || !Array.isArray(datos.menu) || !datos.menu.length) {
        throw new Error("Respuesta sin menú");
      }

      // Se actualiza el objeto existente (no se reemplaza) para que los
      // módulos que ya lo capturaron vean los valores nuevos.
      Object.assign(PM_CONFIG, datos.config);

      return { menu: datos.menu, destacados: datos.destacados || null, desdeApi: true };
    } catch (error) {
      if (window.console && console.info) {
        console.info("Usando el menú estático de respaldo:", error.message);
      }
      return { menu: PM_MENU, destacados: null, desdeApi: false };
    }
  }

  return { cargar: cargar };
})();
