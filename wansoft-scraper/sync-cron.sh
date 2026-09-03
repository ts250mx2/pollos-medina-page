#!/usr/bin/env bash
# ------------------------------------------------------------
# Corre el scraper HTTP de Wansoft (sin navegador) para cron.
#
# Requisitos:
#   - wansoft-scraper/.env con los datos de la BD (y WANSOFT_URL).
#   - Sesión ya sembrada una vez: node sembrar-cookie.mjs "<cookie>"
#     (o sembrar-sesion.mjs). El captcha NO se resuelve aquí.
#
# Uso en crontab (ver abajo). Acepta los mismos argumentos que
# scrape-http.mjs, p. ej.:  sync-cron.sh --yesterday
# ------------------------------------------------------------
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR" || exit 1
LOG="$DIR/sync.log"

# cron trae un PATH mínimo: localizar node (ajusta NODE_BIN si usas nvm).
NODE_BIN="${NODE_BIN:-$(command -v node || echo /usr/bin/node)}"

{
  echo "[$(date -Is)] === inicio ${*:-hoy} ==="
  "$NODE_BIN" scrape-http.mjs "$@"
  echo "[$(date -Is)] === fin (código $?) ==="
} >> "$LOG" 2>&1

# Recorta la bitácora a las últimas 2000 líneas para que no crezca sin límite.
tail -n 2000 "$LOG" > "$LOG.tmp" 2>/dev/null && mv "$LOG.tmp" "$LOG"
