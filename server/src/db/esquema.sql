-- ============================================================
--  Pollo Medina — Esquema de la base de datos (MySQL 8)
--  Se ejecuta con:  npm run db:migrar
-- ============================================================

-- ---------- Usuarios del panel ----------
CREATE TABLE IF NOT EXISTS usuarios (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario        VARCHAR(60)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  nombre         VARCHAR(120) NOT NULL,
  rol            ENUM('admin','editor') NOT NULL DEFAULT 'admin',
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acceso  DATETIME     NULL,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Configuración general del sitio ----------
CREATE TABLE IF NOT EXISTS configuracion (
  clave          VARCHAR(60)  NOT NULL,
  valor          TEXT         NULL,
  descripcion    VARCHAR(255) NULL,
  grupo          VARCHAR(40)  NOT NULL DEFAULT 'general',
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Categorías del menú ----------
CREATE TABLE IF NOT EXISTS categorias (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug           VARCHAR(60)  NOT NULL,
  nombre         VARCHAR(120) NOT NULL,
  emoji          VARCHAR(16)  NOT NULL DEFAULT '',
  orden          INT          NOT NULL DEFAULT 0,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_categorias_slug (slug),
  KEY ix_categorias_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Productos ----------
CREATE TABLE IF NOT EXISTS productos (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  categoria_id   INT UNSIGNED NOT NULL,
  slug           VARCHAR(80)  NOT NULL,
  nombre         VARCHAR(140) NOT NULL,
  descripcion    TEXT         NULL,
  precio         DECIMAL(10,2) NOT NULL DEFAULT 0,
  etiqueta       VARCHAR(40)  NULL,
  imagen         VARCHAR(255) NULL,
  orden          INT          NOT NULL DEFAULT 0,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_productos_slug (slug),
  KEY ix_productos_categoria (categoria_id, orden),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id)
    REFERENCES categorias (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Grupos de opciones de un producto (ej. "Tortillas") ----------
CREATE TABLE IF NOT EXISTS producto_opciones (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  producto_id  INT UNSIGNED NOT NULL,
  slug         VARCHAR(60)  NOT NULL,
  etiqueta     VARCHAR(80)  NOT NULL,
  orden        INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_opcion_producto_slug (producto_id, slug),
  CONSTRAINT fk_opciones_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Elecciones dentro de un grupo (ej. "Maíz" / "Harina +$20") ----------
CREATE TABLE IF NOT EXISTS producto_elecciones (
  id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  opcion_id  INT UNSIGNED NOT NULL,
  slug       VARCHAR(60)  NOT NULL,
  etiqueta   VARCHAR(80)  NOT NULL,
  extra      DECIMAL(10,2) NOT NULL DEFAULT 0,
  orden      INT          NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_eleccion_opcion_slug (opcion_id, slug),
  CONSTRAINT fk_elecciones_opcion FOREIGN KEY (opcion_id)
    REFERENCES producto_opciones (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Sucursales ----------
CREATE TABLE IF NOT EXISTS sucursales (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  slug           VARCHAR(80)  NOT NULL,
  nombre         VARCHAR(140) NOT NULL,
  direccion      VARCHAR(255) NOT NULL,
  colonia        VARCHAR(120) NULL,
  ciudad         VARCHAR(120) NULL,
  telefono       VARCHAR(40)  NULL,
  whatsapp       VARCHAR(40)  NULL,
  horario        VARCHAR(180) NULL,
  mapa_url       VARCHAR(500) NULL,
  lat            DECIMAL(10,7) NULL,
  lng            DECIMAL(10,7) NULL,
  imagen         VARCHAR(255) NULL,
  orden          INT          NOT NULL DEFAULT 0,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sucursales_slug (slug),
  KEY ix_sucursales_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Destacados de la portada (foto principal + promos) ----------
-- seccion = 'hero'  → producto que se muestra en la foto principal (uno solo)
-- seccion = 'promo' → productos de "Promociones de la semana" (varios, en orden)
CREATE TABLE IF NOT EXISTS destacados (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  seccion        ENUM('hero','promo') NOT NULL,
  producto_id    INT UNSIGNED NOT NULL,
  etiqueta       VARCHAR(60)  NULL,   -- cinta del hero o insignia de la promo
  subtitulo      VARCHAR(120) NULL,   -- texto pequeño del sello del hero (opcional)
  orden          INT          NOT NULL DEFAULT 0,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_destacados_seccion (seccion, orden),
  CONSTRAINT fk_destacados_producto FOREIGN KEY (producto_id)
    REFERENCES productos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  DASHBOARD WANSOFT — Ventas consolidadas por sucursal/día
--  (ConsolidatedSalesMasterReport de https://www.wansoft.net)
--  Se crean con:  npm run db:migrar   (no borra datos existentes)
-- ============================================================

-- ---------- Catálogo de sucursales de Wansoft ----------
-- Son las sucursales del combo de arriba del reporte. Su id/clave
-- puede diferir de la tabla "sucursales" del sitio público, por eso
-- viven en su propia tabla.
CREATE TABLE IF NOT EXISTS wansoft_sucursales (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  clave          VARCHAR(80)  NULL,          -- value del combo en Wansoft (si se conoce)
  nombre         VARCHAR(160) NOT NULL,      -- texto visible del combo (nombre en Wansoft)
  alias          VARCHAR(160) NULL,          -- nombre amigable que ve el negocio (opcional)
  orden          INT          NOT NULL DEFAULT 0,
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wansoft_suc_nombre (nombre),
  KEY ix_wansoft_suc_orden (orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Ventas por sucursal y día ----------
-- Una fila = un día de una sucursal. Se hace UPSERT por (sucursal, fecha)
-- para poder re-consultar días sin duplicar.
CREATE TABLE IF NOT EXISTS wansoft_ventas_diarias (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sucursal_id    INT UNSIGNED NOT NULL,
  fecha          DATE         NOT NULL,

  -- Importes (moneda). NULL = dato no reportado ese día.
  venta_bruta      DECIMAL(12,2) NULL,   -- venta antes de descuentos
  descuentos       DECIMAL(12,2) NULL,
  cortesias        DECIMAL(12,2) NULL,
  cancelaciones    DECIMAL(12,2) NULL,
  venta_neta       DECIMAL(12,2) NULL,   -- venta de alimentos/bebidas sin impuestos
  impuestos        DECIMAL(12,2) NULL,   -- IVA
  propinas         DECIMAL(12,2) NULL,
  venta_total      DECIMAL(12,2) NULL,   -- total cobrado (neta + impuestos + propina)

  -- Conteos
  cuentas          INT UNSIGNED NULL,    -- número de cheques/cuentas
  comensales       INT UNSIGNED NULL,    -- número de personas
  ticket_promedio  DECIMAL(12,2) NULL,   -- venta_neta / cuentas

  -- Formas de pago
  efectivo         DECIMAL(12,2) NULL,
  tarjeta          DECIMAL(12,2) NULL,
  otros_pago       DECIMAL(12,2) NULL,

  -- Cajón para cualquier otra columna del reporte que aparezca
  metricas         JSON         NULL,

  origen           ENUM('sync','importado','manual','demo') NOT NULL DEFAULT 'manual',
  notas            VARCHAR(255) NULL,
  creado_en        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_wansoft_venta_suc_fecha (sucursal_id, fecha),
  KEY ix_wansoft_venta_fecha (fecha),
  CONSTRAINT fk_wansoft_venta_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES wansoft_sucursales (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Bitácora de sincronizaciones ----------
CREATE TABLE IF NOT EXISTS wansoft_sync_log (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  iniciado_en    DATETIME     NOT NULL,
  terminado_en   DATETIME     NULL,
  estado         ENUM('ok','error','parcial','corriendo') NOT NULL DEFAULT 'corriendo',
  desde          DATE         NULL,
  hasta          DATE         NULL,
  dias           INT          NOT NULL DEFAULT 0,
  filas          INT          NOT NULL DEFAULT 0,
  mensaje        TEXT         NULL,
  PRIMARY KEY (id),
  KEY ix_wansoft_sync_inicio (iniciado_en)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Credenciales/sesión de Wansoft (una sola fila) ----------
-- Guarda la cookie de sesión autenticada que captura una persona al
-- entrar (Wansoft protege el login con Cloudflare Turnstile, que no se
-- puede resolver de forma desatendida). El sync reutiliza esta cookie.
CREATE TABLE IF NOT EXISTS wansoft_credenciales (
  id             TINYINT UNSIGNED NOT NULL DEFAULT 1,
  usuario        VARCHAR(160) NULL,
  cookie         MEDIUMTEXT   NULL,
  estado         VARCHAR(40)  NOT NULL DEFAULT 'sin_configurar',
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  DASHBOARD WANSOFT — Nivel producto
--  Ventas por platillo (ranking) y por tipo de producto (treemap).
--  Provienen de los reportes SalesBySaucer y SalesByGroupType.
-- ============================================================

-- ---------- Ventas por producto/platillo (para el ranking) ----------
CREATE TABLE IF NOT EXISTS wansoft_ventas_productos (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sucursal_id    INT UNSIGNED NOT NULL,
  fecha          DATE         NOT NULL,
  producto       VARCHAR(200) NOT NULL,
  categoria      VARCHAR(120) NULL,
  cantidad       INT UNSIGNED NULL,
  subtotal       DECIMAL(12,2) NULL,
  total          DECIMAL(12,2) NULL,
  origen         ENUM('sync','importado','manual','demo') NOT NULL DEFAULT 'manual',
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wsprod_suc_fecha_prod (sucursal_id, fecha, producto),
  KEY ix_wsprod_fecha (fecha),
  KEY ix_wsprod_categoria (categoria),
  KEY ix_wsprod_producto (producto),
  CONSTRAINT fk_wsprod_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES wansoft_sucursales (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Ventas por tipo/grupo de producto (para el treemap) ----------
CREATE TABLE IF NOT EXISTS wansoft_ventas_categorias (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sucursal_id    INT UNSIGNED NOT NULL,
  fecha          DATE         NOT NULL,
  nivel          ENUM('tipo','grupo') NOT NULL DEFAULT 'tipo',
  nombre         VARCHAR(160) NOT NULL,
  subtotal       DECIMAL(12,2) NULL,
  iva            DECIMAL(12,2) NULL,
  total          DECIMAL(12,2) NULL,
  origen         ENUM('sync','importado','manual','demo') NOT NULL DEFAULT 'manual',
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wscat_suc_fecha_nivel_nom (sucursal_id, fecha, nivel, nombre),
  KEY ix_wscat_fecha (fecha),
  CONSTRAINT fk_wscat_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES wansoft_sucursales (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
--  DASHBOARD WANSOFT — Reportes dimensionales (tabla genérica)
--  Un renglón = una dimensión de un reporte, por sucursal y día.
--  reporte: 'grupo' | 'tipo_grupo' | 'tipo_orden' | 'usuario' |
--           'terminal' | 'modificador' | 'forma_pago' | 'hora'
--  Alimenta: secciones del dashboard + mapa de calor (hora x dia).
-- ============================================================
CREATE TABLE IF NOT EXISTS wansoft_reportes (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  sucursal_id    INT UNSIGNED NOT NULL,
  fecha          DATE         NOT NULL,
  reporte        VARCHAR(30)  NOT NULL,
  etiqueta       VARCHAR(200) NOT NULL,
  etiqueta2      VARCHAR(200) NOT NULL DEFAULT '',
  cantidad       INT          NULL,
  cantidad2      INT          NULL,
  subtotal       DECIMAL(12,2) NULL,
  iva            DECIMAL(12,2) NULL,
  total          DECIMAL(12,2) NULL,
  porcentaje     DECIMAL(6,2) NULL,
  origen         ENUM('sync','importado','manual','demo') NOT NULL DEFAULT 'manual',
  creado_en      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_wsrep (sucursal_id, fecha, reporte, etiqueta, etiqueta2),
  KEY ix_wsrep_fecha_rep (fecha, reporte),
  KEY ix_wsrep_rep_etq (reporte, etiqueta),
  CONSTRAINT fk_wsrep_sucursal FOREIGN KEY (sucursal_id)
    REFERENCES wansoft_sucursales (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
