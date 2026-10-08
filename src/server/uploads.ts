import "server-only";
import { randomBytes } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// Локальное хранилище загруженных файлов. На сервере папку нужно включить в резервное копирование.
export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./.data/uploads";

const MAX = 4 * 1024 * 1024;
const EXT: Record<string, string> = { "image/webp": ".webp", "image/jpeg": ".jpg", "image/png": ".png" };
type Folder = "products" | "videos" | "creators";

const fileName = (ext: string) => `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${ext}`;

export async function saveUpload(file: File, folder: Folder) {
  const ext = EXT[file.type];
  if (!ext) throw new Error("Формат не поддерживается: нужен WebP, JPG или PNG");
  if (file.size > MAX) throw new Error("Файл больше 4 МБ");
  const name = fileName(ext);
  const dir = path.join(UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/api/files/${folder}/${name}`;
}

export const VIDEO_MAX_MB = 80;
const VIDEO_EXT: Record<string, string> = { "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov" };

/** Видео пишем потоком прямо из тела запроса, не держа его в памяти. */
export async function saveVideoStream(body: ReadableStream<Uint8Array> | null, type: string) {
  const ext = VIDEO_EXT[type];
  if (!ext) throw new Error("Формат не поддерживается: нужен MP4 (лучше всего), WebM или MOV");
  if (!body) throw new Error("Файл не получен");
  const dir = path.join(UPLOAD_DIR, "videos");
  await mkdir(dir, { recursive: true });
  const name = fileName(ext);
  const full = path.join(dir, name);
  const out = createWriteStream(full);
  let size = 0;
  try {
    const reader = body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > VIDEO_MAX_MB * 1024 * 1024) { await reader.cancel(); throw new Error(`Видео больше ${VIDEO_MAX_MB} МБ — сожмите его (например, 1080p, 30 к/с)`); }
      if (!out.write(value)) await new Promise<void>((r) => out.once("drain", () => r()));
    }
    await new Promise<void>((res, rej) => { out.once("error", rej); out.end(() => res()); });
  } catch (e) {
    out.destroy();
    await unlink(full).catch(() => {});
    throw e;
  }
  if (size < 1000) { await unlink(full).catch(() => {}); throw new Error("Файл пустой"); }
  return `/api/files/videos/${name}`;
}
