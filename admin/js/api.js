/* ============================================================
   Cliente de la API del panel
   ============================================================ */

var API = (function () {
  "use strict";

  var BASE = "/api";

  async function peticion(ruta, opciones) {
    var config = Object.assign({ credentials: "same-origin", headers: {} }, opciones);

    if (config.cuerpo !== undefined) {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.cuerpo);
      delete config.cuerpo;
    }

    var respuesta = await fetch(BASE + ruta, config);
    var datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {
      datos = null;
    }

    if (!respuesta.ok) {
      var mensaje = (datos && datos.error) || "Error " + respuesta.status;
      var fallo = new Error(mensaje);
      fallo.estado = respuesta.status;
      throw fallo;
    }
    return datos;
  }

  var get = function (ruta) { return peticion(ruta, { method: "GET" }); };
  var post = function (ruta, cuerpo) { return peticion(ruta, { method: "POST", cuerpo: cuerpo }); };
  var put = function (ruta, cuerpo) { return peticion(ruta, { method: "PUT", cuerpo: cuerpo }); };
  var borrar = function (ruta) { return peticion(ruta, { method: "DELETE" }); };

  /** Sube una imagen y devuelve su URL pública. */
  async function subirImagen(archivo, carpeta) {
    var datos = new FormData();
    datos.append("imagen", archivo);
    var respuesta = await fetch(BASE + "/admin/subidas?carpeta=" + encodeURIComponent(carpeta), {
      method: "POST",
      body: datos,
      credentials: "same-origin",
    });
    var json = await respuesta.json().catch(function () { return null; });
    if (!respuesta.ok) throw new Error((json && json.error) || "No se pudo subir la imagen.");
    return json.url;
  }

  return {
    login: function (usuario, password) { return post("/auth/login", { usuario: usuario, password: password }); },
    logout: function () { return post("/auth/logout", {}); },
    yo: function () { return get("/auth/yo"); },
    cambiarPassword: function (actual, nueva) { return put("/auth/password", { actual: actual, nueva: nueva }); },

    menu: function () { return get("/admin/menu"); },
    categorias: function () { return get("/admin/categorias"); },
    crearCategoria: function (datos) { return post("/admin/categorias", datos); },
    actualizarCategoria: function (id, datos) { return put("/admin/categorias/" + id, datos); },
    borrarCategoria: function (id) { return borrar("/admin/categorias/" + id); },

    producto: function (id) { return get("/admin/productos/" + id); },
    crearProducto: function (datos) { return post("/admin/productos", datos); },
    actualizarProducto: function (id, datos) { return put("/admin/productos/" + id, datos); },
    borrarProducto: function (id) { return borrar("/admin/productos/" + id); },

    sucursales: function () { return get("/admin/sucursales"); },
    sucursal: function (id) { return get("/admin/sucursales/" + id); },
    crearSucursal: function (datos) { return post("/admin/sucursales", datos); },
    actualizarSucursal: function (id, datos) { return put("/admin/sucursales/" + id, datos); },
    borrarSucursal: function (id) { return borrar("/admin/sucursales/" + id); },

    configuracion: function () { return get("/admin/configuracion"); },
    guardarConfiguracion: function (cambios) { return put("/admin/configuracion", cambios); },

    destacados: function () { return get("/admin/destacados"); },
    guardarHero: function (datos) { return put("/admin/destacados/hero", datos); },
    guardarPromos: function (promos) { return put("/admin/destacados/promos", { promos: promos }); },

    subirImagen: subirImagen,
  };
})();
