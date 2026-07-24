"use client";

import React, { useState, useEffect } from "react";

interface Election {
  id: string;
  label: string;
  extra: number;
}

interface Option {
  id: string;
  label: string;
  elecciones: Election[];
}

interface Product {
  id: string;
  nombre: string;
  desc: string;
  precio: number;
  tag: string | null;
  img: string | null;
  opciones: Option[];
}

interface Category {
  id: string;
  nombre: string;
  emoji: string;
  productos: Product[];
}

interface SitioClienteProps {
  datos: {
    config: {
      marca: string;
      eslogan: string;
      desde: number;
      horario: string;
      tiempoEntrega: string;
      whatsapp: { visible: string; numero: string };
      telefono: { visible: string; tel: string };
      avisoPrecios: string;
      costoEnvioTexto: string;
      redes: {
        facebook: string;
        instagram: string;
        tiktok: string;
      };
      sucursales: Array<{
        id: string;
        nombre: string;
        direccion: string;
        telefono: string;
        horario: string;
        mapa: string;
        imagen: string;
      }>;
    };
    menu: Category[];
    destacados: {
      hero: any | null;
      promos: any[];
    };
  };
}

interface CartItem {
  clave: string;
  id: string;
  nombre: string;
  cantidad: number;
  precio: number; // precio base + extras
  opciones: string[]; // etiquetas formateadas tipo "Tortillas: Maíz"
}

export default function SitioCliente({ datos }: SitioClienteProps) {
  const { config, menu, destacados } = datos;

  // Estados del carrito
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estados del formulario del pedido
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoEntrega, setTipoEntrega] = useState("domicilio"); // domicilio o recoger
  const [direccion, setDireccion] = useState("");
  const [sucursalRecoger, setSucursalRecoger] = useState("");
  const [formaPago, setFormaPago] = useState("Efectivo");
  const [notas, setNotas] = useState("");

  // Estado de las opciones seleccionadas en las tarjetas del menú
  // Clave: productoId -> GrupoId -> EleccionId
  const [opcionesSeleccionadas, setOpcionesSeleccionadas] = useState<Record<string, Record<string, string>>>({});

  // Categoria activa
  const [categoriaActiva, setCategoriaActiva] = useState("todo");

  // Menú móvil abierto
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Sistema de Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Formateador de dinero MXN sin decimales (como el original)
  const formatDinero = (val: number) => {
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  // Inicializar sucursal por defecto
  useEffect(() => {
    if (config.sucursales.length > 0) {
      setSucursalRecoger(config.sucursales[0].nombre);
    }
  }, [config.sucursales]);

  // Cargar carrito del localStorage al montar
  useEffect(() => {
    const savedCart = localStorage.getItem("pm_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error loading cart", e);
      }
    }
  }, []);

  // Guardar carrito en localStorage cuando cambie
  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("pm_cart", JSON.stringify(newCart));
  };

  // Helper para mostrar un toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Cambiar selección de opción en la tarjeta
  const seleccionarOpcion = (productoId: string, grupoId: string, eleccionId: string) => {
    setOpcionesSeleccionadas((prev) => ({
      ...prev,
      [productoId]: {
        ...(prev[productoId] || {}),
        [grupoId]: eleccionId,
      },
    }));
  };

  // Obtener precio final calculado
  const obtenerPrecioFinal = (producto: Product) => {
    let total = producto.precio;
    if (!producto.opciones) return total;
    for (const grupo of producto.opciones) {
      const seleccionadaId = opcionesSeleccionadas[producto.id]?.[grupo.id] || grupo.elecciones[0]?.id;
      const eleccion = grupo.elecciones.find((e) => e.id === seleccionadaId);
      if (eleccion && eleccion.extra) {
        total += eleccion.extra;
      }
    }
    return total;
  };

  // Agregar producto al carrito usando las opciones seleccionadas en su tarjeta
  const handleAgregarProducto = (producto: Product) => {
    const etiquetas: string[] = [];
    let extra = 0;
    
    if (producto.opciones) {
      producto.opciones.forEach((opcion) => {
        const seleccionadaId = opcionesSeleccionadas[producto.id]?.[opcion.id] || opcion.elecciones[0]?.id;
        const eleccion = opcion.elecciones.find((e) => e.id === seleccionadaId);
        if (eleccion) {
          etiquetas.push(`${opcion.label}: ${eleccion.label}`);
          extra += eleccion.extra;
        }
      });
    }

    const itemPrecio = producto.precio + extra;
    // Generar clave única
    const clave = producto.id + (etiquetas.length ? "-" + etiquetas.join("|") : "");

    const existingIndex = cart.findIndex((item) => item.clave === clave);
    if (existingIndex !== -1) {
      const newCart = [...cart];
      newCart[existingIndex].cantidad += 1;
      saveCart(newCart);
    } else {
      const newItem: CartItem = {
        clave,
        id: producto.id,
        nombre: producto.nombre,
        cantidad: 1,
        precio: itemPrecio,
        opciones: etiquetas,
      };
      saveCart([...cart, newItem]);
    }
    triggerToast(`¡Agregado! ${producto.nombre}`);
  };

  // Modificar cantidad en el carrito
  const modificarCantidad = (clave: string, cambio: number) => {
    const newCart = cart
      .map((item) => {
        if (item.clave === clave) {
          return { ...item, cantidad: item.cantidad + cambio };
        }
        return item;
      })
      .filter((item) => item.cantidad > 0);
    saveCart(newCart);
  };

  const quitarItem = (clave: string) => {
    const newCart = cart.filter((item) => item.clave !== clave);
    saveCart(newCart);
  };

  const alVaciar = () => {
    if (!cart.length) return;
    if (!window.confirm("¿Vaciar todo el pedido?")) return;
    saveCart([]);
  };

  // Totales
  const subtotal = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);
  const itemsCount = cart.reduce((acc, item) => acc + item.cantidad, 0);

  // Envío del pedido a WhatsApp
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) return;

    // Validar datos
    if (nombre.trim().length < 2) {
      triggerToast("Escribe tu nombre, por favor.");
      document.getElementById("pedido-nombre")?.focus();
      return;
    }
    if (telefono.replace(/\D/g, "").length < 10) {
      triggerToast("Escribe un teléfono de 10 dígitos.");
      document.getElementById("pedido-telefono")?.focus();
      return;
    }
    if (tipoEntrega === "domicilio" && direccion.trim().length < 8) {
      triggerToast("Necesitamos tu dirección completa.");
      document.getElementById("pedido-direccion")?.focus();
      return;
    }

    // Construir mensaje de WhatsApp
    const esDomicilio = tipoEntrega === "domicilio";
    const partes = [
      `*NUEVO PEDIDO — ${config.marca}*`,
      "──────────────",
    ];

    cart.forEach((item) => {
      // Limpiar etiquetas de opciones para el mensaje legible de WhatsApp (quitar nombre del grupo)
      // Ej: "Tipo de tortillas: Maíz" -> "Maíz"
      const cleanOpts = item.opciones.map((opt) => {
        const parts = opt.split(": ");
        return parts.length > 1 ? parts[1] : opt;
      });
      const optsText = cleanOpts.length ? ` (${cleanOpts.join(", ")})` : "";
      partes.push(
        `• ${item.cantidad}x ${item.nombre}${optsText} — ${formatDinero(item.precio * item.cantidad)}`
      );
    });

    partes.push("──────────────");
    partes.push(`*Subtotal: ${formatDinero(subtotal)}*`);
    partes.push("");
    partes.push(`*Entrega:* ${esDomicilio ? "A domicilio" : "Paso a recoger"}`);
    partes.push(`*Sucursal:* ${sucursalRecoger}`);
    partes.push(`*Nombre:* ${nombre}`);
    partes.push(`*Teléfono:* ${telefono}`);
    if (esDomicilio) {
      partes.push(`*Dirección:* ${direccion}`);
    }
    partes.push(`*Pago:* ${formaPago}`);
    if (notas.trim()) {
      partes.push(`*Notas:* ${notas.trim()}`);
    }
    partes.push("");
    partes.push(esDomicilio ? `_${config.costoEnvioTexto}_` : "_Gracias por su preferencia._");

    const mensajeFinal = partes.join("\n");
    const link = `https://wa.me/${config.whatsapp.numero}?text=${encodeURIComponent(mensajeFinal)}`;
    
    triggerToast("Abriendo WhatsApp con tu pedido…");
    window.open(link, "_blank", "noopener");
  };

  // Filtrado de menú
  const todosLosProductos = menu.reduce((acc, cat) => {
    return [...acc, ...cat.productos];
  }, [] as Product[]);

  const productosFiltrados =
    categoriaActiva === "todo"
      ? todosLosProductos
      : menu.find((c) => c.id === categoriaActiva)?.productos || [];

  return (
    <>
      {/* ══════════ AVISO SUPERIOR ══════════ */}
      <div className="barra-aviso">
        <div className="contenedor">
          <span>🔥 {config.horario} · Pedidos al{" "}
            <a href={`tel:${config.telefono.tel}`} className="texto-amarillo">
              <strong>{config.telefono.visible}</strong>
            </a>
          </span>
        </div>
      </div>

      {/* ══════════ HEADER ══════════ */}
      <header className="header" id="header">
        <div className="contenedor header__inner">
          <a className="logo" href="#inicio" aria-label="Pollo Medina, inicio">
            <span className="logo__badge">
              <img src="/assets/img/logo.png" alt="Pollo Medina" width="52" height="52" />
            </span>
            <span className="logo__texto">
              <b>{config.marca}</b>
              <small>Desde {config.desde}</small>
            </span>
          </a>

          <nav className="nav" aria-label="Navegación principal">
            <ul className="nav__lista">
              <li><a href="#promos">Promos</a></li>
              <li><a href="#menu">Menú</a></li>
              <li><a href="#como-pedir">Cómo pedir</a></li>
              <li><a href="#sucursales">Sucursales</a></li>
              <li><a href="#nosotros">Nosotros</a></li>
            </ul>
          </nav>

          <div className="header__acciones">
            <a className="header__tel" href={`tel:${config.telefono.tel}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ width: "18px", height: "18px" }}>
                <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>
              </svg>
              <span>{config.telefono.visible}</span>
            </a>

            <button className="btn-carrito" id="btn-carrito" onClick={() => setIsCartOpen(true)} type="button" aria-label="Abrir mi pedido">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "20px", height: "20px" }}>
                <path d="M6 6h15l-1.7 9H8L6 3H3"/><circle cx="9" cy="20" r="1.6"/><circle cx="18" cy="20" r="1.6"/>
              </svg>
              <span>Mi pedido</span>
              {itemsCount > 0 && <span className="btn-carrito__num" id="carrito-contador">{itemsCount}</span>}
            </button>

            <button 
              className="btn-menu-movil" 
              id="btn-menu-movil"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)} 
              type="button" 
              aria-expanded={isMobileNavOpen} 
              aria-label="Menu"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" style={{ width: "26px", height: "26px" }}>
                <path d={isMobileNavOpen ? "M18 6 6 18M6 6l12 12" : "M4 7h16M4 12h16M4 17h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Navegación móvil drawer */}
        <nav className={`nav-movil ${isMobileNavOpen ? "abierto" : ""}`} id="nav-movil">
          <a href="#promos" onClick={() => setIsMobileNavOpen(false)}>Promos</a>
          <a href="#menu" onClick={() => setIsMobileNavOpen(false)}>Menú</a>
          <a href="#como-pedir" onClick={() => setIsMobileNavOpen(false)}>Cómo pedir</a>
          <a href="#sucursales" onClick={() => setIsMobileNavOpen(false)}>Sucursales</a>
          <a href="#nosotros" onClick={() => setIsMobileNavOpen(false)}>Nosotros</a>
        </nav>
      </header>

      <main id="inicio">
        {/* ══════════ HERO ══════════ */}
        <section className="hero textura-papel">
          <div className="contenedor hero__grid">
            <div className="hero__col">
              <p className="hero__kicker">Pollo asado al carbón · Desde {config.desde}</p>
              <h1 className="hero__titulo">
                <span className="hero__titulo-lead">El antojo de Monterrey es</span>
                <span className="display hero__titulo-slogan">{config.eslogan}</span>
              </h1>
              <p className="hero__texto">
                Pollo entero al carbón con papitas Galeana, tortillas recién hechas y las deliciosas salsas
                de la casa. Nueve sucursales en el área metropolitana para llevártelo caliente.
              </p>
              <div className="hero__ctas">
                <a className="btn btn--amarillo" href="#menu">Ver el menú y pedir</a>
                <a className="btn btn--wa" href={`https://wa.me/${config.whatsapp.numero}?text=Hola!%20Me%20gustaria%20ver%20el%20menu%20y%20hacer%20un%20pedido.`} target="_blank" rel="noopener noreferrer">
                  <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: "20px", height: "20px" }}>
                    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .2-3.3-.7a11.7 11.7 0 0 1-4.8-4.2c-.4-.5-1.1-1.6-1.1-3 0-1.5.7-2.2 1-2.5.2-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l.9 2.2c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6a8.6 8.6 0 0 0 3.9 3.3c.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.6-.1l2.1 1.0c.3.1.4.2.5.3.1.2.1.6-.1 1.1Z"/>
                  </svg>
                  Pedir por WhatsApp
                </a>
              </div>
              <ul className="hero__confianza">
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/></svg>
                  9 sucursales en el área
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M4 17.5h-1v-4l3-5h6l4 5h3a1 1 0 0 1 1 1v3h-2"/><path d="M9 17.5h6"/></svg>
                  Servicio a domicilio
                </li>
                <li>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="2.5"/><path d="M2.5 9.5h19"/></svg>
                  Efectivo, tarjeta y transferencia
                </li>
              </ul>
            </div>

            <div className="hero__destacado">
              <figure className="hero__marco">
                {destacados.hero?.img ? (
                  <img className="hero__marco-foto" src={destacados.hero.img} alt={destacados.hero.nombre} />
                ) : (
                  <div className="hero__marco-empty" aria-hidden="true">
                    <img className="hero__marco-logo" src="/assets/img/logo.png" alt="Pollo Medina" width="120" height="120" />
                    <span className="hero__marco-linea">Al carbón · Desde {config.desde}</span>
                  </div>
                )}
              </figure>
              {destacados.hero && (
                <>
                  <span className="hero__cinta">{destacados.hero.etiqueta || "Especialidad de la casa"}</span>
                  <div className="hero__sello">
                    <b>{formatDinero(destacados.hero.precio)}</b>
                    <small>{destacados.hero.subtitulo || destacados.hero.nombre}</small>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="rasgado rasgado--abajo rasgado--crema"></div>
        </section>

        {/* ══════════ PROMOS ══════════ */}
        <section className="seccion seccion--crema" id="promos">
          <div className="contenedor">
            <div className="titulo-seccion aparece visible">
              <span className="etiqueta etiqueta--roja">Arma tu antojo</span>
              <h2>Promociones de la semana</h2>
              <p>Paquetes deliciosos pensados para compartir. Válidos en sucursal y a domicilio.</p>
            </div>

            <div className="promos__grid" id="promos-grid">
              {destacados.promos.map((promo, index) => {
                const esDestacada = index === 0;
                return (
                  <article key={promo.id || index} className={`promo ${esDestacada ? "promo--destacada textura-papel" : ""} aparece visible`}>
                    <div className="promo__media">
                      {promo.img && <img src={promo.img} alt={promo.nombre} loading="lazy" />}
                    </div>
                    <div className="promo__cuerpo">
                      {promo.etiqueta && (
                        <span className={`etiqueta ${esDestacada ? "etiqueta--amarilla" : "etiqueta--roja"}`} style={{ alignSelf: "flex-start" }}>
                          {promo.etiqueta}
                        </span>
                      )}
                      <h3 className="promo__titulo">{promo.nombre}</h3>
                      {promo.desc && <p className="promo__desc">{promo.desc}</p>}
                      <span className="promo__precio">{formatDinero(promo.precio)}</span>
                      <a className={`btn ${esDestacada ? "btn--amarillo" : "btn--rojo"}`} href="#menu" onClick={() => {
                        // Buscar el producto original en el menú e inicializar
                        let prodMatch: Product | null = null;
                        menu.forEach((cat) => {
                          const p = cat.productos.find((item) => item.id === String(promo.slug));
                          if (p) prodMatch = p;
                        });
                        if (prodMatch) {
                          handleAgregarProducto(prodMatch);
                        } else {
                          const tempProd: Product = {
                            id: String(promo.slug),
                            nombre: promo.nombre,
                            desc: promo.desc || "",
                            precio: promo.precio,
                            tag: null,
                            img: promo.img,
                            opciones: [],
                          };
                          handleAgregarProducto(tempProd);
                        }
                      }}>
                        {esDestacada ? "Pedir esta promo" : "Ver el paquete"}
                      </a>
                      {esDestacada && <p className="promo__legal" data-aviso-precios></p>}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════ MENÚ ══════════ */}
        <section className="seccion seccion--blanca" id="menu">
          <div className="contenedor">
            <div className="titulo-seccion aparece visible">
              <span className="etiqueta">Nuestro menú</span>
              <h2>Escoge, agrega y pide</h2>
              <p>Arma tu pedido aquí y lo mandamos listo por WhatsApp. Sin apps, sin registros.</p>
            </div>

            {/* Categorías (Tabs) */}
            <div className="tabs" id="menu-tabs" role="tablist" aria-label="Categorías del menú">
              <button
                className="tab"
                role="tab"
                aria-selected={categoriaActiva === "todo"}
                onClick={() => setCategoriaActiva("todo")}
              >
                Todo
              </button>
              {menu.map((cat) => (
                <button
                  key={cat.id}
                  className="tab"
                  role="tab"
                  aria-selected={categoriaActiva === cat.id}
                  onClick={() => setCategoriaActiva(cat.id)}
                >
                  <span aria-hidden="true">{cat.emoji}</span> {cat.nombre}
                </button>
              ))}
            </div>

            {/* Grid de productos */}
            <div className="grid-menu" id="menu-grid">
              {productosFiltrados.map((producto) => (
                <article key={producto.id} className="producto aparece visible">
                  <div className="producto__media">
                    {producto.tag && <span className="etiqueta etiqueta--amarilla producto__tag">{producto.tag}</span>}
                    {producto.img && <img src={producto.img} alt={producto.nombre} loading="lazy" width="400" height="300" />}
                  </div>
                  <div className="producto__cuerpo">
                    <h3 className="producto__nombre">{producto.nombre}</h3>
                    <p className="producto__desc">{producto.desc}</p>
                    
                    {/* Renderizado de opciones directamente en la tarjeta */}
                    {producto.opciones && producto.opciones.length > 0 && (
                      <div className="producto__opciones">
                        {producto.opciones.map((grupo) => (
                          <div key={grupo.id} className="opcion">
                            <span className="opcion__label">{grupo.label}</span>
                            <div className="opcion__pills" role="group" aria-label={grupo.label}>
                              {grupo.elecciones.map((eleccion) => {
                                const seleccionadaId = opcionesSeleccionadas[producto.id]?.[grupo.id] || grupo.elecciones[0]?.id;
                                const esActivo = seleccionadaId === eleccion.id;
                                return (
                                  <button
                                    key={eleccion.id}
                                    type="button"
                                    className="pill"
                                    aria-pressed={esActivo}
                                    onClick={() => seleccionarOpcion(producto.id, grupo.id, eleccion.id)}
                                  >
                                    {eleccion.label}
                                    {eleccion.extra > 0 && ` +${formatDinero(eleccion.extra)}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="producto__pie">
                    <div className="producto__precio">
                      {formatDinero(obtenerPrecioFinal(producto))}
                      <small>Precio final</small>
                    </div>
                    <button 
                      className="btn btn--rojo btn--sm" 
                      type="button" 
                      onClick={() => handleAgregarProducto(producto)}
                      aria-label={`Agregar ${producto.nombre} al pedido`}
                    >
                      Agregar
                    </button>
                  </div>
                </article>
              ))}
              {productosFiltrados.length === 0 && (
                <p style={{ textAlign: "center", gridColumn: "1/-1", color: "var(--texto-suave)", fontStyle: "italic" }}>
                  No hay productos en esta categoría por el momento.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ══════════ CÓMO PEDIR ══════════ */}
        <section className="seccion seccion--negra" id="como-pedir">
          <div className="rasgado rasgado--arriba rasgado--blanco"></div>
          <div className="contenedor">
            <div className="titulo-seccion titulo-seccion--centro aparece visible">
              <span className="etiqueta etiqueta--amarilla">Fácil y rápido</span>
              <h2>Pedir es de tres pasos</h2>
            </div>

            <div className="pasos">
              <article className="paso aparece visible">
                <h3>Arma tu pedido</h3>
                <p>Agrega lo que se te antoje del menú y elige tus variantes: tortillas, tamaño y salsas.</p>
              </article>
              <article className="paso aparece visible">
                <h3>Envíalo por WhatsApp</h3>
                <p>Con un toque se abre WhatsApp con tu pedido ya escrito. Solo confirmas y listo.</p>
              </article>
              <article className="paso aparece visible">
                <h3>Recibe o recoge</h3>
                <p>Te lo llevamos hasta tu domicilio, o pasas por él a la sucursal más cercana.</p>
              </article>
            </div>
          </div>
          <div className="rasgado rasgado--abajo rasgado--crema"></div>
        </section>

        {/* ══════════ SUCURSALES ══════════ */}
        <section className="seccion seccion--crema" id="sucursales">
          <div className="contenedor">
            <div className="titulo-seccion aparece visible">
              <span className="etiqueta etiqueta--roja">Visítanos</span>
              <h2>Nuestras sucursales</h2>
              <p>Ven por tu pollo o pídelo a domicilio desde la sucursal más cercana.</p>
            </div>
            
            <div className="sucursales" id="lista-sucursales">
              {config.sucursales.map((s) => (
                <article key={s.id} className="sucursal aparece visible">
                  {s.imagen && (
                    <img className="sucursal__foto" src={s.imagen} alt={`Sucursal ${s.nombre}`} loading="lazy" width="600" height="340" />
                  )}
                  <h3>{s.nombre}</h3>
                  <p className="sucursal__dato">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>
                    </svg>
                    <span>{s.direccion}</span>
                  </p>
                  <p className="sucursal__dato">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>
                    </svg>
                    <span>{s.horario}</span>
                  </p>
                  <p className="sucursal__dato">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>
                    </svg>
                    <span>{s.telefono}</span>
                  </p>
                  <div className="sucursal__links">
                    {s.mapa && (
                      <a className="btn btn--negro btn--sm" href={s.mapa} target="_blank" rel="noopener noreferrer">
                        Cómo llegar
                      </a>
                    )}
                    <button 
                      className="btn btn--amarillo btn--sm" 
                      type="button"
                      onClick={() => {
                        setTipoEntrega("recoger");
                        setSucursalRecoger(s.nombre);
                        setIsCartOpen(true);
                      }}
                    >
                      Pedir aquí
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════ NOSOTROS ══════════ */}
        <section className="seccion seccion--blanca" id="nosotros">
          <div className="contenedor nosotros">
            <div className="aparece visible">
              <span className="etiqueta">Nuestra historia</span>
              <h2 style={{ marginBlock: "var(--sp-3)" }}>
                Asando pollo <br />
                <span className="texto-rojo">desde 1989</span>
              </h2>
              <p style={{ color: "var(--texto-suave)", fontSize: "var(--t-md)" }}>
                Todo empezó con un asador, una receta de familia y la idea de que un buen pollo se comparte.
                Tres generaciones después seguimos marinando igual, asando al carbón y sirviendo esas papitas
                Galeana que nadie sabe copiar.
              </p>
              <p style={{ color: "var(--texto-suave)", marginTop: "var(--sp-3)" }}>
                Eso es <strong>Pura Vitamina</strong>: comida honesta, porciones que rinden y el sabor de siempre.
              </p>
              <div className="nosotros__stats">
                <div className="stat"><b>1989</b><small>Año de fundación</small></div>
                <div className="stat"><b>+35</b><small>Años de sabor</small></div>
                <div className="stat"><b>9</b><small>Sucursales</small></div>
              </div>
            </div>

            <figure className="nosotros__media aparece visible">
              <div className="nosotros__media-empty" aria-hidden="true">
                <img className="nosotros__media-logo" src="/assets/img/logo.png" alt="" width="120" height="120" />
              </div>
              <img className="nosotros__media-foto" src="/assets/img/og.jpg" alt="Pollo asándose al carbón en Pollo Medina" loading="lazy" width="800" height="600" />
            </figure>
          </div>
        </section>

        {/* ══════════ CTA FINAL ══════════ */}
        <section className="seccion seccion--roja textura-papel">
          <div className="contenedor cta-final">
            <span className="etiqueta etiqueta--amarilla">Haz tu pedido</span>
            <h2 className="display">Pide tu Pollo Medina<br />ahora mismo</h2>
            <p style={{ maxWidth: "52ch" }}>{config.horario} · También para llevar.</p>
            <div className="cta-final__botones">
              <a className="btn btn--wa" href={`https://wa.me/${config.whatsapp.numero}?text=Hola!%20Me%20gustaria%20hacer%20un%20pedido.`} target="_blank" rel="noopener noreferrer">
                WhatsApp <span>{config.whatsapp.visible}</span>
              </a>
              <a className="btn btn--negro" href={`tel:${config.telefono.tel}`}>
                Llamar <span>{config.telefono.visible}</span>
              </a>
              <button className="btn btn--amarillo" onClick={() => setIsCartOpen(true)} type="button">
                Ver mi pedido
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer className="footer">
        <div className="contenedor">
          <div className="footer__grid">
            <div>
              <h4>Pollo Medina®</h4>
              <p>Pollo asado al carbón, papitas Galeana y cortes. Pura Vitamina desde 1989 en Monterrey, N.L.</p>
              <div className="redes" style={{ marginTop: "var(--sp-4)" }}>
                {config.redes.facebook && (
                  <a href={config.redes.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 22v-8h2.7l.4-3.1h-3.1V8.9c0-.9.25-1.5 1.55-1.5h1.65V4.6A22 22 0 0 0 14.3 4.5c-2.4 0-4 1.45-4 4.1v2.3H7.6V14h2.7v8h3.2Z"/></svg>
                  </a>
                )}
                {config.redes.instagram && (
                  <a href={config.redes.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none"/></svg>
                  </a>
                )}
                {config.redes.tiktok && (
                  <a href={config.redes.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok">
                    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3c.4 2.2 1.7 3.5 3.9 3.7v2.6c-1.4.1-2.7-.3-3.9-1v5.9c0 4.4-4.1 6.9-7.7 5-2.3-1.3-3.1-4.4-1.9-6.8 1-2 3.2-3 5.4-2.6v2.8c-.4-.1-.8-.2-1.2-.1-1.2.1-2 1.1-1.9 2.3.1 1.1 1.1 2 2.3 1.9 1.2-.1 2-1 2-2.3V3h3Z"/></svg>
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4>Pedidos</h4>
              <ul>
                <li>WhatsApp: <a href={`https://wa.me/${config.whatsapp.numero}`} target="_blank" rel="noopener noreferrer"><span>{config.whatsapp.visible}</span></a></li>
                <li>Teléfono: <a href={`tel:${config.telefono.tel}`}><span>{config.telefono.visible}</span></a></li>
                <li>{config.horario}</li>
              </ul>
            </div>

            <div>
              <h4>Explora</h4>
              <ul>
                <li><a href="#promos">Promociones</a></li>
                <li><a href="#menu">Menú completo</a></li>
                <li><a href="#sucursales">Sucursales</a></li>
                <li><a href="#nosotros">Nuestra historia</a></li>
              </ul>
            </div>

            <div>
              <h4>Aviso</h4>
              <p>{config.avisoPrecios}</p>
              <p style={{ marginTop: "var(--sp-2)" }}>Imágenes ilustrativas. Disponibilidad sujeta a existencias.</p>
            </div>
          </div>

          <div className="footer__legal">
            <span>© {new Date().getFullYear()} Pollo Medina®. Todos los derechos reservados.</span>
            <span>Hecho con 🔥 en Monterrey, N.L.</span>
          </div>
        </div>
      </footer>

      {/* ══════════ CARRITO DRAWER ══════════ */}
      <div className={`carrito-fondo ${isCartOpen ? "abierto" : ""}`} id="carrito-fondo" onClick={() => setIsCartOpen(false)} />

      <aside className={`carrito ${isCartOpen ? "abierto" : ""}`} id="carrito" aria-label="Mi pedido">
        <div className="carrito__head">
          <h2>Mi pedido</h2>
          <button className="carrito__cerrar" id="carrito-cerrar" onClick={() => setIsCartOpen(false)} type="button" aria-label="Cerrar pedido">✕</button>
        </div>

        <div className="carrito__cuerpo">
          <div id="carrito-lineas">
            {cart.map((item) => (
              <div key={item.clave} className="linea" data-clave={item.clave}>
                <div>
                  <p className="linea__nombre">{item.nombre}</p>
                  {item.opciones && item.opciones.length > 0 && (
                    <p className="linea__opts">{item.opciones.join(" · ")}</p>
                  )}
                </div>
                <p className="linea__precio">{formatDinero(item.precio * item.cantidad)}</p>
                <div className="qty">
                  <button type="button" onClick={() => modificarCantidad(item.clave, -1)} aria-label={`Quitar uno de ${item.nombre}`}>−</button>
                  <span>{item.cantidad}</span>
                  <button type="button" onClick={() => modificarCantidad(item.clave, 1)} aria-label={`Agregar uno de ${item.nombre}`}>+</button>
                </div>
                <button type="button" className="linea__quitar" onClick={() => quitarItem(item.clave)}>Quitar</button>
              </div>
            ))}
          </div>

          <button className="linea__quitar" id="vaciar-carrito" onClick={alVaciar} type="button" hidden={cart.length === 0}>
            Vaciar pedido
          </button>

          <form className="pedido-form" id="form-pedido" onSubmit={handleCheckoutSubmit} noValidate hidden={cart.length === 0}>
            <div className="campo">
              <label>Tipo de entrega</label>
              <div className="opciones-radio">
                <label className="radio-tarjeta">
                  <input
                    type="radio"
                    name="tipo"
                    value="domicilio"
                    checked={tipoEntrega === "domicilio"}
                    onChange={() => setTipoEntrega("domicilio")}
                  /> 🛵 A domicilio
                </label>
                <label className="radio-tarjeta">
                  <input
                    type="radio"
                    name="tipo"
                    value="recoger"
                    checked={tipoEntrega === "recoger"}
                    onChange={() => setTipoEntrega("recoger")}
                  /> 🏪 Recoger
                </label>
              </div>
            </div>

            <div className="campo">
              <label htmlFor="pedido-sucursal">Sucursal</label>
              <select
                id="pedido-sucursal"
                name="sucursal"
                value={sucursalRecoger}
                onChange={(e) => setSucursalRecoger(e.target.value)}
              >
                {config.sucursales.map((s) => (
                  <option key={s.id} value={s.nombre}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="campo">
              <label htmlFor="pedido-nombre">Nombre</label>
              <input
                id="pedido-nombre"
                name="nombre"
                type="text"
                autoComplete="name"
                placeholder="¿A nombre de quién?"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="pedido-telefono">Teléfono</label>
              <input
                id="pedido-telefono"
                name="telefono"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="81 0000 0000"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>

            <div className="campo" id="campo-direccion" hidden={tipoEntrega !== "domicilio"}>
              <label htmlFor="pedido-direccion">Dirección de entrega</label>
              <textarea
                id="pedido-direccion"
                name="direccion"
                placeholder="Calle, número, colonia y referencias"
                required={tipoEntrega === "domicilio"}
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>

            <div className="campo">
              <label htmlFor="pedido-pago">Forma de pago</label>
              <select
                id="pedido-pago"
                name="pago"
                value={formaPago}
                onChange={(e) => setFormaPago(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta (terminal en la entrega)">Tarjeta (terminal en la entrega)</option>
                <option value="Transferencia">Transferencia</option>
              </select>
            </div>

            <div className="campo">
              <label htmlFor="pedido-notas">Notas (opcional)</label>
              <textarea
                id="pedido-notas"
                name="notas"
                placeholder="Sin salsa picosa, tocar timbre, etc."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
              />
            </div>
          </form>
        </div>

        <div className="carrito__pie" id="carrito-pie" hidden={cart.length === 0}>
          <div className="total">
            <span>Subtotal</span>
            <span id="carrito-total">{formatDinero(subtotal)}</span>
          </div>
          <button className="btn btn--wa btn--bloque" id="enviar-pedido" type="submit" form="form-pedido" disabled={cart.length === 0}>
            Enviar pedido por WhatsApp
          </button>
          <p className="carrito__nota">{config.avisoPrecios} {config.costoEnvioTexto}</p>
        </div>
      </aside>

      {/* ══════════ FLOTANTES ══════════ */}
      <a className="wa-flotante" href={`https://wa.me/${config.whatsapp.numero}?text=Hola!%20Me%20gustaria%20hacer%20un%20pedido.`} target="_blank" rel="noopener noreferrer" aria-label="Pedir por WhatsApp">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ width: "32px", height: "32px" }}>
          <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.6 14.2c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .2-3.3-.7a11.7 11.7 0 0 1-4.8-4.2c-.4-.5-1.1-1.6-1.1-3 0-1.5.7-2.2 1-2.5.2-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l.9 2.2c.1.2.1.4 0 .6l-.4.6c-.1.2-.3.3-.1.6a8.6 8.6 0 0 0 3.9 3.3c.3.1.5.1.7-.1l.9-1c.2-.2.4-.2.6-.1l2.1 1c.3.1.4.2.5.3.1.2.1.6-.1 1.1Z"/>
        </svg>
        <span>Pedir por WhatsApp</span>
      </a>

      {/* Toast Alert Flotante */}
      <div className={`toast ${toastMessage ? "visible" : ""}`} id="toast" role="status" aria-live="polite">
        {toastMessage}
      </div>
    </>
  );
}
