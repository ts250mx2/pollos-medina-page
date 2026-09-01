"use client";

import React, { useState, useEffect } from "react";
import WansoftDashboard from "@/components/WansoftDashboard";
import SucursalExtrasModal from "@/components/SucursalExtrasModal";
import { descargarExcel, imprimirPDF } from "@/lib/exportar-sucursales";
import "./admin.css";

const formatDinero = (val: number) => {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
};

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);
  const [tabActivo, setTabActivo] = useState("dashboard");

  // Credenciales de login
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Datos del backend
  const [menu, setMenu] = useState<any[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [configuracion, setConfiguracion] = useState<any[]>([]);
  const [destacados, setDestacados] = useState<any>({ hero: null, promos: [] });

  // Contraseña en cuenta
  const [pwdActual, setPwdActual] = useState("");
  const [pwdNueva, setPwdNueva] = useState("");
  const [pwdRepetir, setPwdRepetir] = useState("");

  // Modales
  const [extrasSuc, setExtrasSuc] = useState<{ id: number; nombre: string } | null>(null);
  const [exportando, setExportando] = useState(false);
  const [modalType, setModalType] = useState<"categoria" | "producto" | "sucursal" | null>(null);
  const [modalEditItem, setModalEditItem] = useState<any>(null); // null para nuevo
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isModalSaving, setIsModalSaving] = useState(false);

  // Formularios en modales
  const [catNombre, setCatNombre] = useState("");
  const [catEmoji, setCatEmoji] = useState("");
  const [catOrden, setCatOrden] = useState(0);
  const [catActivo, setCatActivo] = useState(true);

  const [prodCategoriaId, setProdCategoriaId] = useState<number>(0);
  const [prodNombre, setProdNombre] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodPrecio, setProdPrecio] = useState(0);
  const [prodEtiqueta, setProdEtiqueta] = useState("");
  const [prodImagen, setProdImagen] = useState("");
  const [prodOrden, setProdOrden] = useState(0);
  const [prodActivo, setProdActivo] = useState(true);
  const [prodOpciones, setProdOpciones] = useState<any[]>([]); // { etiqueta: string, elecciones: { etiqueta: string, extra: number }[] }[]

  const [sucNombre, setSucNombre] = useState("");
  const [sucDireccion, setSucDireccion] = useState("");
  const [sucColonia, setSucColonia] = useState("");
  const [sucCiudad, setSucCiudad] = useState("");
  const [sucTelefono, setSucTelefono] = useState("");
  const [sucWhatsapp, setSucWhatsapp] = useState("");
  const [sucHorario, setSucHorario] = useState("");
  const [sucMapaUrl, setSucMapaUrl] = useState("");
  const [sucLat, setSucLat] = useState("");
  const [sucLng, setSucLng] = useState("");
  const [sucImagen, setSucImagen] = useState("");
  const [sucOrden, setSucOrden] = useState(0);
  const [sucActivo, setSucActivo] = useState(true);

  // Formulario Portada
  const [heroProductoId, setHeroProductoId] = useState<string>("");
  const [heroEtiqueta, setHeroEtiqueta] = useState("");
  const [heroSubtitulo, setHeroSubtitulo] = useState("");
  const [promosList, setPromosList] = useState<any[]>([]); // { productoId: number, etiqueta: string }[]

  // Cargar datos al montar
  useEffect(() => {
    verificarSesion();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2800);
  };

  // Exportar sucursales (con terminales y usuarios Wansoft) a Excel o PDF.
  const exportarSucursales = async (formato: "excel" | "pdf") => {
    if (exportando) return;
    setExportando(true);
    try {
      const res = await fetch("/api/admin/sucursales/exportar");
      const d = await res.json();
      if (!d.ok) { triggerToast(d.error || "No se pudo exportar."); return; }
      if (formato === "excel") {
        descargarExcel(d.sucursales);
      } else if (!imprimirPDF(d.sucursales)) {
        triggerToast("El navegador bloqueó la ventana de impresión. Habilítala e intenta de nuevo.");
      }
    } catch {
      triggerToast("Error de conexión al exportar.");
    } finally {
      setExportando(false);
    }
  };

  const verificarSesion = async () => {
    try {
      const res = await fetch("/api/auth/yo");
      const data = await res.json();
      if (data.ok) {
        setUsuario(data.usuario);
        await cargarDatosPanel();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: loginUsuario, password: loginPassword }),
      });
      const data = await res.json();
      if (data.ok) {
        setUsuario(data.usuario);
        await cargarDatosPanel();
      } else {
        setLoginError(data.error || "Error al iniciar sesión.");
      }
    } catch (err: any) {
      setLoginError("Error de conexión con el servidor.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUsuario(null);
    } catch (e) {
      console.error(e);
    }
  };

  const cargarDatosPanel = async () => {
    try {
      const [resMenu, resSuc, resConfig, resDest] = await Promise.all([
        fetch("/api/admin/menu"),
        fetch("/api/admin/sucursales"),
        fetch("/api/admin/configuracion"),
        fetch("/api/admin/destacados"),
      ]);

      const [dMenu, dSuc, dConfig, dDest] = await Promise.all([
        resMenu.json(),
        resSuc.json(),
        resConfig.json(),
        resDest.json(),
      ]);

      if (dMenu.ok) setMenu(dMenu.menu);
      if (dSuc.ok) setSucursales(dSuc.sucursales);
      if (dConfig.ok) setConfiguracion(dConfig.configuracion);
      if (dDest.ok) {
        setDestacados(dDest.destacados);
        setHeroProductoId(dDest.destacados.hero?.productoId || "");
        setHeroEtiqueta(dDest.destacados.hero?.etiqueta || "");
        setHeroSubtitulo(dDest.destacados.hero?.subtitulo || "");
        setPromosList(dDest.destacados.promos.map((p: any) => ({
          productoId: p.productoId,
          etiqueta: p.etiqueta || "",
        })));
      }
    } catch (e) {
      console.error("Error al cargar los datos", e);
    }
  };

  // Helper para subir archivos
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, carpeta: "menu" | "sucursales", callback: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("imagen", file);
    formData.append("carpeta", carpeta);

    try {
      triggerToast("Subiendo imagen…");
      const res = await fetch("/api/admin/subidas", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        callback(data.url);
        triggerToast("Imagen lista.");
      } else {
        alert(data.error || "Error al subir imagen.");
      }
    } catch (err) {
      alert("Error de conexión al subir imagen.");
    }
  };

  // CATEGORIAS CRUD
  const abrirModalCat = (cat: any = null) => {
    setModalType("categoria");
    setModalEditItem(cat);
    if (cat) {
      setCatNombre(cat.nombre);
      setCatEmoji(cat.emoji || "");
      setCatOrden(cat.orden);
      setCatActivo(cat.activo);
    } else {
      setCatNombre("");
      setCatEmoji("");
      setCatOrden(99);
      setCatActivo(true);
    }
  };

  const guardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalSaving(true);
    const body = { nombre: catNombre, emoji: catEmoji, orden: catOrden, activo: catActivo };
    const method = modalEditItem ? "PUT" : "POST";
    const url = modalEditItem ? `/api/admin/categorias/${modalEditItem.idNumerico}` : "/api/admin/categorias";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast(modalEditItem ? "Categoría actualizada." : "Categoría creada.");
        setModalType(null);
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setIsModalSaving(false);
    }
  };

  const borrarCategoria = async (id: number) => {
    const cat = menu.find((c) => c.idNumerico === id);
    if (!cat) return;
    const msg = `Se borrará la categoría "${cat.nombre}"${
      cat.productos?.length ? ` y sus ${cat.productos.length} productos` : ""
    }. Esta acción no se puede deshacer. ¿Continuar?`;
    if (!confirm(msg)) return;

    try {
      const res = await fetch(`/api/admin/categorias/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Categoría eliminada.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  // PRODUCTOS CRUD
  const abrirModalProd = async (prod: any = null, categoryId: number = 0) => {
    setModalType("producto");
    setModalEditItem(prod);
    
    if (prod) {
      try {
        const res = await fetch(`/api/admin/productos/${prod.idNumerico || prod.id}`);
        const data = await res.json();
        if (data.ok) {
          const fullProd = data.producto;
          setProdCategoriaId(fullProd.categoria_id);
          setProdNombre(fullProd.nombre);
          setProdDesc(fullProd.descripcion || "");
          setProdPrecio(fullProd.precio);
          setProdEtiqueta(fullProd.etiqueta || "");
          setProdImagen(fullProd.imagen || "");
          setProdOrden(fullProd.orden);
          setProdActivo(Boolean(fullProd.activo));
          setProdOpciones(fullProd.opciones || []);
        }
      } catch (e) {
        console.error("Error al cargar producto", e);
      }
    } else {
      setProdCategoriaId(categoryId || (menu[0]?.idNumerico || 0));
      setProdNombre("");
      setProdDesc("");
      setProdPrecio(0);
      setProdEtiqueta("");
      setProdImagen("");
      setProdOrden(99);
      setProdActivo(true);
      setProdOpciones([]);
    }
  };

  const agregarGrupoOpciones = () => {
    setProdOpciones([...prodOpciones, { etiqueta: "", elecciones: [{ etiqueta: "", extra: 0 }] }]);
  };

  const eliminarGrupoOpciones = (idx: number) => {
    setProdOpciones(prodOpciones.filter((_, i) => i !== idx));
  };

  const agregarEleccion = (gIdx: number) => {
    const nuevos = [...prodOpciones];
    nuevos[gIdx].elecciones.push({ etiqueta: "", extra: 0 });
    setProdOpciones(nuevos);
  };

  const eliminarEleccion = (gIdx: number, eIdx: number) => {
    const nuevos = [...prodOpciones];
    nuevos[gIdx].elecciones = nuevos[gIdx].elecciones.filter((_: any, i: number) => i !== eIdx);
    setProdOpciones(nuevos);
  };

  const guardarProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalSaving(true);
    // Filtrar opciones válidas
    const opcionesLimpias = prodOpciones
      .map((g) => ({
        etiqueta: g.etiqueta.trim(),
        elecciones: g.elecciones
          .map((el: any) => ({ etiqueta: el.etiqueta.trim(), extra: Number(el.extra) || 0 }))
          .filter((el: any) => el.etiqueta),
      }))
      .filter((g) => g.etiqueta && g.elecciones.length);

    const body = {
      categoria_id: prodCategoriaId,
      nombre: prodNombre,
      descripcion: prodDesc,
      precio: prodPrecio,
      etiqueta: prodEtiqueta,
      imagen: prodImagen,
      orden: prodOrden,
      activo: prodActivo,
      opciones: opcionesLimpias,
    };

    const method = modalEditItem ? "PUT" : "POST";
    const url = modalEditItem ? `/api/admin/productos/${modalEditItem.idNumerico || modalEditItem.id}` : "/api/admin/productos";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast(modalEditItem ? "Producto actualizado." : "Producto creado.");
        setModalType(null);
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setIsModalSaving(false);
    }
  };

  const borrarProducto = async (id: number) => {
    if (!confirm("¿Borrar este producto? No se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/productos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Producto eliminado.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  // SUCURSALES CRUD
  const abrirModalSuc = (suc: any = null) => {
    setModalType("sucursal");
    setModalEditItem(suc);
    if (suc) {
      setSucNombre(suc.nombre);
      setSucDireccion(suc.direccion);
      setSucColonia(suc.colonia || "");
      setSucCiudad(suc.ciudad || "");
      setSucTelefono(suc.telefono || "");
      setSucWhatsapp(suc.whatsapp || "");
      setSucHorario(suc.horario || "");
      setSucMapaUrl(suc.mapa_url || "");
      setSucLat(suc.lat !== null ? String(suc.lat) : "");
      setSucLng(suc.lng !== null ? String(suc.lng) : "");
      setSucImagen(suc.imagen || "");
      setSucOrden(suc.orden);
      setSucActivo(suc.activo);
    } else {
      setSucNombre("");
      setSucDireccion("");
      setSucColonia("");
      setSucCiudad("");
      setSucTelefono("");
      setSucWhatsapp("");
      setSucHorario("");
      setSucMapaUrl("");
      setSucLat("");
      setSucLng("");
      setSucImagen("");
      setSucOrden(99);
      setSucActivo(true);
    }
  };

  const guardarSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsModalSaving(true);
    const body = {
      nombre: sucNombre,
      direccion: sucDireccion,
      colonia: sucColonia,
      ciudad: sucCiudad,
      telefono: sucTelefono,
      whatsapp: sucWhatsapp,
      horario: sucHorario,
      mapa_url: sucMapaUrl,
      lat: sucLat ? Number(sucLat) : null,
      lng: sucLng ? Number(sucLng) : null,
      imagen: sucImagen,
      orden: sucOrden,
      activo: sucActivo,
    };

    const method = modalEditItem ? "PUT" : "POST";
    const url = modalEditItem ? `/api/admin/sucursales/${modalEditItem.id}` : "/api/admin/sucursales";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast(modalEditItem ? "Sucursal actualizada." : "Sucursal creada.");
        setModalType(null);
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setIsModalSaving(false);
    }
  };

  const borrarSucursal = async (id: number) => {
    const s = sucursales.find((x) => x.id === id);
    if (!s) return;
    if (!confirm(`¿Borrar la sucursal "${s.nombre}"? No se puede deshacer.`)) return;

    try {
      const res = await fetch(`/api/admin/sucursales/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Sucursal eliminada.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Error de conexión.");
    }
  };

  // PORTADA / DESTACADOS
  const handleGuardarHero = async () => {
    const btn = document.getElementById("guardar-hero") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    try {
      const res = await fetch("/api/admin/destacados/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          producto_id: heroProductoId ? Number(heroProductoId) : null,
          etiqueta: heroEtiqueta,
          subtitulo: heroSubtitulo,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Foto principal guardada. Refresca el sitio para verla.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  const handleGuardarPromos = async () => {
    const btn = document.getElementById("guardar-promos") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;
    const listaLimpia = promosList
      .filter((p) => p.productoId)
      .map((p) => ({ producto_id: Number(p.productoId), etiqueta: p.etiqueta }));

    try {
      const res = await fetch("/api/admin/destacados/promos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listaLimpia),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Promociones guardadas. Refresca el sitio para verlas.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  const agregarPromoItem = () => {
    if (promosList.length >= 6) {
      alert("Solo puedes tener hasta 6 promociones.");
      return;
    }
    const primerProdId = todosLosProductos[0]?.id || 0;
    setPromosList([...promosList, { productoId: primerProdId, etiqueta: "" }]);
  };

  const handleClicPromos = (accion: "subir" | "bajar" | "quitar", idx: number) => {
    const nuevas = [...promosList];
    if (accion === "quitar") {
      nuevas.splice(idx, 1);
    } else if (accion === "subir" && idx > 0) {
      const t = nuevas[idx - 1];
      nuevas[idx - 1] = nuevas[idx];
      nuevas[idx] = t;
    } else if (accion === "bajar" && idx < nuevas.length - 1) {
      const b = nuevas[idx + 1];
      nuevas[idx + 1] = nuevas[idx];
      nuevas[idx] = b;
    }
    setPromosList(nuevas);
  };

  // CONFIGURACION GENERAL
  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const btn = document.getElementById("btn-guardar-config") as HTMLButtonElement | null;
    if (btn) btn.disabled = true;

    const formData = new FormData(e.target as HTMLFormElement);
    const body: Record<string, string> = {};
    formData.forEach((val, key) => {
      body[key] = String(val);
    });

    try {
      const res = await fetch("/api/admin/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Configuración guardada. Refresca el sitio para verla.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
    } finally {
      if (btn) btn.disabled = false;
    }
  };

  // CAMBIO CONTRASEÑA
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwdNueva !== pwdRepetir) {
      alert("La nueva contraseña y su repetición no coinciden.");
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual: pwdActual, nueva: pwdNueva }),
      });
      const data = await res.json();
      if (data.ok) {
        alert("Contraseña actualizada con éxito. Por favor vuelve a iniciar sesión.");
        setUsuario(null);
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error de conexión.");
    }
  };

  // Aplanar listado de todos los productos de todas las categorias
  const todosLosProductos = menu.reduce((acc, cat) => {
    const prods = (cat.productos || []).map((p: any) => ({
      id: p.idNumerico || p.id,
      nombre: p.nombre,
      categoria: cat.nombre,
      activo: p.activo,
    }));
    return [...acc, ...prods];
  }, [] as any[]);

  const TITULOS_CONFIG: Record<string, string> = {
    general: "Datos del negocio",
    contacto: "Teléfonos y WhatsApp",
    redes: "Redes sociales",
    avisos: "Avisos legales",
  };

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontStyle: "italic", background: "#f5efe8", color: "#1a1512" }}>
        Cargando panel de administración...
      </div>
    );
  }

  // Si no hay sesión iniciada, mostrar Login original
  if (!usuario) {
    return (
      <div className="login" id="pantalla-login">
        <form className="login__caja" onSubmit={handleLogin} noValidate>
          <div className="login__logo">
            <img src="/assets/img/logo.png" alt="Pollo Medina" width="96" height="96" />
          </div>
          <h1>Panel de administración</h1>
          <p className="login__sub">Pollo Medina · Desde 1989</p>

          <label className="campo">
            <span>Usuario</span>
            <input
              type="text"
              name="usuario"
              autoComplete="username"
              required
              autoFocus
              value={loginUsuario}
              onChange={(e) => setLoginUsuario(e.target.value)}
            />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </label>

          {loginError && (
            <p className="login__error" role="alert" style={{ display: "block" }}>
              {loginError}
            </p>
          )}

          <button className="btn btn--rojo btn--bloque" type="submit">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  // Dashboard original con React State
  return (
    <div className="panel" id="pantalla-panel">
      <header className="topbar">
        <div className="topbar__marca">
          <strong>Pollo Medina</strong>
          <span>Panel de administración</span>
        </div>
        <nav className="topbar__tabs" role="tablist">
          <button className="tab" aria-selected={tabActivo === "dashboard"} onClick={() => setTabActivo("dashboard")}>Dashboard</button>
          <button className="tab" aria-selected={tabActivo === "menu"} onClick={() => setTabActivo("menu")}>Menú</button>
          <button className="tab" aria-selected={tabActivo === "portada"} onClick={() => setTabActivo("portada")}>Portada</button>
          <button className="tab" aria-selected={tabActivo === "sucursales"} onClick={() => setTabActivo("sucursales")}>Sucursales</button>
          <button className="tab" aria-selected={tabActivo === "configuracion"} onClick={() => setTabActivo("configuracion")}>Configuración</button>
          <button className="tab" aria-selected={tabActivo === "cuenta"} onClick={() => setTabActivo("cuenta")}>Mi cuenta</button>
        </nav>
        <div className="topbar__acciones">
          <a className="enlace-sitio" href="/" target="_blank" rel="noopener noreferrer">Ver el sitio ↗</a>
          <span className="topbar__usuario" id="usuario-actual">{usuario.nombre}</span>
          <button className="btn btn--fantasma btn--sm" id="btn-salir" onClick={handleLogout} type="button">Salir</button>
        </div>
      </header>

      <main className="contenido">
        {/* ---------- VIEW: DASHBOARD WANSOFT ---------- */}
        {tabActivo === "dashboard" && <WansoftDashboard onToast={triggerToast} />}

        {/* ---------- VIEW: MENU ---------- */}
        {tabActivo === "menu" && (
          <section className="vista" id="vista-menu">
            <div className="vista__head">
              <div>
                <h2>Menú</h2>
                <p>Organiza categorías, productos, precios y fotos.</p>
              </div>
              <div className="vista__acciones">
                <button className="btn btn--negro" onClick={() => abrirModalCat()} type="button">+ Categoría</button>
                <button className="btn btn--rojo" onClick={() => abrirModalProd(null)} type="button">+ Producto</button>
              </div>
            </div>

            <div id="lista-menu" className="lista-menu">
              {menu.map((cat) => (
                <section key={cat.idNumerico} className="categoria" data-categoria={cat.idNumerico}>
                  <header className="categoria__head">
                    <span aria-hidden="true">{cat.emoji || "🍽️"}</span>
                    <span className="categoria__nombre">{cat.nombre}</span>
                    <span className={`chip ${cat.activo ? "chip--activo" : "chip--oculto"}`}>
                      {cat.activo ? "Visible" : "Oculta"}
                    </span>
                    <span className="categoria__meta">{cat.productos?.length || 0} productos</span>
                    <span className="categoria__acciones">
                      <button className="btn btn--fantasma btn--sm" onClick={() => abrirModalProd(null, cat.idNumerico)}>+ Producto</button>
                      <button className="btn btn--fantasma btn--sm" onClick={() => abrirModalCat(cat)}>Editar</button>
                      <button className="btn btn--peligro btn--sm" onClick={() => borrarCategoria(cat.idNumerico)}>Borrar</button>
                    </span>
                  </header>

                  {cat.productos?.map((p: any) => {
                    const opcionesTexto = (p.opciones || [])
                      .map((o: any) => `${o.label}: ${(o.elecciones || []).map((e: any) => e.label).join(" / ")}`)
                      .join(" · ");
                    return (
                      <div key={p.idNumerico} className="producto-fila" data-producto={p.idNumerico}>
                        {p.img ? (
                          <img className="miniatura" src={p.img} alt="" loading="lazy" />
                        ) : (
                          <div className="miniatura">🍗</div>
                        )}
                        <div>
                          <div className="producto-fila__nombre">
                            {p.nombre}
                            {p.tag && <span className="chip chip--tag">{p.tag}</span>}
                            {!p.activo && <span className="chip chip--oculto">Oculto</span>}
                          </div>
                          <div className="producto-fila__desc">{p.desc}</div>
                          {opcionesTexto && <div className="producto-fila__opts">{opcionesTexto}</div>}
                        </div>
                        <div className="producto-fila__precio">{formatDinero(p.precio)}</div>
                        <div className="producto-fila__acciones">
                          <button className="btn btn--fantasma btn--sm" onClick={() => abrirModalProd(p)}>Editar</button>
                          <button className="btn btn--peligro btn--sm" onClick={() => borrarProducto(p.idNumerico)}>Borrar</button>
                        </div>
                      </div>
                    );
                  })}
                  {(!cat.productos || cat.productos.length === 0) && (
                    <p className="vacio">Sin productos en esta categoría.</p>
                  )}
                </section>
              ))}
              {menu.length === 0 && (
                <p className="vacio">{"Todavía no hay categorías. Crea la primera con \"+ Categoría\"."}</p>
              )}
            </div>
          </section>
        )}

        {/* ---------- VIEW: PORTADA ---------- */}
        {tabActivo === "portada" && (
          <section className="vista" id="vista-portada">
            <div className="vista__head">
              <div>
                <h2>Portada</h2>
                <p>Elige el producto de la foto principal y las promociones de la semana.</p>
              </div>
            </div>

            <div className="portada">
              <section className="tarjeta portada__bloque" id="portada-hero">
                <h3 className="portada__titulo">Foto principal (hero)</h3>
                <p className="portada__ayuda">El producto que aparece grande en la portada. Se usa su foto, su nombre y su precio.</p>

                <label className="campo">
                  <span>Producto</span>
                  <select id="hero-producto" value={heroProductoId} onChange={(e) => setHeroProductoId(e.target.value)}>
                    <option value="">— Sin foto principal (usar diseño por defecto) —</option>
                    {todosLosProductos.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.categoria} · {p.nombre} {!p.activo && "(oculto)"}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="fila-campos">
                  <label className="campo">
                    <span>Cinta (arriba a la izquierda)</span>
                    <input
                      type="text"
                      id="hero-etiqueta"
                      maxLength={60}
                      placeholder="Especialidad de la casa"
                      value={heroEtiqueta}
                      onChange={(e) => setHeroEtiqueta(e.target.value)}
                    />
                  </label>
                  <label className="campo">
                    <span>Texto del sello (opcional)</span>
                    <input
                      type="text"
                      id="hero-subtitulo"
                      maxLength={120}
                      placeholder="Se usa el nombre del producto si lo dejas vacío"
                      value={heroSubtitulo}
                      onChange={(e) => setHeroSubtitulo(e.target.value)}
                    />
                  </label>
                </div>
                <div className="portada__acciones">
                  <button className="btn btn--rojo" id="guardar-hero" onClick={handleGuardarHero} type="button">Guardar foto principal</button>
                </div>
              </section>

              <section className="tarjeta portada__bloque" id="portada-promos">
                <div className="portada__promos-head">
                  <div>
                    <h3 className="portada__titulo">Promociones de la semana</h3>
                    <p className="portada__ayuda">La primera es la grande (roja). Puedes elegir hasta 6 productos.</p>
                  </div>
                  <button className="btn btn--negro btn--sm" id="agregar-promo" onClick={agregarPromoItem} type="button">+ Agregar promo</button>
                </div>

                <div id="promos-lista" className="promos-lista">
                  {promosList.map((item, idx) => (
                    <div key={idx} className="promo-fila" data-fila>
                      <span className="promo-fila__num">{idx + 1}</span>
                      <label className="campo">
                        <span>Producto</span>
                        <select
                          value={item.productoId}
                          onChange={(e) => {
                            const nuevas = [...promosList];
                            nuevas[idx].productoId = Number(e.target.value);
                            setPromosList(nuevas);
                          }}
                        >
                          {todosLosProductos.map((p: any) => (
                            <option key={p.id} value={p.id}>
                              {p.categoria} · {p.nombre} {!p.activo && "(oculto)"}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="campo">
                        <span>Insignia</span>
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="Ej. Rinde 6"
                          value={item.etiqueta}
                          onChange={(e) => {
                            const nuevas = [...promosList];
                            nuevas[idx].etiqueta = e.target.value;
                            setPromosList(nuevas);
                          }}
                        />
                      </label>
                      <div className="promo-fila__acciones">
                        <button type="button" className="mini-btn" onClick={() => handleClicPromos("subir", idx)} title="Subir">↑</button>
                        <button type="button" className="mini-btn" onClick={() => handleClicPromos("bajar", idx)} title="Bajar">↓</button>
                        <button type="button" className="mini-btn mini-btn--rojo" onClick={() => handleClicPromos("quitar", idx)} title="Quitar">✕</button>
                      </div>
                    </div>
                  ))}
                  {promosList.length === 0 && (
                    <p className="vacio">{"Sin promociones. Agrega productos con \"+ Agregar promo\" (la primera será la grande)."}</p>
                  )}
                </div>

                <div className="portada__acciones">
                  <button className="btn btn--rojo" id="guardar-promos" onClick={handleGuardarPromos} type="button">Guardar promociones</button>
                </div>
              </section>
            </div>
          </section>
        )}

        {/* ---------- VIEW: SUCURSALES ---------- */}
        {tabActivo === "sucursales" && (
          <section className="vista" id="vista-sucursales">
            <div className="vista__head">
              <div>
                <h2>Sucursales</h2>
                <p>Direcciones, teléfonos, horarios, mapa y foto de cada sucursal.</p>
              </div>
              <div className="vista__acciones">
                <button className="btn btn--fantasma" onClick={() => exportarSucursales("excel")} type="button" disabled={exportando}>⬇ Excel</button>
                <button className="btn btn--fantasma" onClick={() => exportarSucursales("pdf")} type="button" disabled={exportando}>🖨 PDF</button>
                <button className="btn btn--rojo" id="btn-nueva-sucursal" onClick={() => abrirModalSuc()} type="button">+ Sucursal</button>
              </div>
            </div>

            <div id="lista-sucursales" className="tarjetas">
              {sucursales.map((s) => {
                const ubicacion = [s.direccion, s.colonia, s.ciudad].filter(Boolean).join(", ");
                return (
                  <article key={s.id} className="tarjeta" data-id={s.id}>
                    <div className="tarjeta__foto">
                      {s.imagen ? (
                        <img src={s.imagen} alt="" loading="lazy" />
                      ) : (
                        "🏪"
                      )}
                    </div>
                    <div className="tarjeta__cuerpo">
                      <h3>
                        {s.nombre}
                        <span className={`chip ${s.activo ? "chip--activo" : "chip--oculto"}`}>
                          {s.activo ? "Visible" : "Oculta"}
                        </span>
                      </h3>
                      <p className="tarjeta__dato">📍 {ubicacion}</p>
                      {s.telefono && <p className="tarjeta__dato">📞 {s.telefono}</p>}
                      {s.horario && <p className="tarjeta__dato">🕐 {s.horario}</p>}
                      {s.mapa_url && (
                        <p className="tarjeta__dato">
                          <a href={s.mapa_url} target="_blank" rel="noopener noreferrer">Ver en el mapa ↗</a>
                        </p>
                      )}
                    </div>
                    <div className="tarjeta__pie">
                      <button className="btn btn--fantasma btn--sm" onClick={() => abrirModalSuc(s)}>Editar</button>
                      <button className="btn btn--fantasma btn--sm" onClick={() => setExtrasSuc({ id: s.id, nombre: s.nombre })}>Terminales y usuarios</button>
                      <button className="btn btn--peligro btn--sm" onClick={() => borrarSucursal(s.id)}>Borrar</button>
                    </div>
                  </article>
                );
              })}
              {sucursales.length === 0 && (
                <p className="vacio">Aún no hay sucursales registradas.</p>
              )}
            </div>
          </section>
        )}

        {/* ---------- VIEW: CONFIGURACION ---------- */}
        {tabActivo === "configuracion" && (
          <section className="vista" id="vista-configuracion">
            <div className="vista__head">
              <div>
                <h2>Configuración</h2>
                <p>Teléfonos, horarios, redes sociales y avisos que aparecen en la página.</p>
              </div>
              <div className="vista__acciones">
                <button className="btn btn--rojo" id="btn-guardar-config" type="submit" form="form-configuracion">Guardar cambios</button>
              </div>
            </div>

            <form id="form-configuracion" className="config" onSubmit={handleGuardarConfig}>
              {["general", "contacto", "redes", "avisos"].map((grupo) => {
                const camposGrupo = configuracion.filter((c) => c.grupo === grupo);
                if (camposGrupo.length === 0) return null;
                return (
                  <section key={grupo} className="config__grupo">
                    <h3>{TITULOS_CONFIG[grupo] || grupo}</h3>
                    <div className="config__campos">
                      {camposGrupo.map((fila) => {
                        const esLargo = String(fila.valor || "").length > 70;
                        if (esLargo) {
                          return (
                            <label key={fila.clave} className="campo">
                              <span>{fila.descripcion || fila.clave}</span>
                              <textarea name={fila.clave} defaultValue={fila.valor || ""} />
                            </label>
                          );
                        }
                        return (
                          <label key={fila.clave} className="campo">
                            <span>{fila.descripcion || fila.clave}</span>
                            <input type="text" name={fila.clave} defaultValue={fila.valor || ""} />
                            <small>{fila.clave}</small>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </form>
          </section>
        )}

        {/* ---------- VIEW: MI CUENTA ---------- */}
        {tabActivo === "cuenta" && (
          <section className="vista" id="vista-cuenta">
            <div className="vista__head">
              <div>
                <h2>Mi cuenta</h2>
                <p>Cambia tu contraseña de acceso al panel.</p>
              </div>
            </div>

            <form className="tarjeta tarjeta--formulario" id="form-password" onSubmit={handlePasswordSubmit}>
              <label className="campo">
                <span>Contraseña actual</span>
                <input
                  type="password"
                  name="actual"
                  autoComplete="current-password"
                  required
                  value={pwdActual}
                  onChange={(e) => setPwdActual(e.target.value)}
                />
              </label>
              <label className="campo">
                <span>Contraseña nueva (mínimo 8 caracteres)</span>
                <input
                  type="password"
                  name="nueva"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={pwdNueva}
                  onChange={(e) => setPwdNueva(e.target.value)}
                />
              </label>
              <label className="campo">
                <span>Repite la contraseña nueva</span>
                <input
                  type="password"
                  name="repetir"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={pwdRepetir}
                  onChange={(e) => setPwdRepetir(e.target.value)}
                />
              </label>
              <button className="btn btn--rojo" type="submit">Cambiar contraseña</button>
            </form>
          </section>
        )}
      </main>

      {/* ══════════ MODAL UNIFICADO ORIGINAL ══════════ */}
      <div className="modal" id="modal" hidden={!modalType}>
        <div className="modal__fondo" onClick={() => setModalType(null)}></div>
        <div className="modal__caja" role="dialog" aria-modal="true" aria-labelledby="modal-titulo">
          <header className="modal__head">
            <h3 id="modal-titulo">
              {modalType === "categoria" && (modalEditItem ? "Editar categoría" : "Nueva categoría")}
              {modalType === "producto" && (modalEditItem ? "Editar producto" : "Nuevo producto")}
              {modalType === "sucursal" && (modalEditItem ? "Editar sucursal" : "Nueva sucursal")}
            </h3>
            <button className="modal__cerrar" type="button" onClick={() => setModalType(null)} aria-label="Cerrar">✕</button>
          </header>

          {/* Formulario Modal Categoria */}
          {modalType === "categoria" && (
            <form id="modal-form" className="modal__cuerpo" onSubmit={guardarCategoria} noValidate>
              <label className="campo">
                <span>Nombre de la categoría</span>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Pollos y Paquetes"
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                />
              </label>
              <div className="fila-campos">
                <label className="campo">
                  <span>Emoji</span>
                  <input
                    type="text"
                    name="emoji"
                    placeholder="🍗"
                    value={catEmoji}
                    onChange={(e) => setCatEmoji(e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>Orden</span>
                  <input
                    type="number"
                    name="orden"
                    min={0}
                    value={catOrden}
                    onChange={(e) => setCatOrden(Number(e.target.value))}
                  />
                </label>
              </div>
              <label className="campo campo--check">
                <input
                  type="checkbox"
                  name="activo"
                  checked={catActivo}
                  onChange={(e) => setCatActivo(e.target.checked)}
                />
                <span>Mostrar en el sitio</span>
              </label>
            </form>
          )}

          {/* Formulario Modal Producto */}
          {modalType === "producto" && (
            <form id="modal-form" className="modal__cuerpo" onSubmit={guardarProducto} noValidate>
              <label className="campo">
                <span>Nombre del producto</span>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Pollo Entero Asado"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                />
              </label>
              <label className="campo">
                <span>Descripción</span>
                <textarea
                  name="descripcion"
                  placeholder="Corta y antojable. Aparece debajo del nombre."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                />
              </label>
              <div className="fila-campos">
                <label className="campo">
                  <span>Precio (MXN)</span>
                  <input
                    type="number"
                    name="precio"
                    step="0.01"
                    min={0}
                    required
                    value={prodPrecio}
                    onChange={(e) => setProdPrecio(Number(e.target.value))}
                  />
                </label>
                <label className="campo">
                  <span>Categoría</span>
                  <select
                    name="categoria_id"
                    value={prodCategoriaId}
                    onChange={(e) => setProdCategoriaId(Number(e.target.value))}
                  >
                    {menu.map((c) => (
                      <option key={c.idNumerico} value={c.idNumerico}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="fila-campos">
                <label className="campo">
                  <span>Etiqueta</span>
                  <input
                    type="text"
                    name="etiqueta"
                    placeholder="Ej. El más pedido"
                    value={prodEtiqueta}
                    onChange={(e) => setProdEtiqueta(e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>Orden</span>
                  <input
                    type="number"
                    name="orden"
                    min={0}
                    value={prodOrden}
                    onChange={(e) => setProdOrden(Number(e.target.value))}
                  />
                </label>
              </div>

              {/* Campo de Imagen original */}
              <div className="campo">
                <span>Foto del producto</span>
                <div className="subida" data-subida data-carpeta="menu">
                  {prodImagen ? (
                    <img className="subida__vista" data-vista src={prodImagen} alt="" />
                  ) : (
                    <div className="subida__vista" data-vista>🍗</div>
                  )}
                  <div className="subida__controles">
                    <input type="hidden" name="imagen" value={prodImagen} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      style={{ display: "none" }}
                      id="file-upload-prod"
                      onChange={(e) => handleFileUpload(e, "menu", setProdImagen)}
                    />
                    <button type="button" className="btn btn--negro btn--sm" onClick={() => document.getElementById("file-upload-prod")?.click()}>
                      Subir foto
                    </button>
                    {prodImagen && (
                      <button type="button" className="btn btn--fantasma btn--sm" onClick={() => setProdImagen("")}>
                        Quitar
                      </button>
                    )}
                    <small>JPG, PNG o WEBP · máximo 5 MB</small>
                  </div>
                </div>
              </div>

              <label className="campo campo--check">
                <input
                  type="checkbox"
                  name="activo"
                  checked={prodActivo}
                  onChange={(e) => setProdActivo(e.target.checked)}
                />
                <span>Mostrar en el sitio</span>
              </label>

              {/* Editor de grupos de opciones original */}
              <div className="campo">
                <span>Opciones del producto</span>
                <small>Variantes que el cliente elige (ej. Tortillas: Maíz / Harina +$20).</small>
                <div className="opciones-editor">
                  {prodOpciones.map((opc, gIdx) => (
                    <div key={gIdx} className="opcion-grupo" data-grupo>
                      <div className="opcion-grupo__head">
                        <label className="campo">
                          <span>Nombre del grupo</span>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Tortillas"
                            value={opc.etiqueta}
                            onChange={(e) => {
                              const nuevas = [...prodOpciones];
                              nuevas[gIdx].etiqueta = e.target.value;
                              setProdOpciones(nuevas);
                            }}
                          />
                        </label>
                        <button type="button" className="mini-btn" onClick={() => eliminarGrupoOpciones(gIdx)} title="Quitar grupo">✕</button>
                      </div>

                      <div>
                        {opc.elecciones.map((el: any, eIdx: number) => (
                          <div key={eIdx} className="eleccion-fila" data-eleccion>
                            <input
                              type="text"
                              required
                              placeholder="Ej. Maíz"
                              value={el.etiqueta}
                              onChange={(e) => {
                                const nuevas = [...prodOpciones];
                                nuevas[gIdx].elecciones[eIdx].etiqueta = e.target.value;
                                setProdOpciones(nuevas);
                              }}
                            />
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Extra $"
                              value={el.extra}
                              onChange={(e) => {
                                const nuevas = [...prodOpciones];
                                nuevas[gIdx].elecciones[eIdx].extra = Number(e.target.value);
                                setProdOpciones(nuevas);
                              }}
                            />
                            <button type="button" className="mini-btn" onClick={() => eliminarEleccion(gIdx, eIdx)} title="Quitar">✕</button>
                          </div>
                        ))}
                      </div>
                      
                      <button type="button" className="btn btn--fantasma btn--sm" onClick={() => agregarEleccion(gIdx)}>+ Opción</button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn btn--fantasma btn--sm"
                  onClick={agregarGrupoOpciones}
                  style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
                >
                  + Agregar grupo de opciones
                </button>
              </div>
            </form>
          )}

          {/* Formulario Modal Sucursal */}
          {modalType === "sucursal" && (
            <form id="modal-form" className="modal__cuerpo" onSubmit={guardarSucursal} noValidate>
              <label className="campo">
                <span>Nombre de la sucursal</span>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Ej. Eloy Cavazos"
                  value={sucNombre}
                  onChange={(e) => setSucNombre(e.target.value)}
                />
              </label>
              <label className="campo">
                <span>Calle y número</span>
                <input
                  type="text"
                  name="direccion"
                  required
                  placeholder="Av. Eloy Cavazos #6907"
                  value={sucDireccion}
                  onChange={(e) => setSucDireccion(e.target.value)}
                />
              </label>
              <div className="fila-campos">
                <label className="campo">
                  <span>Colonia</span>
                  <input
                    type="text"
                    name="colonia"
                    placeholder="Santa María"
                    value={sucColonia}
                    onChange={(e) => setSucColonia(e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>Ciudad y estado</span>
                  <input
                    type="text"
                    name="ciudad"
                    placeholder="Guadalupe, N.L."
                    value={sucCiudad}
                    onChange={(e) => setSucCiudad(e.target.value)}
                  />
                </label>
              </div>
              <div className="fila-campos">
                <label className="campo">
                  <span>Teléfono</span>
                  <input
                    type="text"
                    name="telefono"
                    placeholder="81 1469 6373"
                    value={sucTelefono}
                    onChange={(e) => setSucTelefono(e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>WhatsApp (opcional)</span>
                  <input
                    type="text"
                    name="whatsapp"
                    placeholder="81 2230 9008"
                    value={sucWhatsapp}
                    onChange={(e) => setSucWhatsapp(e.target.value)}
                  />
                </label>
              </div>
              <label className="campo">
                <span>Horario</span>
                <input
                  type="text"
                  name="horario"
                  placeholder="Lun a Dom · 11:00 – 21:00 h"
                  value={sucHorario}
                  onChange={(e) => setSucHorario(e.target.value)}
                />
              </label>
              <label className="campo">
                <span>Enlace de Google Maps</span>
                <input
                  type="url"
                  name="mapa_url"
                  placeholder="https://share.google/…"
                  value={sucMapaUrl}
                  onChange={(e) => setSucMapaUrl(e.target.value)}
                />
                <small>Pega la liga que te da el botón Compartir de Google Maps.</small>
              </label>
              <div className="fila-campos">
                <label className="campo">
                  <span>Latitud (opcional)</span>
                  <input
                    type="number"
                    step="0.0000001"
                    name="lat"
                    value={sucLat}
                    onChange={(e) => setSucLat(e.target.value)}
                  />
                </label>
                <label className="campo">
                  <span>Longitud (opcional)</span>
                  <input
                    type="number"
                    step="0.0000001"
                    name="lng"
                    value={sucLng}
                    onChange={(e) => setSucLng(e.target.value)}
                  />
                </label>
              </div>

              {/* Campo de Imagen original para sucursal */}
              <div className="campo">
                <span>Foto de la sucursal</span>
                <div className="subida" data-subida data-carpeta="sucursales">
                  {sucImagen ? (
                    <img className="subida__vista" data-vista src={sucImagen} alt="" />
                  ) : (
                    <div className="subida__vista" data-vista>🏪</div>
                  )}
                  <div className="subida__controles">
                    <input type="hidden" name="imagen" value={sucImagen} />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      style={{ display: "none" }}
                      id="file-upload-suc"
                      onChange={(e) => handleFileUpload(e, "sucursales", setSucImagen)}
                    />
                    <button type="button" className="btn btn--negro btn--sm" onClick={() => document.getElementById("file-upload-suc")?.click()}>
                      Subir foto
                    </button>
                    {sucImagen && (
                      <button type="button" className="btn btn--fantasma btn--sm" onClick={() => setSucImagen("")}>
                        Quitar
                      </button>
                    )}
                    <small>JPG, PNG o WEBP · máximo 5 MB</small>
                  </div>
                </div>
              </div>

              <div className="fila-campos">
                <label className="campo">
                  <span>Orden</span>
                  <input
                    type="number"
                    name="orden"
                    min={0}
                    value={sucOrden}
                    onChange={(e) => setSucOrden(Number(e.target.value))}
                  />
                </label>
                <label className="campo campo--check" style={{ marginTop: "1rem" }}>
                  <input
                    type="checkbox"
                    name="activo"
                    checked={sucActivo}
                    onChange={(e) => setSucActivo(e.target.checked)}
                  />
                  <span>Mostrar en el sitio</span>
                </label>
              </div>
            </form>
          )}

          <footer className="modal__pie">
            <button className="btn btn--fantasma" type="button" onClick={() => setModalType(null)}>Cancelar</button>
            <button className="btn btn--rojo" type="submit" form="modal-form" id="modal-guardar" disabled={isModalSaving}>
              Guardar
            </button>
          </footer>
        </div>
      </div>

      {extrasSuc && (
        <SucursalExtrasModal sucursal={extrasSuc} onClose={() => setExtrasSuc(null)} onToast={triggerToast} />
      )}

      {/* TOAST ALERT ORIGINAL */}
      <div className={`aviso ${toastMsg ? "visible" : ""}`} id="aviso" role="status" aria-live="polite">
        {toastMsg}
      </div>
    </div>
  );
}
