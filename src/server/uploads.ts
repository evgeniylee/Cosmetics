import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Локальное хранилище загруженных файлов. На сервере папку нужно включить в резервное копирование.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./.data/uploads";

const MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/webp": ".webp", "image/jpeg": ".jpg", "image/png": ".png" };

export async function saveUpload(file: File, folder: "products") {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Формат не поддерживается: нужен WebP, JPG или PNG");
  if (file.size > MAX) throw new Error("Файл больше 4 МБ");
  const name = `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${folder}/${name}`;
}
