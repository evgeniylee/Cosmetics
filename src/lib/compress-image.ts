"use client";
/** Сжимаем картинку в браузере перед загрузкой: длинная сторона до max px, WebP (или JPEG, если браузер не умеет WebP). */
export async function compressImage(file: File, max = 1400, quality = 0.86): Promise<File> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = (t: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, t, quality));
  let out = await blob("image/webp");
  if (!out || out.type !== "image/webp") out = await blob("image/jpeg");
  if (!out) throw new Error("Не удалось обработать изображение");
  // Логотипы с прозрачностью — в PNG, если WebP недоступен.
  return new File([out], out.type === "image/webp" ? "image.webp" : "image.jpg", { type: out.type });
}
