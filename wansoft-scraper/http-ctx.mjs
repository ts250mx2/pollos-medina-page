// Adaptador HTTP sin navegador.
//
// report.mjs pide los reportes con `ctx.request.post(url, { headers })` y espera
// una respuesta estilo Playwright: { status(), json(), text() }. Aqui construimos
// ese mismo `ctx` pero respaldado por fetch nativo de Node y la cookie de sesion
// sembrada una vez con navegador. Asi el servidor Linux nunca abre Chromium.

/** Error especifico: la cookie caduco y hay que volver a sembrar con navegador. */
export class SesionVencida extends Error {
  constructor(msg = "La sesion de Wansoft caduco. Vuelve a sembrarla con: HEADFUL=1 node sembrar-sesion.mjs") {
    super(msg);
    this.name = "SesionVencida";
    this.code = "SESION_VENCIDA";
  }
}

// Sin sesion, Wansoft redirige al login o devuelve el HTML del login en vez del
// reporte. Detectamos ambos casos para dar un mensaje claro en lugar de un
// "JSON invalido" incomprensible.
function esRedirLogin(status, location) {
  return status >= 300 && status < 400 && /login|logon|account/i.test(location || "");
}
function esHtmlLogin(cuerpo) {
  return /id=["']UserName["']|name=["']UserName["']|cf-turnstile/i.test(cuerpo.slice(0, 4000));
}

async function pedir(method, url, cookie, extraHeaders = {}) {
  const res = await fetch(url, {
    method,
    redirect: "manual", // para ver el 302 al login en lugar de seguirlo a ciegas
    headers: {
      Cookie: cookie,
      "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "es-MX,es;q=0.9",
      ...extraHeaders,
    },
  });

  if (esRedirLogin(res.status, res.headers.get("location"))) throw new SesionVencida();

  const cuerpo = await res.text();
  if (res.status === 200 && esHtmlLogin(cuerpo)) throw new SesionVencida();

  // Respuesta con la misma forma que la de Playwright que espera report.mjs.
  return {
    status: () => res.status,
    text: async () => cuerpo,
    json: async () => JSON.parse(cuerpo),
  };
}

/** Crea el `ctx` compatible con report.mjs a partir de la cookie de sesion. */
export function crearCtxHTTP(cookie) {
  if (!cookie) throw new SesionVencida("No hay cookie de sesion sembrada todavia.");
  return {
    request: {
      get: (url, opts = {}) => pedir("GET", url, cookie, opts.headers),
      post: (url, opts = {}) => pedir("POST", url, cookie, opts.headers),
    },
  };
}
