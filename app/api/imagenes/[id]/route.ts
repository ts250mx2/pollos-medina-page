import { NextResponse } from "next/server";
import { unaFila } from "@/lib/db";

/**
 * Sirve una imagen guardada en la base de datos (tabla `imagenes`).
 * Ruta pública: la usan tanto el panel como el sitio.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idNum = Number.parseInt(id, 10);
    if (!Number.isInteger(idNum) || idNum <= 0) {
      return new NextResponse("Imagen no válida", { status: 400 });
    }

    const fila = await unaFila<{ mime: string; datos: Buffer; bytes: number }>(
      "SELECT mime, datos, bytes FROM imagenes WHERE id = ?",
      [idNum]
    );
    if (!fila) {
      return new NextResponse("Imagen no encontrada", { status: 404 });
    }

    const cuerpo = Buffer.isBuffer(fila.datos) ? fila.datos : Buffer.from(fila.datos as any);

    return new NextResponse(cuerpo, {
      status: 200,
      headers: {
        "Content-Type": fila.mime || "application/octet-stream",
        "Content-Length": String(cuerpo.length),
        // Cada imagen es inmutable (id fijo), así que se cachea agresivamente.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Error al servir imagen:", error);
    return new NextResponse("Error interno", { status: 500 });
  }
}
