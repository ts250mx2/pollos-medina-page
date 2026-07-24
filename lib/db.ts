import mysql from "mysql2/promise";

const dbHost = process.env.DB_HOST || "74.208.192.90";
const dbPort = parseInt(process.env.DB_PORT || "3306", 10);
const dbName = process.env.DB_NAME || "BDPollosMedinaMenu";
const dbUser = process.env.DB_USER || "kyk";
const dbPassword = process.env.DB_PASSWORD || "merkurio";
const dbLimit = parseInt(process.env.DB_CONNECTION_LIMIT || "10", 10);

export const pool = mysql.createPool({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  waitForConnections: true,
  connectionLimit: dbLimit,
  queueLimit: 0,
  charset: "utf8mb4_general_ci",
  dateStrings: true,
  timezone: "Z",
});

export async function consultar<T = any>(sql: string, parametros: any[] = []): Promise<T[]> {
  const [filas] = await pool.execute(sql, parametros);
  return filas as T[];
}

export async function unaFila<T = any>(sql: string, parametros: any[] = []): Promise<T | null> {
  const filas = await consultar<T>(sql, parametros);
  return filas.length ? filas[0] : null;
}

export async function enTransaccion<T = any>(
  trabajo: (conexion: mysql.PoolConnection) => Promise<T>
): Promise<T> {
  const conexion = await pool.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await trabajo(conexion);
    await conexion.commit();
    return resultado;
  } catch (error) {
    await conexion.rollback();
    throw error;
  } finally {
    conexion.release();
  }
}

export async function verificarConexion() {
  const fila = await unaFila<{ version: string; base: string }>(
    "SELECT VERSION() AS version, DATABASE() AS base"
  );
  return fila;
}
