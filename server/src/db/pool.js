/**
 * Pool de conexiones MySQL compartido por toda la aplicación.
 */
"use strict";

const mysql = require("mysql2/promise");
const config = require("../config/env");

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  queueLimit: 0,
  // Cerrar conexiones ociosas para no acaparar cupos en el servidor MySQL.
  maxIdle: 2,
  idleTimeout: 30000,
  charset: "utf8mb4_general_ci",
  dateStrings: true,
  timezone: "Z",
});

/** Ejecuta una consulta parametrizada y devuelve las filas. */
async function consultar(sql, parametros = []) {
  const [filas] = await pool.execute(sql, parametros);
  return filas;
}

/** Devuelve la primera fila o null. */
async function unaFila(sql, parametros = []) {
  const filas = await consultar(sql, parametros);
  return filas.length ? filas[0] : null;
}

/** Corre varias operaciones dentro de una transacción. */
async function enTransaccion(trabajo) {
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

/** Verifica que la base responde (se usa al arrancar). */
async function verificarConexion() {
  const fila = await unaFila("SELECT VERSION() AS version, DATABASE() AS base");
  return fila;
}

module.exports = { pool, consultar, unaFila, enTransaccion, verificarConexion };
