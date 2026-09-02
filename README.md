# Pollo Medina — Sitio de pedidos + panel de administración

Sitio web de **Pollo Medina®** con menú interactivo, carrito que envía el pedido por
WhatsApp, y un **panel de administración** protegido con usuario y contraseña para editar
el menú, los precios, las fotos, las sucursales y los datos de contacto — todo guardado en
MySQL.

---

## Arrancar

```powershell
npm install          # solo la primera vez
npm start
```

| Dirección | Qué es |
|---|---|
| http://localhost:4000 | El sitio público |
| http://localhost:4000/admin | El panel de administración |

> El puerto 3000 está reservado por Windows en esta máquina, por eso se usa el **4000**.
> Se cambia en el archivo `.env` (variable `PORT`).

Durante el desarrollo, `npm run dev` reinicia el servidor solo cuando cambias un archivo.

---

## Panel de administración

Entra a `/admin` con el usuario que se creó al sembrar la base.
**Cambia la contraseña desde la pestaña "Mi cuenta" en cuanto entres.**

Desde el panel se edita, sin tocar código:

| Pestaña | Qué puedes hacer |
|---|---|
| **Menú** | Crear/editar/borrar categorías y productos, cambiar precios, subir la foto de cada producto, definir variantes (Tortillas: Maíz / Harina +$20), ocultar productos sin borrarlos |
| **Sucursales** | Dirección, colonia, ciudad, teléfono, horario, liga de Google Maps, coordenadas, foto y orden |
| **Configuración** | Teléfonos, WhatsApp, horario, redes sociales y avisos legales |
| **Mi cuenta** | Cambiar tu contraseña |

Todo lo que guardes ahí aparece en el sitio **al refrescar la página**.

### Crear otro usuario del panel

```powershell
npm run usuario:crear -- juan "unaContrasenaLarga" "Juan Medina"
```

---

## Base de datos

MySQL 8 en `74.208.192.90`, base `BDPollosMedinaMenu`. Las credenciales viven **solo** en
el archivo `.env` (que está en `.gitignore` y nunca debe subirse a un repositorio).

| Comando | Qué hace |
|---|---|
| `npm run db:migrar` | Crea las tablas que falten (no borra datos) |
| `npm run db:sembrar` | Llena la base con el menú, las 9 sucursales y la configuración inicial |
| `npm run db:reiniciar` | **Borra todas las tablas** y vuelve a empezar de cero |

### Tablas

```
usuarios              Acceso al panel (contraseñas cifradas con bcrypt)
configuracion         Teléfonos, horarios, redes sociales, avisos
categorias            Categorías del menú
productos             Productos, precios, fotos → categorias
producto_opciones     Grupos de variantes (Tortillas, Tamaño) → productos
producto_elecciones   Variantes y su costo extra → producto_opciones
sucursales            Sucursales con dirección, mapa y foto
```

Borrar una categoría borra sus productos, y borrar un producto borra sus opciones
(`ON DELETE CASCADE`).

---

## Estructura del proyecto

```
pollos-medina-page/
├── public/                     Sitio público
│   ├── index.html
│   ├── css/                    base · components · layout
│   ├── js/
│   │   ├── data/menu.js        Respaldo estático (si la API no responde)
│   │   ├── datos.js            Decide entre API y respaldo
│   │   ├── cart.js             Lógica del carrito (funciones puras)
│   │   ├── cart-ui.js          Panel del carrito y mensaje de WhatsApp
│   │   ├── menu-render.js      Dibuja el menú y las variantes
│   │   └── main.js             Navegación, sucursales, animaciones
│   └── uploads/                Fotos subidas desde el panel
├── admin/                      Panel de administración
│   ├── index.html · admin.css
│   └── js/  api · ui · menu · sucursales · configuracion · app
├── server/src/
│   ├── config/env.js           Lee y valida el .env
│   ├── db/                     pool · esquema.sql · migrar · sembrar · datos-iniciales
│   ├── lib/validar.js          Validación de todo lo que llega del cliente
│   ├── middleware/             auth (JWT) · errores · subidas (multer)
│   ├── routes/                 auth · publico · admin
│   ├── services/               menu · sucursales · configuracion · usuarios
│   ├── app.js
│   └── server.js
├── .env                        Credenciales (NO se sube a git)
└── .env.example                Plantilla para otros ambientes
```

---

## API

### Pública (sin sesión)

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/api/publico/sitio` | Configuración + sucursales + menú en una sola llamada |
| GET | `/api/publico/menu` | Solo el menú |
| GET | `/api/publico/sucursales` | Solo las sucursales |

### Panel (requiere sesión)

| Método | Ruta |
|---|---|
| POST | `/api/auth/login` · `/api/auth/logout` |
| GET | `/api/auth/yo` |
| PUT | `/api/auth/password` |
| GET/POST/PUT/DELETE | `/api/admin/categorias` |
| GET/POST/PUT/DELETE | `/api/admin/productos` |
| GET/POST/PUT/DELETE | `/api/admin/sucursales` |
| GET/PUT | `/api/admin/configuracion` |
| POST | `/api/admin/subidas` (multipart, campo `imagen`) |

---

## Seguridad

- Contraseñas cifradas con **bcrypt** (12 rondas); nunca se guardan en texto plano.
- Sesión con **JWT en cookie httpOnly** (el JavaScript de la página no puede leerla).
- **Máximo 8 intentos de login cada 10 minutos** por IP.
- Validación de todo lo que llega del cliente (`server/src/lib/validar.js`).
- Consultas **parametrizadas** siempre: no hay concatenación de SQL.
- Subidas limitadas a imágenes de 5 MB; el nombre del archivo lo genera el servidor.
- Cabeceras de seguridad con **helmet** y una política de contenido (CSP) estricta.
- Las credenciales viven solo en `.env`.

**Antes de publicar en internet:** pon `NODE_ENV=production` en el `.env` (activa cookies
seguras) y sirve el sitio detrás de HTTPS.

---

## Si el servidor no está corriendo

El sitio público sigue funcionando: cuando `/api/publico/sitio` no responde, usa el menú
y las sucursales de respaldo que están en `public/js/data/menu.js`. Así la página nunca se
ve vacía, aunque los cambios del panel no aparecerán hasta que el servidor vuelva.

---

## Pendientes antes de publicar

- [ ] **Revisar todos los precios** — solo el combo de **$259** viene del flyer oficial; los demás son de ejemplo
- [ ] **Confirmar las direcciones y teléfonos de las 9 sucursales** — se obtuvieron de directorios públicos, no del negocio
- [ ] Completar la dirección de la sucursal **San Nicolás** (quedó marcada como "Por confirmar")
- [ ] Subir las fotos de los productos y de las sucursales desde el panel
- [ ] Poner `og.jpg` en `public/assets/img/` (es la imagen que se ve al compartir el link)
- [ ] Cambiar la contraseña del usuario `admin`
- [ ] Registrar el dominio y actualizar `<link rel="canonical">` y las metaetiquetas `og:`

---

## Dashboard Wansoft (ventas por sucursal)

Nueva pestaña **Dashboard** en el panel de administración. Concentra las **ventas
consolidadas por sucursal, día por día**, tomadas del reporte
`ConsolidatedSalesMasterReport` de Wansoft.

### Qué incluye

| Sub-pestaña | Qué hace |
|---|---|
| **Resumen** | Selector de periodo **Día / Semana / Mes / Rango de fechas** (comparativo contra el periodo anterior); KPIs; gráfica de venta por día; **treemap por grupo de producto** (clic → detalle del grupo con sus productos); **ranking de productos** (clic → detalle); **mapa de calor hora × día de la semana**; y secciones **por tipo de grupo, por tipo de orden, por forma de pago, por usuario/cajero, por terminal y por modificador**. Los importes **cuadran**: productos, grupos, tipos, usuarios, etc. suman la venta neta; las formas de pago suman la venta total. |
| **Detalle diario** | Tabla día × sucursal con todos los importes y conteos. |

Las **sucursales** se muestran con un **alias amigable** (p. ej. Wansoft las llama *Jordan* y *Pollería 73*; el panel las muestra como *Mitras* y *San Nicolás*). El alias se edita en **Cargar datos → Sucursales**. Los **productos y tipos** son los de Wansoft (no el menú del sitio).
| **Cargar datos** | Importar pegando la tabla del reporte (o un CSV/Excel), captura manual de un día, y alta/baja de sucursales. |
| **Conexión** | Guardar la sesión de Wansoft (cookie), probar la sesión y disparar la sincronización por rango de fechas. |

### Cómo entran los datos

1. **Sincronización HTTP automatizada (principal).** La carpeta [`wansoft-scraper/`](wansoft-scraper/)
   llama a los endpoints de reportes sin abrir navegador. Next.js la ejecuta al arrancar, cada
   hora para el día actual y a las 00:30 para cerrar el día anterior. El botón
   **Dashboard → Conexión → “Sincronizar ahora”** usa el mismo ejecutor.
   - La sesión se siembra una vez con una cookie obtenida tras iniciar sesión normalmente en
     Chrome. Cuando Wansoft la caduque, el panel mostrará que hay que renovarla.
   - Un bloqueo de MySQL evita duplicados entre la programación, el botón y varias instancias.
   - Ver [`wansoft-scraper/README.md`](wansoft-scraper/README.md) para la instalación.
2. **Importar / pegar.** En **Cargar datos** se pega la tabla del reporte o un CSV. Se
   reconocen columnas como `Sucursal`, `Fecha`, `Venta neta`, `Descuentos`, `Impuestos`,
   `Venta total`, `Cuentas`, `Comensales`, `Efectivo`, `Tarjeta`.
3. **Captura manual.** Para corregir o cargar un día suelto.

```bash
cd wansoft-scraper && npm install --omit=optional
node sembrar-cookie.mjs "PEGA_AQUI_LA_COOKIE" # una vez o cuando caduque
node scrape-http.mjs --month 2026-08          # backfill opcional
```

### Tablas nuevas

```
wansoft_sucursales        Catálogo de sucursales (nombre Wansoft + alias amigable)
wansoft_ventas_diarias    Una fila por sucursal y día (UPSERT idempotente)
wansoft_ventas_productos  Ventas por platillo/artículo (ranking + detalle)
wansoft_ventas_categorias Ventas por tipo de grupo
wansoft_reportes          Tabla genérica: grupo, tipo de orden, usuario, terminal,
                          modificador, forma de pago y hora (una fila por dimensión/día)
wansoft_sync_log          Bitácora de cada sincronización
```

Reportes de Wansoft que alimentan las tablas: `GetConsolidatedSales` (diarias),
`SalesBySaucer` (productos), `SalesByGroupType` (tipos), `SalesByGroup`,
`SalesByTypeOfOrder`, `SalesByUser`, `SalesByTerminal`, `SalesByModifiers`,
`SalesByPaymentType` y `SalesByHours` (mapa de calor).

### Comandos

```powershell
npm run db:migrar                 # crea las tablas nuevas (no borra nada)
npm run db:wansoft-demo -- --anio 2026   # datos DE EJEMPLO de TODO el año (ventas + productos)
npm run db:wansoft-demo                  # solo el mes en curso (origen='demo')
npm run db:wansoft-demo -- --limpiar   # borra TODO lo marcado como demo
```

> Los datos sembrados con `db:wansoft-demo` quedan marcados con `origen = 'demo'` y se ven
> con una etiqueta **DEMO** en la tabla; sirven para probar el dashboard mientras se conecta
> la información real, y se borran con `--limpiar`.

### API (requiere sesión del panel)

| Método | Ruta | Qué hace |
|---|---|---|
| GET | `/api/admin/wansoft/dashboard?mes=YYYY-MM&sucursal=ID` | KPIs, serie, ranking, formas de pago |
| GET/POST/DELETE | `/api/admin/wansoft/ventas` | Listar / guardar un día / borrar un día |
| POST | `/api/admin/wansoft/importar` | Importación masiva (`filas` o `csv`) |
| GET/POST | `/api/admin/wansoft/sucursales` · PUT/DELETE `/[id]` | Catálogo de sucursales |
| GET/PUT | `/api/admin/wansoft/credenciales` | Estado / guardar la cookie de sesión |
| GET/POST | `/api/admin/wansoft/sync` | Probar sesión / sincronizar un rango |
