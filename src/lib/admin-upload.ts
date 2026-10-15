"use client";
// Загрузки в админке: видео потоком (с прогрессом) и кадр из видео как обложка.
import { compressImage } from "./compress-image";

export const VIDEO_MAX_MB = 80;

export function uploadVideo(file: File, onProgress: (p: number) => void) {
  return new Promise<string>((resolve, reject) => {
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) { reject(new Error("Нужен MP4 (лучше всего), WebM или MOV")); return; }
    if (file.size > VIDEO_MAX_MB * 1024 * 1024) { reject(new Error(`Файл ${Math.round(file.size / 1048576)} МБ — максимум ${VIDEO_MAX_MB} МБ. Сожмите до 1080p.`)); return; }
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/admin/upload/video");
    xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => {
      try {
        const r = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && r.url) resolve(r.url); else reject(new Error(r.error || "Не удалось загрузить"));
      } catch { reject(new Error("Не удалось загрузить")); }
    };
    xhr.onerror = () => reject(new Error("Сеть прервалась — попробуйте ещё раз"));
    xhr.send(file);
  });
}

/** Текущий кадр видео → сжатая картинка для обложки. */
export async function frameToFile(video: HTMLVideoElement) {
  const c = document.createElement("canvas");
  const k = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
  c.width = Math.round(video.videoWidth * k);
  c.height = Math.round(video.videoHeight * k);
  c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Не удалось снять кадр");
  return compressImage(new File([blob], "poster.jpg", { type: "image/jpeg" }), 1080);
}
