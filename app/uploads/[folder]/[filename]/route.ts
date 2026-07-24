import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const EXTENSION_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folder: string; filename: string }> }
) {
  try {
    const { folder, filename } = await params;

    // Prevenir Directory Traversal validando la carpeta
    const carpetasValidas = ["menu", "sucursales"];
    if (!carpetasValidas.includes(folder)) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    // Prevenir navegación de directorios en el nombre de archivo
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return new NextResponse("Nombre de archivo inválido", { status: 400 });
    }

    const filepath = path.join(process.cwd(), "uploads", folder, filename);

    if (!fs.existsSync(filepath)) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    const stat = await fs.promises.stat(filepath);
    if (!stat.isFile()) {
      return new NextResponse("No encontrado", { status: 404 });
    }

    const ext = path.extname(filename).toLowerCase();
    const mime = EXTENSION_TO_MIME[ext] || "application/octet-stream";

    const fileBuffer = await fs.promises.readFile(filepath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": mime,
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=2592000, immutable", // Caché de 30 días
      },
    });
  } catch (err) {
    console.error("Error serving upload:", err);
    return new NextResponse("Error interno", { status: 500 });
  }
}
