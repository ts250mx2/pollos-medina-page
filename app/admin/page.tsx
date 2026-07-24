"use client";

import React, { useState, useEffect } from "react";
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
  const [tabActivo, setTabActivo] = useState("menu");

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
  const [modalType, setModalType] = useState<"categoria" | "producto" | "sucursal" | null>(null);
  const [modalEditItem, setModalEditItem] = useState<any>(null); // null para nuevo
  const [toastMsg, setToastMsg] = useState<string | null>(null);

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
  const [promosList, setPromosList] = useState<any[]>([]); // { producto_id: number, etiqueta: string }[]

  // Cargar datos al montar
  useEffect(() => {
    verificarSesion();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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
          producto_id: p.productoId,
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
      const res = await fetch("/api/admin/subidas", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        callback(data.url);
        triggerToast("Imagen subida con éxito.");
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
      setCatEmoji(cat.emoji);
      setCatOrden(cat.orden);
      setCatActivo(cat.activo);
    } else {
      setCatNombre("");
      setCatEmoji("");
      setCatOrden(0);
      setCatActivo(true);
    }
  };

  const guardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = { nombre: catNombre, emoji: catEmoji, orden: catOrden, activo: catActivo };
    const method = modalEditItem ? "PUT" : "POST";
    const url = modalEditItem ? `/api/admin/categorias/${modalEditItem.id}` : "/api/admin/categorias";

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
    }
  };

  const borrarCategoria = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta categoría? Se borrarán todos sus productos asociados.")) return;
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
    
    // Si es un producto existente, cargar detalles completos (incluyendo opciones de la base de datos)
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
      setProdOrden(0);
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
    const body = {
      categoria_id: prodCategoriaId,
      nombre: prodNombre,
      descripcion: prodDesc,
      precio: prodPrecio,
      etiqueta: prodEtiqueta,
      imagen: prodImagen,
      orden: prodOrden,
      activo: prodActivo,
      opciones: prodOpciones,
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
    }
  };

  const borrarProducto = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar este producto?")) return;
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
      setSucOrden(0);
      setSucActivo(true);
    }
  };

  const guardarSucursal = async (e: React.FormEvent) => {
    e.preventDefault();
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
    }
  };

  const borrarSucursal = async (id: number) => {
    if (!confirm("¿Seguro que deseas eliminar esta sucursal?")) return;
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
        triggerToast("Foto principal (hero) guardada.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
    }
  };

  const handleGuardarPromos = async () => {
    try {
      const res = await fetch("/api/admin/destacados/promos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promosList),
      });
      const data = await res.json();
      if (data.ok) {
        triggerToast("Promociones de la semana guardadas.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
    }
  };

  const agregarPromoItem = () => {
    if (promosList.length >= 6) {
      alert("Solo puedes tener hasta 6 promociones.");
      return;
    }
    // Buscar el primer producto del menu para pre-cargar
    let primerProdId = 0;
    for (const cat of menu) {
      if (cat.productos && cat.productos.length > 0) {
        primerProdId = cat.productos[0].idNumerico;
        break;
      }
    }
    setPromosList([...promosList, { producto_id: primerProdId, etiqueta: "" }]);
  };

  // CONFIGURACION GENERAL
  const handleGuardarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
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
        triggerToast("Configuración general guardada.");
        await cargarDatosPanel();
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert("Error al guardar.");
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

  // Obtener listado plano de todos los productos de todas las categorias
  const todosLosProductos = menu.reduce((acc, cat) => {
    return [...acc, ...(cat.productos || [])];
  }, [] as any[]);

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center", fontStyle: "italic", background: "#12100e", color: "#f5efe8" }}>
        Cargando panel de administración...
      </div>
    );
  }

  // Si no hay sesión iniciada, mostrar Login
  if (!usuario) {
    return (
      <div className="admin-layout" style={{ height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <form className="admin-login" onSubmit={handleLogin}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}>
            <img src="/assets/img/logo.png" alt="Pollo Medina" style={{ width: "90px", height: "90px" }} />
          </div>
          <h2>Pollo Medina</h2>
          <p style={{ textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "-1rem" }}>ADMIN PANEL LOGIN</p>
          
          <div className="grupo-campo">
            <label>Usuario</label>
            <input
              type="text"
              required
              autoFocus
              value={loginUsuario}
              onChange={(e) => setLoginUsuario(e.target.value)}
            />
          </div>

          <div className="grupo-campo">
            <label>Contraseña</label>
            <input
              type="password"
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
            />
          </div>

          {loginError && <p style={{ color: "var(--danger)", fontSize: "0.85rem", fontWeight: "bold" }}>{loginError}</p>}

          <button type="submit" className="btn btn--rojo" style={{ width: "100%" }}>
            Iniciar sesión
          </button>
        </form>
      </div>
    );
  }

  // Dashboard del administrador
  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div>
          <h1>Pollo Medina</h1>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Hola, {usuario.nombre} ({usuario.rol})</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <a href="/" target="_blank" rel="noopener noreferrer" style={{ color: "white", fontSize: "0.85rem", textDecoration: "underline" }}>Ver sitio ↗</a>
          <button className="btn btn--rojo btn--sm" style={{ padding: "0.4rem 1rem", fontSize: "0.75rem" }} onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="admin-nav">
        <button className={`admin-nav-tab ${tabActivo === "menu" ? "is-active" : ""}`} onClick={() => setTabActivo("menu")}>
          Menú
        </button>
        <button className={`admin-nav-tab ${tabActivo === "portada" ? "is-active" : ""}`} onClick={() => setTabActivo("portada")}>
          Portada
        </button>
        <button className={`admin-nav-tab ${tabActivo === "sucursales" ? "is-active" : ""}`} onClick={() => setTabActivo("sucursales")}>
          Sucursales
        </button>
        <button className={`admin-nav-tab ${tabActivo === "configuracion" ? "is-active" : ""}`} onClick={() => setTabActivo("configuracion")}>
          Configuración
        </button>
        <button className={`admin-nav-tab ${tabActivo === "cuenta" ? "is-active" : ""}`} onClick={() => setTabActivo("cuenta")}>
          Mi Cuenta
        </button>
      </nav>

      {/* Cuerpo */}
      <main className="admin-cuerpo">
        {/* TABS CONTENIDOS */}
        {tabActivo === "menu" && (
          <div className="admin-tab-cuerpo">
            <div className="admin-seccion-head">
              <div>
                <h2>Carta y Menú</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Organiza tus categorías, comidas y opciones extras.</p>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button className="btn btn--outline" onClick={() => abrirModalCat()}>+ Categoría</button>
              </div>
            </div>

            {menu.map((cat) => (
              <div key={cat.idNumerico} style={{ background: "var(--surface)", border: "1.5px solid var(--border)", borderRadius: "var(--r)", padding: "1.5rem", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1.5px solid var(--border)", paddingBottom: "0.75rem", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "1.5rem" }}>{cat.emoji}</span>
                    <h3 style={{ textTransform: "uppercase", fontFamily: "var(--font-titulo)", fontSize: "1.3rem" }}>{cat.nombre}</h3>
                    <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>({cat.productos?.length || 0} prod.)</span>
                    {!cat.activo && <span className="etiqueta etiqueta--roja" style={{ fontSize: "0.65rem", padding: "0.1rem 0.4rem" }}>Oculta</span>}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn--outline" style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem" }} onClick={() => abrirModalProd(null, cat.idNumerico)}>
                      + Producto
                    </button>
                    <button className="btn btn--outline" style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem" }} onClick={() => abrirModalCat(cat)}>
                      Editar
                    </button>
                    <button className="btn btn--outline btn--danger" style={{ padding: "0.35rem 0.85rem", fontSize: "0.75rem" }} onClick={() => borrarCategoria(cat.idNumerico)}>
                      Borrar
                    </button>
                  </div>
                </div>

                <div className="admin-lista-items">
                  {cat.productos?.map((p: any) => (
                    <div key={p.idNumerico} className="admin-lista-item">
                      <div className="admin-lista-item__info">
                        <img src={p.img || "/assets/img/logo.png"} alt={p.nombre} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "var(--r-sm)" }} />
                        <div>
                          <p className="admin-lista-item__nombre">
                            {p.nombre}{" "}
                            {!p.activo && <span style={{ color: "var(--danger)", fontSize: "0.75rem" }}>(Oculto)</span>}
                          </p>
                          <p className="admin-lista-item__detalles">
                            Precio: <strong className="texto-rojo">{formatDinero(p.precio)}</strong>
                            {p.tag && ` · Insignia: ${p.tag}`}
                            {p.opciones?.length > 0 && ` · Opciones: ${p.opciones.length}`}
                          </p>
                        </div>
                      </div>
                      <div className="admin-lista-item__acciones">
                        <button className="admin-lista-item__btn-accion" onClick={() => abrirModalProd(p)}>Editar</button>
                        <button className="admin-lista-item__btn-accion admin-lista-item__btn-accion--danger" onClick={() => borrarProducto(p.idNumerico)}>Eliminar</button>
                      </div>
                    </div>
                  ))}
                  {(!cat.productos || cat.productos.length === 0) && (
                    <p style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)" }}>No hay productos en esta categoría.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tabActivo === "portada" && (
          <div className="admin-tab-cuerpo">
            <div className="admin-seccion-head">
              <div>
                <h2>Portada y Destacados</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Configura la foto principal del Hero y tus promociones de la semana.</p>
              </div>
            </div>

            <div className="destacados-constructor">
              {/* Bloque HERO */}
              <div className="admin-tarjeta-config">
                <h3>Foto principal (hero)</h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Selecciona un producto y personaliza su etiqueta.</p>
                
                <div className="grupo-campo">
                  <label>Seleccionar Producto</label>
                  <select value={heroProductoId} onChange={(e) => setHeroProductoId(e.target.value)}>
                    <option value="">-- Sin foto principal (sello de marca por defecto) --</option>
                    {todosLosProductos.map((p: any) => (
                      <option key={p.idNumerico} value={p.idNumerico}>
                        {p.nombre} (${p.precio})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grupo-campo">
                  <label>Cinta superior (etiqueta)</label>
                  <input
                    type="text"
                    maxLength={60}
                    placeholder="Especialidad de la casa"
                    value={heroEtiqueta}
                    onChange={(e) => setHeroEtiqueta(e.target.value)}
                  />
                </div>

                <div className="grupo-campo">
                  <label>Sello (subtítulo)</label>
                  <input
                    type="text"
                    maxLength={120}
                    placeholder="Ej. Pollo + papitas o se usará el nombre"
                    value={heroSubtitulo}
                    onChange={(e) => setHeroSubtitulo(e.target.value)}
                  />
                </div>

                <button type="button" className="btn btn--rojo" style={{ marginTop: "1rem" }} onClick={handleGuardarHero}>
                  Guardar Hero
                </button>
              </div>

              {/* Bloque PROMOS */}
              <div className="admin-tarjeta-config">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3>Promociones de la semana</h3>
                  <button type="button" className="btn btn--outline" style={{ padding: "0.3rem 0.8rem", fontSize: "0.75rem" }} onClick={agregarPromoItem}>
                    + Agregar promo
                  </button>
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  Configura hasta 6 productos como destacados. El primero se muestra como la promoción grande destacada.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {promosList.map((item, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr auto", gap: "0.75rem", alignItems: "center", background: "var(--surface-2)", padding: "0.75rem", borderRadius: "var(--r-sm)" }}>
                      <div className="grupo-campo">
                        <label style={{ fontSize: "0.75rem" }}>Producto</label>
                        <select
                          value={item.producto_id}
                          onChange={(e) => {
                            const nuevas = [...promosList];
                            nuevas[idx].producto_id = Number(e.target.value);
                            setPromosList(nuevas);
                          }}
                        >
                          {todosLosProductos.map((p: any) => (
                            <option key={p.idNumerico} value={p.idNumerico}>
                              {p.nombre}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grupo-campo">
                        <label style={{ fontSize: "0.75rem" }}>Insignia/Tag</label>
                        <input
                          type="text"
                          maxLength={60}
                          placeholder="El más pedido"
                          value={item.etiqueta}
                          onChange={(e) => {
                            const nuevas = [...promosList];
                            nuevas[idx].etiqueta = e.target.value;
                            setPromosList(nuevas);
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        style={{ color: "var(--danger)", marginTop: "1rem" }}
                        onClick={() => setPromosList(promosList.filter((_, i) => i !== idx))}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {promosList.length === 0 && (
                    <p style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)" }}>No hay promociones seleccionadas en portada.</p>
                  )}
                </div>

                <button type="button" className="btn btn--rojo" style={{ marginTop: "1rem" }} onClick={handleGuardarPromos}>
                  Guardar Promociones
                </button>
              </div>
            </div>
          </div>
        )}

        {tabActivo === "sucursales" && (
          <div className="admin-tab-cuerpo">
            <div className="admin-seccion-head">
              <div>
                <h2>Sucursales</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Edita, crea o elimina ubicaciones físicas del negocio.</p>
              </div>
              <button className="btn btn--rojo" onClick={() => abrirModalSuc()}>+ Sucursal</button>
            </div>

            <div className="admin-lista-items">
              {sucursales.map((s) => (
                <div key={s.id} className="admin-lista-item">
                  <div className="admin-lista-item__info">
                    <img src={s.imagen || "/assets/img/logo.png"} alt={s.nombre} style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "var(--r-sm)" }} />
                    <div>
                      <p className="admin-lista-item__nombre">{s.nombre}</p>
                      <p className="admin-lista-item__detalles">
                        {s.direccion}, {s.colonia || ""} · Tel: {s.telefono || "Sin tel."}
                      </p>
                    </div>
                  </div>
                  <div className="admin-lista-item__acciones">
                    <button className="admin-lista-item__btn-accion" onClick={() => abrirModalSuc(s)}>Editar</button>
                    <button className="admin-lista-item__btn-accion admin-lista-item__btn-accion--danger" onClick={() => borrarSucursal(s.id)}>Eliminar</button>
                  </div>
                </div>
              ))}
              {sucursales.length === 0 && (
                <p style={{ fontStyle: "italic", fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center" }}>No hay sucursales guardadas.</p>
              )}
            </div>
          </div>
        )}

        {tabActivo === "configuracion" && (
          <div className="admin-tab-cuerpo">
            <div className="admin-seccion-head">
              <div>
                <h2>Configuración General</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Variables del sitio como teléfonos, redes sociales e informativos.</p>
              </div>
            </div>

            <form onSubmit={handleGuardarConfig} className="admin-formulario-grid">
              {/* Tarjeta CONTACTO */}
              <div className="admin-tarjeta-config">
                <h3>Datos de Contacto</h3>
                {configuracion
                  .filter((item) => item.grupo === "contacto")
                  .map((c) => (
                    <div key={c.clave} className="grupo-campo">
                      <label htmlFor={`config-${c.clave}`}>{c.descripcion || c.clave}</label>
                      <input
                        id={`config-${c.clave}`}
                        type="text"
                        name={c.clave}
                        defaultValue={c.valor || ""}
                      />
                    </div>
                  ))}
              </div>

              {/* Tarjeta GENERAL Y AVISOS */}
              <div className="admin-tarjeta-config">
                <h3>Configuración General y Leyendas</h3>
                {configuracion
                  .filter((item) => item.grupo === "general")
                  .map((c) => (
                    <div key={c.clave} className="grupo-campo">
                      <label htmlFor={`config-${c.clave}`}>{c.descripcion || c.clave}</label>
                      <input
                        id={`config-${c.clave}`}
                        type="text"
                        name={c.clave}
                        defaultValue={c.valor || ""}
                      />
                    </div>
                  ))}
              </div>

              {/* Tarjeta REDES SOCIALES */}
              <div className="admin-tarjeta-config">
                <h3>Redes Sociales</h3>
                {configuracion
                  .filter((item) => item.grupo === "redes")
                  .map((c) => (
                    <div key={c.clave} className="grupo-campo">
                      <label htmlFor={`config-${c.clave}`}>{c.descripcion || c.clave}</label>
                      <input
                        id={`config-${c.clave}`}
                        type="text"
                        name={c.clave}
                        defaultValue={c.valor || ""}
                      />
                    </div>
                  ))}
              </div>

              <div style={{ gridColumn: "1/-1", display: "flex", justifyContent: "flex-end", marginTop: "1rem" }}>
                <button type="submit" className="btn btn--rojo">
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        )}

        {tabActivo === "cuenta" && (
          <div className="admin-tab-cuerpo" style={{ maxWidth: "500px" }}>
            <div className="admin-seccion-head">
              <div>
                <h2>Seguridad de la Cuenta</h2>
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Cambia tu clave de acceso al panel de administración.</p>
              </div>
            </div>

            <form onSubmit={handlePasswordSubmit} className="admin-tarjeta-config">
              <div className="grupo-campo">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  required
                  value={pwdActual}
                  onChange={(e) => setPwdActual(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Contraseña nueva (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwdNueva}
                  onChange={(e) => setPwdNueva(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Repetir contraseña nueva</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pwdRepetir}
                  onChange={(e) => setPwdRepetir(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn--rojo" style={{ marginTop: "1rem" }}>
                Cambiar Contraseña
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ============================================================
         MODALES DE CRUD
         ============================================================ */}

      {/* MODAL CATEGORIA */}
      {modalType === "categoria" && (
        <div className="modal-overlay is-active" onClick={() => setModalType(null)}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={guardarCategoria}>
            <div className="modal-header">
              <h2>{modalEditItem ? "Editar Categoría" : "Nueva Categoría"}</h2>
              <button type="button" onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className="modal-cuerpo">
              <div className="grupo-campo">
                <label>Nombre de la categoría</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Pollos, Bebidas..."
                  value={catNombre}
                  onChange={(e) => setCatNombre(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Emoji (insignia visual)</label>
                <input
                  type="text"
                  placeholder="Ej. 🍗, 🥤, 🥗"
                  value={catEmoji}
                  onChange={(e) => setCatEmoji(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Orden numérico (prioridad en menú)</label>
                <input
                  type="number"
                  value={catOrden}
                  onChange={(e) => setCatOrden(Number(e.target.value))}
                />
              </div>

              <div className="grupo-campo" style={{ flexDirection: "row", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="cat-activo"
                  style={{ width: "auto" }}
                  checked={catActivo}
                  onChange={(e) => setCatActivo(e.target.checked)}
                />
                <label htmlFor="cat-activo">Categoría Activa (Visible al público)</label>
              </div>
            </div>
            <div className="modal-pie">
              <button type="button" className="btn btn--outline" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn--rojo">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PRODUCTO */}
      {modalType === "producto" && (
        <div className="modal-overlay is-active" onClick={() => setModalType(null)}>
          <form className="modal" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()} onSubmit={guardarProducto}>
            <div className="modal-header">
              <h2>{modalEditItem ? "Editar Producto" : "Nuevo Producto"}</h2>
              <button type="button" onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className="modal-cuerpo" style={{ maxHeight: "75vh" }}>
              
              <div className="grupo-campo">
                <label>Categoría</label>
                <select value={prodCategoriaId} onChange={(e) => setProdCategoriaId(Number(e.target.value))}>
                  {menu.map((cat) => (
                    <option key={cat.idNumerico} value={cat.idNumerico}>
                      {cat.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grupo-campo">
                <label>Nombre del producto</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Medio Pollo"
                  value={prodNombre}
                  onChange={(e) => setProdNombre(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Descripción / Detalles</label>
                <textarea
                  placeholder="Ej. Con papitas Galeana, tortillas y salsa..."
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Precio base ($)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={prodPrecio}
                  onChange={(e) => setProdPrecio(Number(e.target.value))}
                />
              </div>

              <div className="grupo-campo">
                <label>Insignia / Etiqueta destacada (opcional)</label>
                <input
                  type="text"
                  placeholder="Ej. El más vendido, Picoso, Nuevo..."
                  value={prodEtiqueta}
                  onChange={(e) => setProdEtiqueta(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Foto del producto</label>
                <div className="admin-preview-upload">
                  <img src={prodImagen || "/assets/img/logo.png"} alt="Preview" className="admin-preview-img" />
                  <div className="admin-subir-btn-wrapper">
                    <button type="button" className="btn btn--outline">Seleccionar imagen</button>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "menu", setProdImagen)} />
                  </div>
                  {prodImagen && (
                    <button type="button" style={{ color: "var(--danger)" }} onClick={() => setProdImagen("")}>Quitar foto</button>
                  )}
                </div>
              </div>

              <div className="grupo-campo">
                <label>Orden en el listado</label>
                <input
                  type="number"
                  value={prodOrden}
                  onChange={(e) => setProdOrden(Number(e.target.value))}
                />
              </div>

              <div className="grupo-campo" style={{ flexDirection: "row", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="prod-activo"
                  style={{ width: "auto" }}
                  checked={prodActivo}
                  onChange={(e) => setProdActivo(e.target.checked)}
                />
                <label htmlFor="prod-activo">Producto Activo (Visible en menú)</label>
              </div>

              {/* CONSTRUCTOR DE OPCIONES / VARIANTES */}
              <div className="opciones-constructor">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ fontWeight: "700" }}>Grupos de Variantes (Opciones)</h4>
                  <button type="button" className="btn btn--outline" style={{ padding: "0.3rem 0.8rem", fontSize: "0.75rem" }} onClick={agregarGrupoOpciones}>
                    + Agregar Grupo
                  </button>
                </div>
                
                {prodOpciones.map((opc, gIdx) => (
                  <div key={gIdx} className="opciones-constructor__grupo">
                    <button type="button" className="opciones-constructor__eliminar-grupo" onClick={() => eliminarGrupoOpciones(gIdx)}>
                      ✕
                    </button>
                    
                    <div className="grupo-campo">
                      <label>Nombre del Grupo (ej. Escoge tus Tortillas)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej. Tipo de Tortillas"
                        value={opc.etiqueta}
                        onChange={(e) => {
                          const nuevas = [...prodOpciones];
                          nuevas[gIdx].etiqueta = e.target.value;
                          setProdOpciones(nuevas);
                        }}
                      />
                    </div>

                    <div className="opciones-constructor__elecciones">
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>Opciones de elección</span>
                        <button type="button" className="btn btn--outline" style={{ padding: "0.2rem 0.6rem", fontSize: "0.7rem" }} onClick={() => agregarEleccion(gIdx)}>
                          + Elección
                        </button>
                      </div>

                      {opc.elecciones.map((el: any, eIdx: number) => (
                        <div key={eIdx} className="opciones-constructor__eleccion-fila">
                          <input
                            type="text"
                            required
                            placeholder="Ej. Maíz, Harina"
                            value={el.etiqueta}
                            onChange={(e) => {
                              const nuevas = [...prodOpciones];
                              nuevas[gIdx].elecciones[eIdx].etiqueta = e.target.value;
                              setProdOpciones(nuevas);
                            }}
                          />
                          <input
                            type="number"
                            placeholder="Costo extra"
                            value={el.extra}
                            onChange={(e) => {
                              const nuevas = [...prodOpciones];
                              nuevas[gIdx].elecciones[eIdx].extra = Number(e.target.value);
                              setProdOpciones(nuevas);
                            }}
                          />
                          <button type="button" style={{ color: "var(--danger)" }} onClick={() => eliminarEleccion(gIdx, eIdx)}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

            </div>
            <div className="modal-pie">
              <button type="button" className="btn btn--outline" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn--rojo">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL SUCURSAL */}
      {modalType === "sucursal" && (
        <div className="modal-overlay is-active" onClick={() => setModalType(null)}>
          <form className="modal" style={{ maxWidth: "550px" }} onClick={(e) => e.stopPropagation()} onSubmit={guardarSucursal}>
            <div className="modal-header">
              <h2>{modalEditItem ? "Editar Sucursal" : "Nueva Sucursal"}</h2>
              <button type="button" onClick={() => setModalType(null)}>✕</button>
            </div>
            <div className="modal-cuerpo" style={{ maxHeight: "75vh" }}>
              <div className="grupo-campo">
                <label>Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Sucursal Linda Vista"
                  value={sucNombre}
                  onChange={(e) => setSucNombre(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Dirección física</label>
                <input
                  type="text"
                  required
                  placeholder="Calle y número"
                  value={sucDireccion}
                  onChange={(e) => setSucDireccion(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Colonia</label>
                <input
                  type="text"
                  placeholder="Colonia"
                  value={sucColonia}
                  onChange={(e) => setSucColonia(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Ciudad</label>
                <input
                  type="text"
                  placeholder="Ciudad"
                  value={sucCiudad}
                  onChange={(e) => setSucCiudad(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Teléfono de contacto</label>
                <input
                  type="tel"
                  placeholder="Ej. 81 2230 9008"
                  value={sucTelefono}
                  onChange={(e) => setSucTelefono(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>WhatsApp Sucursal</label>
                <input
                  type="tel"
                  placeholder="Ej. 528122309008"
                  value={sucWhatsapp}
                  onChange={(e) => setSucWhatsapp(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Horario</label>
                <input
                  type="text"
                  placeholder="Ej. Lun a Dom de 11:30 AM a 10:00 PM"
                  value={sucHorario}
                  onChange={(e) => setSucHorario(e.target.value)}
                />
              </div>

              <div className="grupo-campo">
                <label>Enlace a Google Maps</label>
                <input
                  type="url"
                  placeholder="Ej. https://maps.google.com/..."
                  value={sucMapaUrl}
                  onChange={(e) => setSucMapaUrl(e.target.value)}
                />
              </div>

              <div className="admin-formulario-grid" style={{ gap: "1rem" }}>
                <div className="grupo-campo">
                  <label>Latitud (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. 25.6866"
                    value={sucLat}
                    onChange={(e) => setSucLat(e.target.value)}
                  />
                </div>
                <div className="grupo-campo">
                  <label>Longitud (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. -100.3161"
                    value={sucLng}
                    onChange={(e) => setSucLng(e.target.value)}
                  />
                </div>
              </div>

              <div className="grupo-campo">
                <label>Imagen de la sucursal</label>
                <div className="admin-preview-upload">
                  <img src={sucImagen || "/assets/img/logo.png"} alt="Preview" className="admin-preview-img" />
                  <div className="admin-subir-btn-wrapper">
                    <button type="button" className="btn btn--outline">Seleccionar imagen</button>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "sucursales", setSucImagen)} />
                  </div>
                  {sucImagen && (
                    <button type="button" style={{ color: "var(--danger)" }} onClick={() => setSucImagen("")}>Quitar foto</button>
                  )}
                </div>
              </div>

              <div className="grupo-campo">
                <label>Orden en el listado</label>
                <input
                  type="number"
                  value={sucOrden}
                  onChange={(e) => setSucOrden(Number(e.target.value))}
                />
              </div>

              <div className="grupo-campo" style={{ flexDirection: "row", gap: "0.5rem", alignItems: "center" }}>
                <input
                  type="checkbox"
                  id="suc-activo"
                  style={{ width: "auto" }}
                  checked={sucActivo}
                  onChange={(e) => setSucActivo(e.target.checked)}
                />
                <label htmlFor="suc-activo">Sucursal Activa (Visible en web)</label>
              </div>

            </div>
            <div className="modal-pie">
              <button type="button" className="btn btn--outline" onClick={() => setModalType(null)}>Cancelar</button>
              <button type="submit" className="btn btn--rojo">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* TOAST ALERT */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1a1512",
            color: "white",
            padding: "0.85rem 2rem",
            borderRadius: "var(--r-pill)",
            zIndex: 300,
            fontSize: "0.9rem",
            fontWeight: "700",
            boxShadow: "0 6px 30px rgba(0,0,0,0.3)",
            border: "1.5px solid var(--border)",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <span>🔥</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
