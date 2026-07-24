import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import { pool } from "@/lib/db";

const CARPETAS_VALIDAS = ["menu", "sucursales"];
const TIPOS_VALIDOS = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Guarda la imagen COMPLETA en la base de datos (tabla `imagenes`, columna
 * LONGBLOB). Así las fotos ya no dependen del sistema de archivos y no se
 * pierden aunque se limpie el proyecto. Devuelve la URL que las sirve.
 */
export async function POST(request: Request) {
  return conSesion(async () => {
    const formData = await request.formData();
    const file = formData.get("imagen") as File | null;
    const folderParam = String(formData.get("carpeta") || "menu").toLowerCase();
    const carpeta = CARPETAS_VALIDAS.includes(folderParam) ? folderParam : "menu";

    if (!file) {
      return NextResponse.json({ ok: false, error: "No llegó ninguna imagen." }, { status: 400 });
    }
    if (!TIPOS_VALIDOS.includes(file.type)) {
      return NextResponse.json(
        { ok: false, error: "Solo se aceptan imágenes JPG, PNG, WEBP o AVIF." },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ ok: false, error: "La imagen supera el límite de 5 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const [resultado]: any = await pool.execute(
      "INSERT INTO imagenes (carpeta, mime, datos, bytes) VALUES (?, ?, ?, ?)",
      [carpeta, file.type, buffer, buffer.length]
    );

    const url = `/api/imagenes/${resultado.insertId}`;
    return NextResponse.json({ ok: true, url }, { status: 201 });
  });
}
