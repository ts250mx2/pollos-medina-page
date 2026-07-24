/**
 * Datos con los que se llena la base la primera vez (npm run db:sembrar).
 *
 * SUCURSALES: direcciones y teléfonos obtenidos de directorios públicos a partir
 * de los enlaces de Google que compartió el negocio. Confírmalos antes de publicar
 * y ajústalos desde el panel de administración.
 */
"use strict";

const CONFIGURACION = [
  { clave: "marca", valor: "Pollo Medina", grupo: "general", descripcion: "Nombre del negocio" },
  { clave: "eslogan", valor: "Pura Vitamina", grupo: "general", descripcion: "Eslogan" },
  { clave: "desde", valor: "1989", grupo: "general", descripcion: "Año de fundación" },
  { clave: "horario", valor: "Todos los días de 11:00 a 21:00 h", grupo: "general", descripcion: "Horario mostrado en el sitio" },
  { clave: "tiempo_entrega", valor: "30–45 min aprox.", grupo: "general", descripcion: "Tiempo estimado de entrega" },

  { clave: "whatsapp_visible", valor: "81 2230 9008", grupo: "contacto", descripcion: "WhatsApp como se muestra" },
  { clave: "whatsapp_numero", valor: "528122309008", grupo: "contacto", descripcion: "WhatsApp en formato internacional (52 + 10 dígitos)" },
  { clave: "telefono_visible", valor: "81 3142 4250", grupo: "contacto", descripcion: "Teléfono como se muestra" },
  { clave: "telefono_tel", valor: "+528131424250", grupo: "contacto", descripcion: "Teléfono para el enlace tel:" },

  { clave: "aviso_precios", valor: "Precios sujetos a cambio sin previo aviso.", grupo: "avisos", descripcion: "Aviso legal de precios" },
  { clave: "costo_envio_texto", valor: "Costo extra por servicio a domicilio (según zona).", grupo: "avisos", descripcion: "Aviso del costo de envío" },

  { clave: "red_facebook", valor: "https://www.facebook.com/PollosMedinaOficial", grupo: "redes", descripcion: "Facebook" },
  { clave: "red_instagram", valor: "https://www.instagram.com/pollosmedina.oficial/", grupo: "redes", descripcion: "Instagram" },
  { clave: "red_tiktok", valor: "https://www.tiktok.com/@pollomedinaoficial", grupo: "redes", descripcion: "TikTok" },
];

const SUCURSALES = [
  {
    slug: "mitras",
    nombre: "Mitras",
    direccion: "Río Jordán #2403 (frente al Centro Médico Los Ángeles)",
    colonia: "Mitras Centro",
    ciudad: "Monterrey, N.L.",
    telefono: "81 9627 0516",
    horario: "Lun a Vie · 10:00 – 19:00 h",
    mapa_url: "https://share.google/qqaBNAxgeVBGhrRcH",
    orden: 1,
  },
  {
    slug: "eloy-cavazos",
    nombre: "Eloy Cavazos",
    direccion: "Av. Eloy Cavazos #6907",
    colonia: "Santa María",
    ciudad: "Guadalupe, N.L.",
    telefono: "81 1469 6373",
    horario: "Lun a Vie · 11:00 – 20:00 h",
    mapa_url: "https://share.google/slPQSNQb2Ouvq4cz7",
    orden: 2,
  },
  {
    slug: "san-nicolas",
    nombre: "San Nicolás",
    direccion: "Por confirmar — actualízala desde el panel",
    colonia: "Las Puentes",
    ciudad: "San Nicolás de los Garza, N.L.",
    telefono: "81 3142 4250",
    horario: "Lun a Vie · 11:00 – 19:00 h",
    mapa_url: "https://share.google/GcQOHKRmlQkQaZvpS",
    orden: 3,
  },
  {
    slug: "centro-guadalupe",
    nombre: "Centro de Guadalupe",
    direccion: "Arteaga #832, cruz con Mante",
    colonia: "Paraíso",
    ciudad: "Guadalupe, N.L.",
    telefono: "81 1520 9581",
    horario: "Lun a Vie · 11:00 – 19:00 h",
    mapa_url: "https://share.google/KnssNqHJf8iTXN9Ow",
    orden: 4,
  },
  {
    slug: "escamilla",
    nombre: "Escamilla",
    direccion: "Av. Constituyentes de Nuevo León #417, cruz con Ejército Trigarante",
    colonia: "Escamilla",
    ciudad: "Guadalupe, N.L.",
    telefono: "81 2315 5075",
    horario: "Lun a Vie · 10:00 – 19:00 h",
    mapa_url: "https://share.google/GT2bgUGbgvqDEoKxO",
    orden: 5,
  },
  {
    slug: "las-torres",
    nombre: "Las Torres",
    direccion: "Calle Ocho #517, cruz con Av. Las Torres",
    colonia: "Praderas de Girasoles",
    ciudad: "General Escobedo, N.L.",
    telefono: "81 1096 7157",
    horario: "Lun a Vie · 11:00 – 19:00 h",
    mapa_url: "https://share.google/9YAokH1TnygUxTs7W",
    orden: 6,
  },
  {
    slug: "riberas-del-rio",
    nombre: "Riberas del Río",
    direccion: "Av. Gral. Plutarco Elías Calles #3222",
    colonia: "Riberas del Río",
    ciudad: "Guadalupe, N.L.",
    telefono: "81 1767 9365",
    horario: "Lun a Vie · 11:00 – 19:00 h",
    mapa_url: "https://share.google/4bN7KeKxs20ibRqwu",
    orden: 7,
  },
  {
    slug: "los-lermas",
    nombre: "Los Lermas",
    direccion: "Av. Gral. Plutarco Elías Calles #1805",
    colonia: "Hacienda Los Lermas 2° Sector",
    ciudad: "Guadalupe, N.L.",
    telefono: "81 8323 5930",
    horario: "Lun a Vie · 11:00 – 19:00 h",
    mapa_url: "https://share.google/9dGYsP11IL2OsLgAI",
    orden: 8,
  },
  {
    slug: "apodaca-centro",
    nombre: "Apodaca Centro",
    direccion: "José María Morelos #315, entre Allende y Garza García",
    colonia: "Centro de Apodaca",
    ciudad: "Apodaca, N.L.",
    telefono: "81 1089 7886",
    horario: "Lun a Vie · 11:00 – 20:00 h",
    mapa_url: "https://share.google/J3tAtSJi46ISMEc1x",
    orden: 9,
  },
];

/**
 * Menú inicial. Solo el combo de $259 tiene precio confirmado (viene del flyer);
 * el resto son valores de ejemplo para que el negocio los ajuste en el panel.
 */
const CATEGORIAS = [
  {
    slug: "pollos",
    nombre: "Pollos y Paquetes",
    emoji: "🍗",
    orden: 1,
    productos: [
      {
        slug: "combo-259",
        nombre: "1 Pollo + Papitas Galeana",
        descripcion: "Pollo entero asado al carbón, papitas Galeana, tortillas y salsas de la casa.",
        precio: 259,
        etiqueta: "El más pedido",
        orden: 1,
        opciones: [
          {
            slug: "tortillas",
            etiqueta: "Tortillas",
            elecciones: [
              { slug: "maiz", etiqueta: "Maíz", extra: 0 },
              { slug: "harina", etiqueta: "Harina", extra: 20 },
            ],
          },
          {
            slug: "salsa",
            etiqueta: "Nivel de salsa",
            elecciones: [
              { slug: "suave", etiqueta: "Suave", extra: 0 },
              { slug: "picosa", etiqueta: "Picosa", extra: 0 },
              { slug: "las-dos", etiqueta: "Las dos", extra: 0 },
            ],
          },
        ],
      },
      {
        slug: "pollo-entero",
        nombre: "Pollo Entero Asado",
        descripcion: "Nuestro pollo marinado con receta original desde 1989. Incluye tortillas y salsas.",
        precio: 219,
        orden: 2,
        opciones: [
          {
            slug: "tortillas",
            etiqueta: "Tortillas",
            elecciones: [
              { slug: "maiz", etiqueta: "Maíz", extra: 0 },
              { slug: "harina", etiqueta: "Harina", extra: 20 },
            ],
          },
        ],
      },
      {
        slug: "medio-pollo",
        nombre: "Medio Pollo",
        descripcion: "Media orden con tortillas y salsas. Ideal para 1 o 2 personas.",
        precio: 125,
        orden: 3,
      },
      {
        slug: "paquete-familiar",
        nombre: "Paquete Familiar",
        descripcion: "2 pollos enteros, papitas Galeana grandes, frijoles charros, tortillas y salsas.",
        precio: 499,
        etiqueta: "Rinde 6",
        orden: 4,
      },
      {
        slug: "paquete-fiesta",
        nombre: "Paquete Fiesta",
        descripcion: "4 pollos, 2 órdenes de papitas, arroz, frijoles charros, tortillas y salsas.",
        precio: 949,
        etiqueta: "Rinde 12",
        orden: 5,
      },
    ],
  },
  {
    slug: "papitas",
    nombre: "Papitas Galeana",
    emoji: "🥔",
    orden: 2,
    productos: [
      {
        slug: "papitas",
        nombre: "Papitas Galeana",
        descripcion: "Papa cambray dorada con nuestro sazón secreto. La guarnición de la casa.",
        precio: 79,
        etiqueta: "Especialidad",
        orden: 1,
        opciones: [
          {
            slug: "tamano",
            etiqueta: "Tamaño",
            elecciones: [
              { slug: "chica", etiqueta: "Chica", extra: 0 },
              { slug: "mediana", etiqueta: "Mediana", extra: 40 },
              { slug: "grande", etiqueta: "Grande", extra: 75 },
            ],
          },
          {
            slug: "queso",
            etiqueta: "Extra",
            elecciones: [
              { slug: "sin", etiqueta: "Sin queso", extra: 0 },
              { slug: "con", etiqueta: "Con queso fundido", extra: 35 },
            ],
          },
        ],
      },
      {
        slug: "papas-gajo",
        nombre: "Papas Gajo",
        descripcion: "Gajos crujientes con especias, servidos con aderezo.",
        precio: 69,
        orden: 2,
      },
    ],
  },
  {
    slug: "carnes",
    nombre: "Cortes y Tacos",
    emoji: "🥩",
    orden: 3,
    productos: [
      {
        slug: "orden-arrachera",
        nombre: "Orden de Arrachera",
        descripcion: "250 g de arrachera al carbón con cebollitas, tortillas y salsas.",
        precio: 229,
        orden: 1,
      },
      {
        slug: "tacos-bistec",
        nombre: "Tacos de Bistec con Queso",
        descripcion: "Orden de 4 tacos con queso fundido, cebolla y cilantro.",
        precio: 149,
        etiqueta: "Nuevo",
        orden: 2,
      },
      {
        slug: "orden-chorizo",
        nombre: "Orden de Chorizo Asado",
        descripcion: "Chorizo argentino asado al carbón con tortillas y guacamole.",
        precio: 129,
        orden: 3,
      },
    ],
  },
  {
    slug: "botanas",
    nombre: "Botanas",
    emoji: "🧀",
    orden: 4,
    productos: [
      {
        slug: "empanadas",
        nombre: "Empanadas (3 pzas)",
        descripcion: "Empanadas doraditas rellenas de queso o de carne.",
        precio: 89,
        orden: 1,
        opciones: [
          {
            slug: "relleno",
            etiqueta: "Relleno",
            elecciones: [
              { slug: "queso", etiqueta: "Queso", extra: 0 },
              { slug: "carne", etiqueta: "Carne", extra: 15 },
            ],
          },
        ],
      },
      {
        slug: "dedos-queso",
        nombre: "Dedos de Queso",
        descripcion: "6 piezas capeadas con aderezo ranch.",
        precio: 95,
        orden: 2,
      },
      {
        slug: "nuggets",
        nombre: "Nuggets de Pollo",
        descripcion: "8 piezas crujientes con papas y aderezos.",
        precio: 99,
        orden: 3,
      },
    ],
  },
  {
    slug: "guarniciones",
    nombre: "Guarniciones",
    emoji: "🍚",
    orden: 5,
    productos: [
      { slug: "frijoles", nombre: "Frijoles Charros", descripcion: "Orden de 1/2 litro con tocino, chorizo y chile.", precio: 59, orden: 1 },
      { slug: "arroz", nombre: "Arroz Rojo", descripcion: "Orden familiar de arroz a la mexicana.", precio: 49, orden: 2 },
      { slug: "guacamole", nombre: "Guacamole", descripcion: "Guacamole fresco de la casa con totopos.", precio: 65, orden: 3 },
      {
        slug: "tortillas-extra",
        nombre: "Tortillas Extra",
        descripcion: "Paquete de tortillas recién hechas.",
        precio: 25,
        orden: 4,
        opciones: [
          {
            slug: "tipo",
            etiqueta: "Tipo",
            elecciones: [
              { slug: "maiz", etiqueta: "Maíz", extra: 0 },
              { slug: "harina", etiqueta: "Harina", extra: 20 },
            ],
          },
        ],
      },
      { slug: "salsas", nombre: "Salsa Extra", descripcion: "Vasito de nuestra salsa de la casa.", precio: 20, orden: 5 },
    ],
  },
  {
    slug: "bebidas",
    nombre: "Bebidas",
    emoji: "🥤",
    orden: 6,
    productos: [
      { slug: "refresco", nombre: "Refresco 600 ml", descripcion: "Coca-Cola, Sprite, Fanta o agua mineral.", precio: 32, orden: 1 },
      { slug: "refresco-2l", nombre: "Refresco 2 L", descripcion: "Para acompañar el paquete familiar.", precio: 55, orden: 2 },
      { slug: "agua-fresca", nombre: "Agua Fresca 1 L", descripcion: "Horchata, jamaica o limón, hechas al momento.", precio: 45, orden: 3 },
    ],
  },
];

module.exports = { CONFIGURACION, SUCURSALES, CATEGORIAS };
