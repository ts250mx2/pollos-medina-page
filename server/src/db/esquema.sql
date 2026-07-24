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
