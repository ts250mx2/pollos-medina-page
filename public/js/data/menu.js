/* ============================================================
   Pollo Medina — Configuración del negocio y menú
   ------------------------------------------------------------
   ESTE ES EL ÚNICO ARCHIVO QUE NECESITAS EDITAR para cambiar
   teléfonos, sucursales, productos y precios.
   ============================================================ */

/* eslint-disable no-unused-vars */
var PM_CONFIG = {
  marca: "Pollo Medina",
  desde: 1989,
  eslogan: "Pura Vitamina",

  /* Teléfonos. `numero` va en formato internacional sin signos (52 + 10 dígitos). */
  whatsapp: { visible: "81 2230 9008", numero: "528122309008" },
  telefono: { visible: "81 3142 4250", tel: "+528131424250" },

  horario: "Servicio a domicilio · Todos los días de 11:00 a 19:00 h",
  costoEnvioTexto: "Costo extra por servicio a domicilio (según zona).",
  avisoPrecios: "Precios sujetos a cambio sin previo aviso.",
  tiempoEntrega: "30–45 min aprox.",

  formasPago: ["Efectivo", "Tarjeta", "Transferencia"],

  redes: {
    facebook: "https://www.facebook.com/PollosMedinaOficial",
    instagram: "https://www.instagram.com/pollosmedina.oficial/",
    tiktok: "https://www.tiktok.com/@pollomedinaoficial",
  },

  /* Respaldo. La versión que manda es la de la base de datos (panel /admin). */
  sucursales: [
    {
      id: "mitras",
      nombre: "Mitras",
      direccion: "Río Jordán #2403 (frente al Centro Médico Los Ángeles), Mitras Centro, Monterrey, N.L.",
      telefono: "81 9627 0516",
      horario: "Lun a Vie · 10:00 – 19:00 h",
      mapa: "https://share.google/qqaBNAxgeVBGhrRcH",
    },
    {
      id: "eloy-cavazos",
      nombre: "Eloy Cavazos",
      direccion: "Av. Eloy Cavazos #6907, Santa María, Guadalupe, N.L.",
      telefono: "81 1469 6373",
      horario: "Lun a Vie · 11:00 – 20:00 h",
      mapa: "https://share.google/slPQSNQb2Ouvq4cz7",
    },
    {
      id: "san-nicolas",
      nombre: "San Nicolás",
      direccion: "Las Puentes, San Nicolás de los Garza, N.L.",
      telefono: "81 3142 4250",
      horario: "Lun a Vie · 11:00 – 19:00 h",
      mapa: "https://share.google/GcQOHKRmlQkQaZvpS",
    },
    {
      id: "centro-guadalupe",
      nombre: "Centro de Guadalupe",
      direccion: "Arteaga #832, cruz con Mante, Paraíso, Guadalupe, N.L.",
      telefono: "81 1520 9581",
      horario: "Lun a Vie · 11:00 – 19:00 h",
      mapa: "https://share.google/KnssNqHJf8iTXN9Ow",
    },
    {
      id: "escamilla",
      nombre: "Escamilla",
      direccion: "Av. Constituyentes de Nuevo León #417, Escamilla, Guadalupe, N.L.",
      telefono: "81 2315 5075",
      horario: "Lun a Vie · 10:00 – 19:00 h",
      mapa: "https://share.google/GT2bgUGbgvqDEoKxO",
    },
    {
      id: "las-torres",
      nombre: "Las Torres",
      direccion: "Calle Ocho #517, cruz con Av. Las Torres, Praderas de Girasoles, General Escobedo, N.L.",
      telefono: "81 1096 7157",
      horario: "Lun a Vie · 11:00 – 19:00 h",
      mapa: "https://share.google/9YAokH1TnygUxTs7W",
    },
    {
      id: "riberas-del-rio",
      nombre: "Riberas del Río",
      direccion: "Av. Gral. Plutarco Elías Calles #3222, Riberas del Río, Guadalupe, N.L.",
      telefono: "81 1767 9365",
      horario: "Lun a Vie · 11:00 – 19:00 h",
      mapa: "https://share.google/4bN7KeKxs20ibRqwu",
    },
    {
      id: "los-lermas",
      nombre: "Los Lermas",
      direccion: "Av. Gral. Plutarco Elías Calles #1805, Hacienda Los Lermas 2° Sector, Guadalupe, N.L.",
      telefono: "81 8323 5930",
      horario: "Lun a Vie · 11:00 – 19:00 h",
      mapa: "https://share.google/9dGYsP11IL2OsLgAI",
    },
    {
      id: "apodaca-centro",
      nombre: "Apodaca Centro",
      direccion: "José María Morelos #315, entre Allende y Garza García, Centro de Apodaca, N.L.",
      telefono: "81 1089 7886",
      horario: "Lun a Vie · 11:00 – 20:00 h",
      mapa: "https://share.google/J3tAtSJi46ISMEc1x",
    },
  ],
};

/* ------------------------------------------------------------
   MENÚ
   Cada producto:
     id      → identificador único (no lo repitas)
     nombre  → título en la tarjeta
     desc    → descripción corta
     precio  → precio base en pesos
     tag     → etiqueta opcional ("Favorito", "Nuevo"…)
     img     → ruta de foto opcional (assets/img/menu/archivo.jpg)
     opciones→ grupos de variantes; cada elección puede sumar precio
   ------------------------------------------------------------ */
var PM_MENU = [
  {
    id: "pollos",
    nombre: "Pollos y Paquetes",
    emoji: "🍗",
    productos: [
      {
        id: "combo-259",
        nombre: "1 Pollo + Papitas Galeana",
        desc: "Pollo entero asado al carbón, papitas Galeana, tortillas y salsas de la casa.",
        precio: 259,
        tag: "El más pedido",
        img: "assets/img/menu/combo-pollo-papitas.jpg",
        opciones: [
          {
            id: "tortillas",
            label: "Tortillas",
            elecciones: [
              { id: "maiz", label: "Maíz", extra: 0 },
              { id: "harina", label: "Harina", extra: 20 },
            ],
          },
          {
            id: "salsa",
            label: "Nivel de salsa",
            elecciones: [
              { id: "suave", label: "Suave", extra: 0 },
              { id: "picosa", label: "Picosa", extra: 0 },
              { id: "las-dos", label: "Las dos", extra: 0 },
            ],
          },
        ],
      },
      {
        id: "pollo-entero",
        nombre: "Pollo Entero Asado",
        desc: "Nuestro pollo marinado con receta original desde 1989. Incluye tortillas y salsas.",
        precio: 219,
        img: "assets/img/menu/pollo-entero.jpg",
        opciones: [
          {
            id: "tortillas",
            label: "Tortillas",
            elecciones: [
              { id: "maiz", label: "Maíz", extra: 0 },
              { id: "harina", label: "Harina", extra: 20 },
            ],
          },
        ],
      },
      {
        id: "medio-pollo",
        nombre: "Medio Pollo",
        desc: "Media orden con tortillas y salsas. Ideal para 1 o 2 personas.",
        precio: 125,
        img: "assets/img/menu/medio-pollo.jpg",
      },
      {
        id: "paquete-familiar",
        nombre: "Paquete Familiar",
        desc: "2 pollos enteros, papitas Galeana grandes, frijoles charros, tortillas y salsas.",
        precio: 499,
        tag: "Rinde 6",
        img: "assets/img/menu/paquete-familiar.jpg",
      },
      {
        id: "paquete-fiesta",
        nombre: "Paquete Fiesta",
        desc: "4 pollos, 2 órdenes de papitas, arroz, frijoles charros, tortillas y salsas.",
        precio: 949,
        tag: "Rinde 12",
        img: "assets/img/menu/paquete-fiesta.jpg",
      },
    ],
  },
  {
    id: "papitas",
    nombre: "Papitas Galeana",
    emoji: "🥔",
    productos: [
      {
        id: "papitas",
        nombre: "Papitas Galeana",
        desc: "Papa cambray dorada con nuestro sazón secreto. La guarnición de la casa.",
        precio: 79,
        tag: "Especialidad",
        img: "assets/img/menu/papitas-galeana.jpg",
        opciones: [
          {
            id: "tamano",
            label: "Tamaño",
            elecciones: [
              { id: "chica", label: "Chica", extra: 0 },
              { id: "mediana", label: "Mediana", extra: 40 },
              { id: "grande", label: "Grande", extra: 75 },
            ],
          },
          {
            id: "queso",
            label: "Extra",
            elecciones: [
              { id: "sin", label: "Sin queso", extra: 0 },
              { id: "con", label: "Con queso fundido", extra: 35 },
            ],
          },
        ],
      },
      {
        id: "papas-gajo",
        nombre: "Papas Gajo",
        desc: "Gajos crujientes con especias, servidos con aderezo.",
        precio: 69,
        img: "assets/img/menu/papas-gajo.jpg",
      },
    ],
  },
  {
    id: "carnes",
    nombre: "Cortes y Tacos",
    emoji: "🥩",
    productos: [
      {
        id: "orden-arrachera",
        nombre: "Orden de Arrachera",
        desc: "250 g de arrachera al carbón con cebollitas, tortillas y salsas.",
        precio: 229,
        img: "assets/img/menu/arrachera.jpg",
      },
      {
        id: "tacos-bistec",
        nombre: "Tacos de Bistec con Queso",
        desc: "Orden de 4 tacos con queso fundido, cebolla y cilantro.",
        precio: 149,
        tag: "Nuevo",
        img: "assets/img/menu/tacos-bistec.jpg",
      },
      {
        id: "orden-chorizo",
        nombre: "Orden de Chorizo Asado",
        desc: "Chorizo argentino asado al carbón con tortillas y guacamole.",
        precio: 129,
        img: "assets/img/menu/chorizo.jpg",
      },
    ],
  },
  {
    id: "botanas",
    nombre: "Botanas",
    emoji: "🧀",
    productos: [
      {
        id: "empanadas",
        nombre: "Empanadas (3 pzas)",
        desc: "Empanadas doraditas rellenas de queso o de carne.",
        precio: 89,
        img: "assets/img/menu/empanadas.jpg",
        opciones: [
          {
            id: "relleno",
            label: "Relleno",
            elecciones: [
              { id: "queso", label: "Queso", extra: 0 },
              { id: "carne", label: "Carne", extra: 15 },
            ],
          },
        ],
      },
      {
        id: "dedos-queso",
        nombre: "Dedos de Queso",
        desc: "6 piezas capeadas con aderezo ranch.",
        precio: 95,
        img: "assets/img/menu/dedos-queso.jpg",
      },
      {
        id: "nuggets",
        nombre: "Nuggets de Pollo",
        desc: "8 piezas crujientes con papas y aderezos.",
        precio: 99,
        img: "assets/img/menu/nuggets.jpg",
      },
    ],
  },
  {
    id: "guarniciones",
    nombre: "Guarniciones",
    emoji: "🍚",
    productos: [
      {
        id: "frijoles",
        nombre: "Frijoles Charros",
        desc: "Orden de 1/2 litro con tocino, chorizo y chile.",
        precio: 59,
        img: "assets/img/menu/frijoles-charros.jpg",
      },
      {
        id: "arroz",
        nombre: "Arroz Rojo",
        desc: "Orden familiar de arroz a la mexicana.",
        precio: 49,
        img: "assets/img/menu/arroz.jpg",
      },
      {
        id: "guacamole",
        nombre: "Guacamole",
        desc: "Guacamole fresco de la casa con totopos.",
        precio: 65,
        img: "assets/img/menu/guacamole.jpg",
      },
      {
        id: "tortillas-extra",
        nombre: "Tortillas Extra",
        desc: "Paquete de tortillas recién hechas.",
        precio: 25,
        img: "assets/img/menu/tortillas.jpg",
        opciones: [
          {
            id: "tipo",
            label: "Tipo",
            elecciones: [
              { id: "maiz", label: "Maíz", extra: 0 },
              { id: "harina", label: "Harina", extra: 20 },
            ],
          },
        ],
      },
      {
        id: "salsas",
        nombre: "Salsa Extra",
        desc: "Vasito de nuestra salsa de la casa.",
        precio: 20,
        img: "assets/img/menu/salsas.jpg",
      },
    ],
  },
  {
    id: "bebidas",
    nombre: "Bebidas",
    emoji: "🥤",
    productos: [
      {
        id: "refresco",
        nombre: "Refresco 600 ml",
        desc: "Coca-Cola, Sprite, Fanta o agua mineral.",
        precio: 32,
        img: "assets/img/menu/refresco.jpg",
      },
      {
        id: "refresco-2l",
        nombre: "Refresco 2 L",
        desc: "Para acompañar el paquete familiar.",
        precio: 55,
        img: "assets/img/menu/refresco-2l.jpg",
      },
      {
        id: "agua-fresca",
        nombre: "Agua Fresca 1 L",
        desc: "Horchata, jamaica o limón, hechas al momento.",
        precio: 45,
        img: "assets/img/menu/agua-fresca.jpg",
      },
    ],
  },
];
