# Wansoft → Ventas por sucursal (automatizado)

Baja el reporte **Reportes → Ingresos → Ventas por sucursal**
(`ConsolidatedSalesMasterReport`) de Wansoft para **cada sucursal**, día por día, y lo
guarda en MySQL (`BDPollosMedinaMenu`) en las tablas que lee el **Dashboard** del panel
(`wansoft_sucursales`, `wansoft_ventas_diarias`).

En vez de raspar HTML, llama al endpoint JSON que usa el propio reporte
(`Reports/GetConsolidatedSales?subsidiaryId=&startDate=&endDate=`), que devuelve totales
limpios y es rápido.

## Cómo maneja el CAPTCHA (Turnstile)

Wansoft protege el login con **Cloudflare Turnstile**. Ese captcha **solo lo puede resolver
un navegador de verdad** con una persona delante — no hay forma de generar su token con
`curl`/`fetch` sin cruzar a evasión anti-bot. Por eso el trabajo se parte en dos:

1. **Sembrar la sesión (una vez, en una máquina con pantalla — tu PC):** se abre el navegador,
   una persona resuelve el Turnstile, y la **cookie de sesión** queda guardada en MySQL
   (tabla `wansoft_credenciales`).
2. **Bajar los reportes (cada día, en el servidor Linux — sin navegador):** un script con
   `fetch` puro usa esa cookie. Cuando caduca (días o semanas después), se vuelve a sembrar.

Así el servidor **nunca abre Chromium**: solo necesita Node, `mysql2` y `cheerio`.

> El camino viejo con perfil de Chrome persistente (`scrape.mjs` + `.chrome-profile/`) sigue
> existiendo por si prefieres correr todo desde una máquina con navegador. Los dos escriben a
> las mismas tablas.

## Flujo sin navegador (recomendado para el VPS)

Hay dos formas de sembrar la cookie. **La confiable es pegar la cookie de tu
navegador normal**, porque el Turnstile rechaza cualquier navegador automatizado
(incluido el que abre `sembrar-sesion.mjs`).

```bash
# --- 1a. RECOMENDADO: inicia sesion en TU Chrome normal y pega la cookie ---
#   F12 -> Network -> recarga -> clic en ConsolidatedSalesMasterReport ->
#   Headers -> Request Headers -> copia el valor de "Cookie:"
node sembrar-cookie.mjs "PEGA_AQUI_LA_COOKIE"

# --- 1b. Alternativa (si el Turnstile te deja en navegador automatizado) ---
node sembrar-sesion.mjs                 # abre el navegador; entras tu mismo

# --- 2. En el servidor Linux, sin navegador ---
node scrape-http.mjs --yesterday       # cierre del día anterior
node scrape-http.mjs --month 2026-08   # backfill de un mes
```

Si la cookie caducó, `scrape-http.mjs` termina con `SUMMARY {... "sesionVencida": true}`,
marca la fila como `vencida` en `wansoft_credenciales` y solo hay que repetir el paso 1.

### Sembrar en tu PC, correr en el servidor Linux headless

El paso 1 necesita pantalla; el VPS no la tiene. Tres opciones, de más simple a más pesada:

- **A (recomendada):** siembras en tu PC. Como la cookie vive en la **misma base** que usa el
  servidor, no hay que copiar nada: en cuanto la guardas, el VPS ya la lee. El VPS instala
  **sin** navegador: `npm install --omit=optional`.
- **B:** `xvfb` + VNC en el servidor y resuelves el captcha por escritorio remoto.
- **C:** `ssh -X` con reenvío de X11 para ver la ventana del navegador en tu máquina.

## Instalación

En tu PC (para sembrar la sesión, necesita navegador):

```bash
cd wansoft-scraper
npm install
npx playwright install chromium
cp .env.example .env        # pon tus credenciales de Wansoft y de la BD
```

En el servidor Linux (solo baja reportes, sin navegador):

```bash
cd wansoft-scraper
npm install --omit=optional   # NO instala Playwright/Chromium
cp .env.example .env
```

## Uso

```bash
# Primera vez (resuelve el Turnstile a mano y carga el mes en curso):
HEADFUL=1 node scrape.mjs --month 2026-08

# Día de hoy (todas las sucursales)
node scrape.mjs

# Ayer (cierre del día)
node scrape.mjs --yesterday

# Un día / un rango / un mes
node scrape.mjs --date 2026-08-15
node scrape.mjs --from 2026-08-01 --to 2026-08-22
node scrape.mjs --month 2026-08

# Una sola sucursal (id de Wansoft)   ·   Sin tocar la BD (solo imprime)
node scrape.mjs --branch 123
node scrape.mjs --dry
```

Cada corrida hace **UPSERT** por `(sucursal, fecha)`: re-consultar un día lo actualiza, no
duplica. Imprime una línea `SUMMARY {json}` que el panel usa para la bitácora, y registra en
`wansoft_sync_log`.

## Programar cada hora (cron, servidor Linux)

```cron
# cada hora, el día en curso (sin navegador)
0 * * * * cd /ruta/pollos-medina-page/wansoft-scraper && /usr/bin/node scrape-http.mjs >> sync.log 2>&1
# 00:30, cierre del día anterior
30 0 * * * cd /ruta/pollos-medina-page/wansoft-scraper && /usr/bin/node scrape-http.mjs --yesterday >> sync.log 2>&1
```

## Qué trae y qué no

El consolidado incluye: **ventas brutas, netas, impuestos (IVA), descuentos, cortesías,
cancelaciones, promociones y anulaciones** por sucursal/día. **No** incluye número de
cuentas/comensales ni el desglose de formas de pago — esos viven en otros reportes de Wansoft
(se pueden agregar después, uno por endpoint, igual que este).

## Archivos

| Archivo | Rol |
|---|---|
| `urls.mjs` | URLs de Wansoft en un solo lugar (sin dependencias). |
| `fechas.mjs` | Qué días consultar según los argumentos (compartido). |
| `auth.mjs` | Login **con navegador** (Playwright) + Turnstile. Solo lo usan `scrape.mjs` y `sembrar-sesion.mjs`. |
| `http-ctx.mjs` | Adaptador `fetch` sin navegador + detección de sesión vencida. |
| `report.mjs` | Sucursales + `GetConsolidatedSales` + reportes a nivel producto/dimensional. Sirve a ambos caminos. |
| `db.mjs` | UPSERT en las tablas del dashboard + bitácora + cookie de sesión. |
| `sembrar-sesion.mjs` | **Una vez, con navegador:** guarda la cookie en `wansoft_credenciales`. |
| `scrape-http.mjs` | **Cron del servidor, sin navegador:** baja los reportes con la cookie. |
| `scrape.mjs` | Camino viejo con navegador (perfil de Chrome persistente). |
| `.env` | Credenciales Wansoft + BD (no se sube a git). |
