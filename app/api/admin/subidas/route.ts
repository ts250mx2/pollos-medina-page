import { NextResponse } from "next/server";
import { conSesion } from "@/lib/api-helper";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const CARPETAS_VALIDAS = ["menu", "sucursales"];
const EXTENSION_POR_TIPO: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

export async function POST(request: Request) {
  return conSesion(async () => {
    try {
      const formData = await request.formData();
      const file = formData.get("imagen") as File | null;
      const folderParam = String(formData.get("carpeta") || "menu").toLowerCase();
      const folder = CARPETAS_VALIDAS.includes(folderParam) ? folderParam : "menu";

      if (!file) {
        return NextResponse.json({ ok: false, error: "No llegó ninguna imagen." }, { status: 400 });
      }

      if (!EXTENSION_POR_TIPO[file.type]) {
        return NextResponse.json(
          { ok: false, error: "Solo se aceptan imágenes JPG, PNG, WEBP o AVIF." },
          { status: 400 }
        );
      }

      const maxBytes = 5 * 1024 * 1024;
      if (file.size > maxBytes) {
        return NextResponse.json({ ok: false, error: "La imagen supera el límite de 5MB." }, { status: 400 });
      }

      const extension = EXTENSION_POR_TIPO[file.type];
      const filename = crypto.randomBytes(10).toString("hex") + "-" + Date.now() + extension;

      const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
      await fs.promises.mkdir(uploadDir, { recursive: true });

      const buffer = Buffer.from(await file.arrayBuffer());
      await fs.promises.writeFile(path.join(uploadDir, filename), buffer);

      const url = `/uploads/${folder}/${filename}`;
      return NextResponse.json({ ok: true, url }, { status: 201 });
    } catch (err: any) {
      console.error("Upload error:", err);
      return NextResponse.json({ ok: false, error: "Error al procesar la subida." }, { status: 500 });
    }
  });
}
