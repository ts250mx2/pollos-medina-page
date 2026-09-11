import { consultar, unaFila } from "../db";
import { malaPeticion } from "../validar";

// ============================================================
//  Envío a domicilio: configuración global (zonas por km) y cálculo
//  de la sucursal más cercana + tarifa según la distancia.
// ============================================================

export interface ZonaEnvio { hasta_km: number; precio: number }
export interface ConfigEnvio { activo: boolean; cobertura_km: number; zonas: ZonaEnvio[] }

const DEFAULT: ConfigEnvio = {
  activo: true,
  cobertura_km: 8,
  zonas: [
    { hasta_km: 3, precio: 30 },
    { hasta_km: 6, precio: 50 },
    { hasta_km: 8, precio: 70 },
  ],
};

const num = (v: any): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

function ordenarZonas(zonas: ZonaEnvio[]): ZonaEnvio[] {
  return [...zonas]
    .map((z) => ({ hasta_km: Math.max(0, num(z.hasta_km)), precio: Math.max(0, num(z.precio)) }))
    .filter((z) => z.hasta_km > 0)
    .sort((a, b) => a.hasta_km - b.hasta_km);
}

/** Lee la configuración de envío; devuelve valores por defecto si no hay fila. */
export async function getConfigEnvio(): Promise<ConfigEnvio> {
  const fila = await unaFila<any>("SELECT activo, cobertura_km, zonas FROM config_envio WHERE id = 1");
  if (!fila) return DEFAULT;
  const zonas = typeof fila.zonas === "string" ? JSON.parse(fila.zonas || "[]") : fila.zonas || [];
  return {
    activo: Boolean(fila.activo),
    cobertura_km: num(fila.cobertura_km),
    zonas: ordenarZonas(Array.isArray(zonas) ? zonas : []),
  };
}

/** Guarda (upsert de la fila única) la configuración de envío. */
export async function guardarConfigEnvio(datos: any): Promise<ConfigEnvio> {
  const activo = datos?.activo === false || datos?.activo === 0 || datos?.activo === "0" ? 0 : 1;
  const cobertura_km = Math.max(0, num(datos?.cobertura_km));
  const zonas = ordenarZonas(Array.isArray(datos?.zonas) ? datos.zonas : []);
  await consultar(
    `INSERT INTO config_envio (id, activo, cobertura_km, zonas)
       VALUES (1, ?, ?, CAST(? AS JSON))
     ON DUPLICATE KEY UPDATE activo = VALUES(activo), cobertura_km = VALUES(cobertura_km), zonas = VALUES(zonas)`,
    [activo, cobertura_km, JSON.stringify(zonas)]
  );
  return getConfigEnvio();
}

/** Distancia en km entre dos coordenadas (haversine). */
export function distanciaKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export interface CotizacionEnvio {
  sucursal_id: number | null;
  sucursal_nombre: string | null;
  km: number;
  cubre: boolean;
  precio: number;
  cobertura_km: number;
  activo: boolean;
  mensaje: string;
}

/** Cotiza el envío desde la sucursal más cercana a unas coordenadas. */
export async function cotizarEnvio(lat: number, lng: number): Promise<CotizacionEnvio> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw malaPeticion("Coordenadas inválidas.");
  }
  const config = await getConfigEnvio();
  const sucursales = await consultar<any>(
    "SELECT id, nombre, lat, lng FROM sucursales WHERE activo = 1 AND lat IS NOT NULL AND lng IS NOT NULL"
  );

  if (!config.activo) {
    return { sucursal_id: null, sucursal_nombre: null, km: 0, cubre: false, precio: 0, cobertura_km: config.cobertura_km, activo: false, mensaje: "El servicio a domicilio está desactivado." };
  }
  if (!sucursales.length) {
    return { sucursal_id: null, sucursal_nombre: null, km: 0, cubre: false, precio: 0, cobertura_km: config.cobertura_km, activo: true, mensaje: "No hay sucursales con ubicación configurada." };
  }

  let mejor: any = null;
  let mejorKm = Infinity;
  for (const s of sucursales) {
    const km = distanciaKm(lat, lng, Number(s.lat), Number(s.lng));
    if (km < mejorKm) { mejorKm = km; mejor = s; }
  }
  const km = Math.round(mejorKm * 10) / 10;

  if (km > config.cobertura_km) {
    return {
      sucursal_id: mejor.id, sucursal_nombre: mejor.nombre, km, cubre: false, precio: 0,
      cobertura_km: config.cobertura_km, activo: true,
      mensaje: `La sucursal más cercana (${mejor.nombre}) está a ${km} km, fuera de la cobertura de ${config.cobertura_km} km.`,
    };
  }

  const zona = config.zonas.find((z) => km <= z.hasta_km);
  const precio = zona ? zona.precio : (config.zonas.length ? config.zonas[config.zonas.length - 1].precio : 0);
  return {
    sucursal_id: mejor.id, sucursal_nombre: mejor.nombre, km, cubre: true, precio,
    cobertura_km: config.cobertura_km, activo: true,
    mensaje: `Sucursal más cercana: ${mejor.nombre} (${km} km). Envío: $${precio}.`,
  };
}
