"use client";
// Редактор видео: загрузка ролика, обложка из кадра, тексты, креатор и товары из видео.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { compressImage } from "@/lib/compress-image";
import { saveVideo, uploadProductImage } from "../../../actions";
import { Card, Toast } from "../../../ui";
import { ProductPicker, type PickOption } from "../../picker";

export type VideoFormValue = {
  id: string | null; title: { ru: string; uz: string }; description: { ru: string; uz: string };
  src: string; poster: string | null; products: string[]; active: boolean;
};

const MAX_MB = 80;
const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-accent";

function uploadVideo(file: File, onProgress: (p: number) => void) {
  return new Promise<string>((resolve, reject) => {
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

async function frameToFile(video: HTMLVideoElement) {
  const c = document.createElement("canvas");
  const k = Math.min(1, 1080 / Math.max(video.videoWidth, video.videoHeight));
  c.width = Math.round(video.videoWidth * k);
  c.height = Math.round(video.videoHeight * k);
  c.getContext("2d")!.drawImage(video, 0, 0, c.width, c.height);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.85));
  if (!blob) throw new Error("Не удалось снять кадр");
  return compressImage(new File([blob], "poster.jpg", { type: "image/jpeg" }), 1080);
}

export function VideoForm({ initial, options }: { initial: VideoFormValue; options: PickOption[] }) {
  const [f, setF] = useState(initial);
  const [local, setLocal] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [videoErr, setVideoErr] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [posterBusy, setPosterBusy] = useState(false);
  const [dur, setDur] = useState(0);
  const [t, setT] = useState(1);
  const [pending, start] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const posterRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const set = <K extends keyof VideoFormValue>(k: K, v: VideoFormValue[K]) => setF((s) => ({ ...s, [k]: v }));
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };
  const preview = local ?? f.src;

  useEffect(() => () => { if (local) URL.revokeObjectURL(local); }, [local]);

  const pick = async (file: File) => {
    setVideoErr(null);
    if (!/^video\/(mp4|webm|quicktime)$/.test(file.type)) { setVideoErr("Нужен MP4 (лучше всего), WebM или MOV"); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setVideoErr(`Файл ${Math.round(file.size / 1048576)} МБ — максимум ${MAX_MB} МБ. Сожмите до 1080p.`); return; }
    setLocal(URL.createObjectURL(file));
    setProgress(0);
    try {
      const url = await uploadVideo(file, setProgress);
      setF((s) => ({ ...s, src: url, poster: null }));
    } catch (e) {
      setVideoErr(e instanceof Error ? e.message : "Не удалось загрузить");
      setLocal(null);
    } finally {
      setProgress(null);
    }
  };

  const savePoster = async (file: File) => {
    setPosterBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "videos");
      const r = await uploadProductImage(fd);
      if (r.ok && r.url) set("poster", r.url); else flash(r.ok ? "Не удалось" : r.error);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Не удалось сохранить обложку");
    } finally {
      setPosterBusy(false);
    }
  };
  const grabFrame = async () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return;
    try { await savePoster(await frameToFile(v)); } catch (e) { flash(e instanceof Error ? e.message : "Не удалось"); }
  };

  const submit = () => start(async () => {
    const r = await saveVideo(f);
    if (!r.ok) { setErrors(r.fields ?? {}); flash(r.error); return; }
    setErrors({});
    flash(r.message ?? "Сохранено");
    if (!f.id && r.id) router.replace(`/admin/storefront/videos/${r.id}`);
    router.refresh();
    if (!f.id && r.id) setF((s) => ({ ...s, id: r.id! }));
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="grid gap-4 px-4 pb-28 md:grid-cols-[300px_1fr] md:px-8">
      <Card className="space-y-3 self-start">
        <h2 className="font-bold">Ролик</h2>
        <div className="relative mx-auto aspect-[9/16] w-full max-w-[260px] overflow-hidden rounded-2xl bg-ink">
          {preview ? (
            <video ref={videoRef} key={preview} src={preview} poster={f.poster ?? undefined} controls muted playsInline preload="metadata" className="h-full w-full object-cover"
              onLoadedMetadata={(e) => { setDur(e.currentTarget.duration || 0); setVideoErr(null); }}
              onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
              onError={() => setVideoErr("Браузер не может воспроизвести этот файл. Сохраните видео в MP4 (H.264) — так его увидят все покупатели.")} />
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="grid h-full w-full place-items-center text-center text-[14px] text-white/80">
              <span>+ Загрузить видео<br /><span className="text-[12px] text-white/50">вертикальное 9:16, MP4, до {MAX_MB} МБ</span></span>
            </button>
          )}
          {progress !== null && (
            <div className="absolute inset-x-3 bottom-3 rounded-full bg-white/90 p-1">
              <div className="h-2 rounded-full bg-accent transition-[width]" style={{ width: `${Math.round(progress * 100)}%` }} />
              <p className="mt-0.5 text-center text-[11px] tabular">Загрузка {Math.round(progress * 100)}%</p>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" aria-label="Файл видео" onChange={(e) => { const x = e.target.files?.[0]; if (x) pick(x); e.target.value = ""; }} />
        {preview && <button type="button" onClick={() => fileRef.current?.click()} disabled={progress !== null} className="h-10 w-full rounded-full bg-surface text-[14px]">Заменить видео</button>}
        {(videoErr || errors.src) && <p className="text-[13px] text-warn">{videoErr || "Загрузите видео"}</p>}

        {preview && (
          <div className="space-y-2 border-t border-line pt-3">
            <p className="text-[13px] font-medium">Обложка {f.poster ? "✓" : <span className="text-warn">— не выбрана</span>}</p>
            <p className="text-[12px] text-muted">Её видно в ленте до нажатия. Перемотайте на удачный кадр и нажмите кнопку.</p>
            {dur > 0 && <input type="range" min={0} max={dur} step={0.1} value={t} aria-label="Кадр обложки" onChange={(e) => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value); setT(Number(e.target.value)); }} className="w-full accent-[var(--color-accent)]" />}
            <div className="flex gap-2">
              <button type="button" onClick={grabFrame} disabled={posterBusy || progress !== null} className="h-9 flex-1 rounded-full bg-ink text-[13px] text-white disabled:opacity-40">{posterBusy ? "…" : "Взять этот кадр"}</button>
              <button type="button" onClick={() => posterRef.current?.click()} className="h-9 rounded-full bg-surface px-3 text-[13px]">Своё фото</button>
            </div>
            <input ref={posterRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) savePoster(await compressImage(x, 1080)); }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.poster && <img src={f.poster} alt="Обложка" className="h-24 rounded-lg object-cover ring-1 ring-line" />}
          </div>
        )}
      </Card>

      <div className="min-w-0 space-y-4">
        <Card className="space-y-3">
          <h2 className="font-bold">Описание</h2>
          <div className="grid gap-2 md:grid-cols-2">
            <label className="block"><span className="text-[13px] text-muted">Заголовок</span><input id="v-title" className={`${input} mt-1 ${errors["title.ru"] ? "border-warn" : ""}`} value={f.title.ru} maxLength={90} onChange={(e) => set("title", { ...f.title, ru: e.target.value })} placeholder="Мой уход за 3 минуты" /></label>
            <label className="block"><span className="text-[13px] text-muted">O‘zbekcha</span><input className={`${input} mt-1`} value={f.title.uz} maxLength={90} onChange={(e) => set("title", { ...f.title, uz: e.target.value })} /></label>
            <label className="block"><span className="text-[13px] text-muted">Описание — слева от видео (необязательно)</span><textarea id="v-desc" rows={3} maxLength={600} className={`${input} mt-1 h-auto py-2`} value={f.description.ru} onChange={(e) => set("description", { ...f.description, ru: e.target.value })} /></label>
            <label className="block"><span className="text-[13px] text-muted">O‘zbekcha</span><textarea rows={3} maxLength={600} className={`${input} mt-1 h-auto py-2`} value={f.description.uz} onChange={(e) => set("description", { ...f.description, uz: e.target.value })} /></label>
          </div>
          <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--color-accent)]" />Показывать на сайте</label>
        </Card>
        <Card className="space-y-3">
          <h2 className="font-bold">Товары в видео</h2>
          <p className="text-[13px] text-muted">В том порядке, в каком они появляются в ролике. До 12.</p>
          <ProductPicker options={options} value={f.products} onChange={(v) => set("products", v)} max={12} error={errors.products} />
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 px-3 md:bottom-0 md:left-[232px] md:px-8 md:pb-4">
        <button type="submit" disabled={pending || progress !== null || posterBusy} className="h-12 w-full rounded-card bg-accent font-semibold text-white shadow-float disabled:opacity-50 md:w-auto md:px-10">{pending ? "Сохраняем…" : "Сохранить видео"}</button>
      </div>
      <Toast text={msg} />
    </form>
  );
}
