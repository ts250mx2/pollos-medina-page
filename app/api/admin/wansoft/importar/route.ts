import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { importarVentas } from "@/lib/services/wansoft";
import { parsearCSV } from "@/lib/services/wansoft-parseo";

/**
 * Importación masiva. Acepta:
 *  - { filas: [ {sucursal|sucursal_id, fecha, venta_neta, ...}, ... ] }
 *  - { csv: "texto csv o pegado del reporte", sucursal?: "Nombre", fecha?: "YYYY-MM-DD" }
 */
export async function POST(request: Request) {
  return conSesion(async () => {
    const body = await request.json();

    let filas = Array.isArray(body.filas) ? body.filas : null;
    if (!filas && typeof body.csv === "string") {
      filas = parsearCSV(body.csv, { sucursal: body.sucursal, fecha: body.fecha });
    }
    if (!filas || !filas.length) {
      return NextResponse.json(
        { ok: false, error: "Envía 'filas' (arreglo) o 'csv' (texto) con al menos un registro." },
        { status: 400 }
      );
    }

    const resultado = await importarVentas(filas, body.origen || "importado");
    return NextResponse.json({ ok: true, ...resultado, total: filas.length });
  });
}
