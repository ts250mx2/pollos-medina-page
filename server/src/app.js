/**
 * Aplicación Express: sirve el sitio público, el panel y la API.
 */
"use strict";

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const config = require("./config/env");
const rutasAuth = require("./routes/auth.routes");
const rutasPublicas = require("./routes/publico.routes");
const rutasAdmin = require("./routes/admin.routes");
const { noEncontrado, manejarErrores } = require("./middleware/errores");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ---------- Seguridad ---------- */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // El sitio usa estilos en línea y Google Fonts.
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

/** Límite general para la API (protege contra abuso). */
app.use(
  "/api",
  rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { ok: false, error: "Demasiadas peticiones. Espera un momento." },
  })
);

/* ---------- Parsers ---------- */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(cookieParser());

/* ---------- API ---------- */
app.get("/api/salud", (req, res) => res.json({ ok: true, entorno: config.entorno }));
app.use("/api/auth", rutasAuth);
app.use("/api/publico", rutasPublicas);
app.use("/api/admin", rutasAdmin);

/* ---------- Archivos estáticos ---------- */
const opcionesEstaticas = { maxAge: config.esProduccion ? "7d" : 0, etag: true };

app.use("/uploads", express.static(config.rutaSubidas, { maxAge: "30d", etag: true }));
app.use("/admin", express.static(config.rutaAdmin, opcionesEstaticas));
app.use(express.static(config.rutaPublica, opcionesEstaticas));

app.get("/admin", (req, res) => res.sendFile(path.join(config.rutaAdmin, "index.html")));
app.get("/", (req, res) => res.sendFile(path.join(config.rutaPublica, "index.html")));

/* ---------- Errores ---------- */
app.use("/api", noEncontrado);
app.use((req, res) => res.status(404).sendFile(path.join(config.rutaPublica, "index.html")));
app.use(manejarErrores);

module.exports = app;
