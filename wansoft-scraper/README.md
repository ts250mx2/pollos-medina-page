# Wansoft → Ventas por sucursal (automatizado)

Baja el reporte **Reportes → Ingresos → Ventas por sucursal**
(`ConsolidatedSalesMasterReport`) de Wansoft para **cada sucursal**, día por día, y lo
guarda en MySQL (`BDPollosMedinaMenu`) en las tablas que lee el **Dashboard** del panel
(`wansoft_sucursales`, `wansoft_ventas_diarias`).

En vez de raspar HTML, llama al endpoint JSON que usa el propio reporte
(`Reports/GetConsolidatedSales?subsidiaryId=&startDate=&endDate=`), que devuelve totales
limpios y es rápido.

## Cómo maneja el CAPTCHA (Turnstile)

Wansoft protege el login con **Cloudflare Turnstile**. No se puede resolver de forma 100%
automática. La estrategia:

1. **La primera vez** se corre con el navegador visible (`HEADFUL=1`): una persona resuelve
   el captcha y entra. La sesión queda guardada en el **perfil de Chrome**
   (`.chrome-profile/`, ignorado por git).
2. **Las corridas siguientes** (botón del panel o cron) reutilizan ese perfil headless. Si la
   sesión sigue viva, entran directo. Cuando caduca, se vuelve a correr una vez con `HEADFUL=1`.

## Instalación

```bash
cd wansoft-scraper
npm install
npx playwright install chromium
# En servidor Linux, además:  npx playwright install-deps chromium
cp .env.example .env        # ya viene con las credenciales; ajusta si cambian
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
# cada hora, el día en curso
0 * * * * cd /ruta/pollos-medina-page/wansoft-scraper && /usr/bin/node scrape.mjs >> sync.log 2>&1
# 00:30, cierre del día anterior
30 0 * * * cd /ruta/pollos-medina-page/wansoft-scraper && /usr/bin/node scrape.mjs --yesterday >> sync.log 2>&1
```

## Qué trae y qué no

El consolidado incluye: **ventas brutas, netas, impuestos (IVA), descuentos, cortesías,
cancelaciones, promociones y anulaciones** por sucursal/día. **No** incluye número de
cuentas/comensales ni el desglose de formas de pago — esos viven en otros reportes de Wansoft
(se pueden agregar después, uno por endpoint, igual que este).

## Archivos

| Archivo | Rol |
|---|---|
| `auth.mjs` | Login con perfil persistente + manejo de Turnstile. |
| `report.mjs` | Lista de sucursales + `GetConsolidatedSales` + mapeo a la fila. |
| `db.mjs` | Resuelve/crea sucursal y hace UPSERT en `wansoft_ventas_diarias` + bitácora. |
| `scrape.mjs` | Orquestador (día / rango / mes / ayer / dry). |
| `.env` | Credenciales Wansoft + BD (no se sube a git). |
