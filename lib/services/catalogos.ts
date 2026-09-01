import { consultar, enTransaccion } from "../db";
import { texto, textoOpcional } from "../validar";

// ============================================================
//  Catálogos globales: terminales de pago y usuarios de plataforma
//  Ambos se guardan por reemplazo total (borrar + insertar) dentro de
//  una transacción. sucursal_id NULL = "Sin asignar" / "Administrativo".
// ============================================================

export interface TerminalRow {
  id: number;
  sucursal_id: number | null;
  tipo: string;
  numero_serie: string | null;
  cuenta: string | null;
  notas: string | null;
}

export interface UsuarioPlataformaRow {
  id: number;
  plataforma: string;
  usuario: string;
  password: string | null;
  tipo_usuario: string;
  sucursal_id: number | null;
  url: string | null;
}

const aSucursalId = (v: any): number | null => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// ---------- Terminales ----------

export async function listarTerminales(): Promise<TerminalRow[]> {
  return consultar<TerminalRow>(
    "SELECT id, sucursal_id, tipo, numero_serie, cuenta, notas FROM terminales ORDER BY orden, id"
  );
}

function leerTerminales(lista: any) {
  if (!Array.isArray(lista)) return [];
  return lista.map((t) => ({
    sucursal_id: aSucursalId(t.sucursal_id),
    tipo: texto(t.tipo, "tipo de terminal", { max: 40 }),
    numero_serie: textoOpcional(t.numero_serie, "número de serie", { max: 120 }),
    cuenta: textoOpcional(t.cuenta, "cuenta", { max: 120 }),
    notas: textoOpcional(t.notas, "notas", { max: 500 }),
  }));
}

export async function guardarTerminales(datos: any): Promise<{ total: number }> {
  const filas = leerTerminales(datos?.terminales);
  return enTransaccion(async (cx) => {
    await cx.execute("DELETE FROM terminales");
    for (let i = 0; i < filas.length; i++) {
      const t = filas[i];
      await cx.execute(
        "INSERT INTO terminales (sucursal_id, tipo, numero_serie, cuenta, notas, orden) VALUES (?, ?, ?, ?, ?, ?)",
        [t.sucursal_id, t.tipo, t.numero_serie, t.cuenta, t.notas, i]
      );
    }
    return { total: filas.length };
  });
}

// ---------- Usuarios de plataforma ----------

export async function listarUsuariosPlataforma(): Promise<UsuarioPlataformaRow[]> {
  return consultar<UsuarioPlataformaRow>(
    "SELECT id, plataforma, usuario, password, tipo_usuario, sucursal_id, url FROM usuarios_plataforma ORDER BY orden, id"
  );
}

function leerUsuarios(lista: any) {
  if (!Array.isArray(lista)) return [];
  return lista.map((u) => ({
    plataforma: texto(u.plataforma, "plataforma", { max: 60 }),
    usuario: texto(u.usuario, "usuario", { max: 160 }),
    password: textoOpcional(u.password, "contraseña", { max: 255 }),
    tipo_usuario: u.tipo_usuario === "Administrador" ? "Administrador" : "Usuario",
    sucursal_id: aSucursalId(u.sucursal_id),
    url: textoOpcional(u.url, "url", { max: 500 }),
  }));
}

export async function guardarUsuariosPlataforma(datos: any): Promise<{ total: number }> {
  const filas = leerUsuarios(datos?.usuarios);
  return enTransaccion(async (cx) => {
    await cx.execute("DELETE FROM usuarios_plataforma");
    for (let i = 0; i < filas.length; i++) {
      const u = filas[i];
      await cx.execute(
        `INSERT INTO usuarios_plataforma (plataforma, usuario, password, tipo_usuario, sucursal_id, url, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [u.plataforma, u.usuario, u.password, u.tipo_usuario, u.sucursal_id, u.url, i]
      );
    }
    return { total: filas.length };
  });
}
