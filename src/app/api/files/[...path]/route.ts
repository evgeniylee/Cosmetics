import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { UPLOAD_DIR } from "@/server/uploads";

// Отдаёт загруженные файлы (фото товаров) из UPLOAD_DIR. Имена файлов случайные, поэтому кэш навсегда.
const TYPES: Record<string, string> = { ".webp": "image/webp", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png" };

export async function GET(_: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  if (!parts.every((p) => /^[a-zA-Z0-9._-]+$/.test(p) && p !== ".." && p !== ".")) return new NextResponse("Not found", { status: 404 });
  const file = path.resolve(UPLOAD_DIR, ...parts);
  if (!file.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return new NextResponse("Not found", { status: 404 });
  const type = TYPES[path.extname(file).toLowerCase()];
  if (!type) return new NextResponse("Not found", { status: 404 });
  try {
    const data = await readFile(file);
    return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
