/* ============================================================
   Vista "Configuración": teléfonos, horarios, redes y avisos
   ============================================================ */

var VistaConfiguracion = (function (UI, API) {
  "use strict";

  var TITULOS = {
    general: "Datos del negocio",
    contacto: "Teléfonos y WhatsApp",
    redes: "Redes sociales",
    avisos: "Avisos legales",
  };

  var claves = [];

  async function cargar() {
    var respuesta = await API.configuracion();
    claves = respuesta.configuracion;
    pintar();
  }

  function pintar() {
    var porGrupo = claves.reduce(function (acc, fila) {
      (acc[fila.grupo] = acc[fila.grupo] || []).push(fila);
      return acc;
    }, {});

    UI.$("#form-configuracion").innerHTML = Object.keys(porGrupo)
      .map(function (grupo) {
        var campos = porGrupo[grupo]
          .map(function (fila) {
            var largo = String(fila.valor || "").length > 70;
            return largo
              ? UI.campoArea(fila.clave, fila.descripcion || fila.clave, fila.valor)
              : UI.campoTexto(fila.clave, fila.descripcion || fila.clave, fila.valor, {
                  ayuda: fila.clave,
                });
          })
          .join("");
        return (
          '<section class="config__grupo">' +
            "<h3>" + UI.escapar(TITULOS[grupo] || grupo) + "</h3>" +
            '<div class="config__campos">' + campos + "</div>" +
          "</section>"
        );
      })
      .join("");
  }

  async function guardar() {
    var boton = UI.$("#btn-guardar-config");
    var cambios = {};
    UI.$$("#form-configuracion [name]").forEach(function (campo) {
      cambios[campo.name] = campo.value;
    });

    boton.disabled = true;
    try {
      await API.guardarConfiguracion(cambios);
      UI.aviso("Configuración guardada. Refresca el sitio para verla.");
      await cargar();
    } catch (e) {
      UI.error(e);
    } finally {
      boton.disabled = false;
    }
  }

  function iniciar() {
    UI.$("#btn-guardar-config").addEventListener("click", guardar);
    UI.$("#form-configuracion").addEventListener("submit", function (e) {
      e.preventDefault();
      guardar();
    });
  }

  return { iniciar: iniciar, cargar: cargar };
})(UI, API);
