"use client";
// «О товаре»: блоки под описанием в карточке товара — текст, фото, видео, «фото + текст».
// Тексты редактируются на языке, выбранном в блоке «Тексты» (рус/узб).
import { useRef, useState } from "react";
import type { AboutBlockT } from "@/server/product-schema";
import { compressImage } from "@/lib/compress-image";
import { frameToFile, uploadVideo } from "@/lib/admin-upload";
import { uploadProductImage } from "../../actions";
import { Card } from "../../ui";

type Lang = "ru" | "uz";
const E = { ru: "", uz: "" };
const input = "h-10 w-full rounded-lg border border-line bg-white px-2.5 text-[14px] outline-none focus:border-accent";
const area = "w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[14px] outline-none focus:border-accent";
const LABEL: Record<AboutBlockT["type"], string> = { text: "Текст", image: "Фото", video: "Видео", split: "Фото + текст" };

async function uploadImage(file: File) {
  const fd = new FormData();
  fd.set("file", await compressImage(file, 1600));
  const r = await uploadProductImage(fd);
  if (!r.ok || !r.url) throw new Error(r.ok ? "Не удалось загрузить" : r.error);
  return r.url;
}

function ImagePick({ src, onChange, error }: { src?: string; onChange: (url: string) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <button type="button" onClick={() => ref.current?.click()} className={`relative grid aspect-[4/3] w-full max-w-[260px] place-items-center overflow-hidden rounded-xl border-2 border-dashed bg-surface text-[13px] text-muted ${error ? "border-warn" : "border-line"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src ? <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" /> : busy ? "Загружаем…" : "+ Фото"}
        {src && <span className="absolute bottom-1.5 right-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] text-ink">Заменить</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        setBusy(true); setErr(null);
        try { onChange(await uploadImage(f)); } catch (x) { setErr(x instanceof Error ? x.message : "Не удалось"); } finally { setBusy(false); }
      }} />
      {(err || error) && <p className="mt-1 text-[12px] text-warn">{err || error}</p>}
    </div>
  );
}

function VideoPick({ block, onChange, error }: { block: Extract<AboutBlockT, { type: "video" }>; onChange: (b: Partial<Extract<AboutBlockT, { type: "video" }>>) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const needPoster = useRef(false);
  return (
    <div>
      {block.src ? (
        <video ref={vid} src={block.src} poster={block.poster ?? undefined} controls muted playsInline preload="metadata" className="max-h-[320px] w-full max-w-[420px] rounded-xl bg-ink"
          onLoadedData={async (e) => {
            // Обложку снимаем автоматически с первой секунды, если её ещё нет.
            const v = e.currentTarget;
            if (!needPoster.current || block.poster) return;
            needPoster.current = false;
            v.currentTime = Math.min(1, (v.duration || 2) / 2);
            await new Promise((r) => v.addEventListener("seeked", r, { once: true }));
            try { onChange({ poster: await uploadImage(await frameToFile(v)) }); } catch { /* обложка необязательна */ }
          }}
          onError={() => setErr("Браузер не может воспроизвести файл. Сохраните видео в MP4 (H.264).")} />
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className={`grid h-32 w-full max-w-[420px] place-items-center rounded-xl border-2 border-dashed bg-surface text-[13px] text-muted ${error ? "border-warn" : "border-line"}`}>
          {progress !== null ? `Загрузка ${Math.round(progress * 100)}%` : "+ Видео (MP4, до 80 МБ)"}
        </button>
      )}
      {block.src && <button type="button" onClick={() => ref.current?.click()} disabled={progress !== null} className="mt-1.5 text-[13px] text-accent underline">{progress !== null ? `Загрузка ${Math.round(progress * 100)}%` : "Заменить видео"}</button>}
      <input ref={ref} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        setErr(null); setProgress(0);
        try { const url = await uploadVideo(f, setProgress); needPoster.current = true; onChange({ src: url, poster: null }); }
        catch (x) { setErr(x instanceof Error ? x.message : "Не удалось"); }
        finally { setProgress(null); }
      }} />
      {(err || error) && <p className="mt-1 text-[12px] text-warn">{err || error}</p>}
    </div>
  );
}

export function AboutEditor({ blocks, lang, onChange, errors }: { blocks: AboutBlockT[]; lang: Lang; onChange: (b: AboutBlockT[]) => void; errors: Record<string, string> }) {
  const set = (i: number, patch: Partial<AboutBlockT>) => onChange(blocks.map((b, j) => (j === i ? ({ ...b, ...patch } as AboutBlockT) : b)));
  const move = (i: number, d: number) => {
    const a = [...blocks];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  const add = (type: AboutBlockT["type"]) => {
    const b: AboutBlockT =
      type === "text" ? { type, title: E, text: E }
      : type === "image" ? { type, src: "", caption: E }
      : type === "video" ? { type, src: "", poster: null, caption: E }
      : { type, src: "", title: E, text: E };
    onChange([...blocks, b]);
  };
  const L = (v: { ru: string; uz: string }, val: string) => ({ ...v, [lang]: val });
  const e = (i: number, k: string) => errors[`content.about.${i}.${k}`];

  return (
    <Card className="space-y-3">
      <div>
        <h2 className="font-bold">О товаре</h2>
        <p className="text-[13px] text-muted">Блоки под описанием: как работает средство, текстура, «до и после», видео нанесения. Порядок — как здесь. Тексты — на языке, выбранном выше в «Тексты» ({lang === "ru" ? "русский" : "узбекский"}).</p>
      </div>
      <ol className="space-y-2">
        {blocks.map((b, i) => (
          <li key={i} className="rounded-xl bg-surface/70 p-3 ring-1 ring-line">
            <div className="mb-2 flex items-center gap-1">
              <span className="flex-1 text-[13px] font-semibold">{i + 1}. {LABEL[b.type]}</span>
              <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg bg-white text-[12px] disabled:opacity-30">↑</button>
              <button type="button" aria-label="Ниже" disabled={i === blocks.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg bg-white text-[12px] disabled:opacity-30">↓</button>
              <button type="button" aria-label="Удалить блок" onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg bg-white text-warn">✕</button>
            </div>
            {b.type === "text" && (
              <div className="space-y-2">
                <input aria-label="Заголовок блока" className={input} placeholder="Заголовок (необязательно): Как работает" value={b.title[lang]} onChange={(ev) => set(i, { title: L(b.title, ev.target.value) })} />
                <textarea aria-label="Текст блока" className={`${area} ${e(i, "text.ru") ? "border-warn" : ""}`} rows={4} value={b.text[lang]} onChange={(ev) => set(i, { text: L(b.text, ev.target.value) })} />
              </div>
            )}
            {b.type === "image" && (
              <div className="space-y-2">
                <ImagePick src={b.src} onChange={(src) => set(i, { src })} error={e(i, "src")} />
                <input aria-label="Подпись" className={input} placeholder="Подпись (необязательно)" value={b.caption[lang]} onChange={(ev) => set(i, { caption: L(b.caption, ev.target.value) })} />
              </div>
            )}
            {b.type === "video" && (
              <div className="space-y-2">
                <VideoPick block={b} onChange={(patch) => set(i, patch)} error={e(i, "src")} />
                <input aria-label="Подпись" className={input} placeholder="Подпись (необязательно): Как наносить" value={b.caption[lang]} onChange={(ev) => set(i, { caption: L(b.caption, ev.target.value) })} />
              </div>
            )}
            {b.type === "split" && (
              <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                <ImagePick src={b.src} onChange={(src) => set(i, { src })} error={e(i, "src")} />
                <div className="space-y-2">
                  <input aria-label="Заголовок блока" className={input} placeholder="Заголовок: Лёгкая гелевая текстура" value={b.title[lang]} onChange={(ev) => set(i, { title: L(b.title, ev.target.value) })} />
                  <textarea aria-label="Текст блока" className={area} rows={4} value={b.text[lang]} onChange={(ev) => set(i, { text: L(b.text, ev.target.value) })} />
                </div>
              </div>
            )}
          </li>
        ))}
      </ol>
      {blocks.length < 20 && (
        <div className="flex flex-wrap gap-2">
          {(["text", "image", "video", "split"] as const).map((t) => (
            <button key={t} type="button" onClick={() => add(t)} className="h-9 rounded-full bg-ink px-3.5 text-[13px] font-semibold text-white">+ {LABEL[t]}</button>
          ))}
        </div>
      )}
    </Card>
  );
}
