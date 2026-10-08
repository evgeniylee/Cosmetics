"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { compressImage } from "@/lib/compress-image";
import { saveBrand, uploadProductImage } from "../../actions";
import { Card, Toast } from "../../ui";

type L = { ru: string; uz: string };
type Form = {
  slug: string; country: L; tagline: L; story: L; faq: { q: L; a: L }[]; color: string;
  heroImage: string | null; heroImageMobile: string | null; logo: string | null; active: boolean; sort: number;
};
const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-accent";
const area = "w-full rounded-xl border border-line bg-white p-3 text-[15px] outline-none focus:border-accent";

function ImageSlot({ label, hint, value, onChange, max, aspect }: { label: string; hint: string; value: string | null; onChange: (v: string | null) => void; max: number; aspect: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const pick = async (f: File) => {
    setBusy(true); setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", await compressImage(f, max, 0.88));
      const r = await uploadProductImage(fd);
      if (r.ok && r.url) onChange(r.url); else setErr(r.ok ? "Не удалось загрузить" : r.error);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Не удалось загрузить");
    }
    setBusy(false);
  };
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <button type="button" onClick={() => ref.current?.click()} className={`relative mt-1 grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface text-[13px] text-muted hover:border-accent ${aspect}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : <span>{busy ? "Загружаем…" : "+ Загрузить"}</span>}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) pick(f); }} />
      <div className="mt-1 flex justify-between gap-2 text-[12px]">
        <span className="text-muted">{err ? <span className="text-warn">{err}</span> : hint}</span>
        {value && <button type="button" onClick={() => onChange(null)} className="shrink-0 text-warn">Убрать</button>}
      </div>
    </div>
  );
}

export function BrandForm({ initial, name }: { initial: Form; name: string }) {
  const [f, setF] = useState(initial);
  const [lang, setLang] = useState<"ru" | "uz">("ru");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const [saved, setSaved] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(f) !== saved;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const setL = (k: "country" | "tagline" | "story", v: string) => setF((s) => ({ ...s, [k]: { ...s[k], [lang]: v } }));
  const setFaq = (i: number, part: "q" | "a", v: string) => setF((s) => ({ ...s, faq: s.faq.map((x, j) => (j === i ? { ...x, [part]: { ...x[part], [lang]: v } } : x)) }));

  const save = () => start(async () => {
    const r = await saveBrand(f);
    setMsg(r.ok ? r.message ?? "Сохранено" : r.error);
    setTimeout(() => setMsg(null), 2400);
    if (r.ok) { setSaved(JSON.stringify(f)); router.refresh(); }
  });

  return (
    <div className="grid gap-4 px-4 pb-32 md:px-8 lg:grid-cols-[1fr_340px] lg:pb-24">
      <div className="min-w-0 space-y-4">
        <Card className="space-y-3">
          <h2 className="font-bold">Баннер</h2>
          <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
            <ImageSlot label="Для компьютера" hint="Широкое фото 2400×1000, товар справа — слева будет текст" value={f.heroImage} onChange={(v) => set("heroImage", v)} max={2400} aspect="aspect-[12/5]" />
            <ImageSlot label="Для телефона (необязательно)" hint="Вертикальное 1080×1350, товар внизу" value={f.heroImageMobile} onChange={(v) => set("heroImageMobile", v)} max={1350} aspect="aspect-[4/5]" />
          </div>
          <p className="text-[12px] text-muted">Пока баннера нет, на странице показываются хиты бренда на фоне цвета бренда. Подойдут фото от дистрибьютора или ваши съёмки.</p>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 font-bold">Тексты</h2>
            <div className="flex rounded-full bg-surface p-1 text-[14px]">
              {(["ru", "uz"] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full px-4 font-medium ${lang === l ? "bg-white shadow" : "text-muted"}`}>{l === "ru" ? "Русский" : "O‘zbekcha"}</button>)}
            </div>
          </div>
          <label className="block"><span className="text-[13px] text-muted">Подзаголовок под названием (одна фраза)</span><input className={`${input} mt-1`} maxLength={120} value={f.tagline[lang]} onChange={(e) => setL("tagline", e.target.value)} /></label>
          <label className="block"><span className="text-[13px] text-muted">Страна</span><input className={`${input} mt-1`} value={f.country[lang]} onChange={(e) => setL("country", e.target.value)} /></label>
          <label className="block">
            <span className="text-[13px] text-muted">О бренде</span>
            <textarea className={`${area} mt-1`} rows={9} value={f.story[lang]} onChange={(e) => setL("story", e.target.value)} />
            <span className="text-[12px] text-muted">Абзацы — через пустую строку. Подзаголовок — строка, начинающаяся с «## ».</span>
          </label>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center"><h2 className="flex-1 font-bold">Вопросы и ответы</h2><span className="text-[12px] text-muted">{lang === "ru" ? "русский" : "узбекский"}</span></div>
          {f.faq.map((x, i) => (
            <div key={i} className="space-y-2 rounded-xl bg-surface p-3">
              <div className="flex gap-2">
                <input className={input} placeholder="Вопрос" value={x.q[lang]} onChange={(e) => setFaq(i, "q", e.target.value)} />
                <button type="button" aria-label="Удалить вопрос" onClick={() => set("faq", f.faq.filter((_, j) => j !== i))} className="shrink-0 px-2 text-warn">✕</button>
              </div>
              <textarea className={area} rows={2} placeholder="Ответ" value={x.a[lang]} onChange={(e) => setFaq(i, "a", e.target.value)} />
            </div>
          ))}
          {f.faq.length < 20 && <button type="button" onClick={() => set("faq", [...f.faq, { q: { ru: "", uz: "" }, a: { ru: "", uz: "" } }])} className="h-10 rounded-full bg-surface px-4 text-[14px]">+ Вопрос</button>}
          <p className="text-[12px] text-muted">Вопросы помогают покупателю и поиску Google/Яндекс: они попадают в разметку страницы.</p>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="space-y-3">
          <h2 className="font-bold">Оформление</h2>
          <div className="rounded-xl p-4" style={{ background: f.color }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {f.logo ? <img src={f.logo} alt="" className="h-10 w-auto object-contain" /> : <p className="text-[22px] font-bold">{name}</p>}
            <p className="mt-1 text-[13px] text-ink/70">{f.tagline.ru || "Подзаголовок"}</p>
          </div>
          <label className="flex items-center gap-3 text-[14px]">
            <input type="color" value={f.color} onChange={(e) => set("color", e.target.value.toUpperCase())} className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-white p-1" />
            Цвет бренда — фон баннера и плашки
          </label>
          <ImageSlot label="Логотип (вместо текстового названия)" hint="PNG или SVG-экспорт на прозрачном фоне" value={f.logo} onChange={(v) => set("logo", v)} max={800} aspect="aspect-[3/1]" />
          <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--color-accent)]" />Страница бренда на сайте</label>
          <label className="block"><span className="text-[13px] text-muted">Порядок в списке брендов</span><input className={`${input} mt-1`} inputMode="numeric" value={f.sort} onChange={(e) => set("sort", Number(e.target.value) || 0)} /></label>
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 px-3 md:bottom-0 md:left-[232px] md:px-8 md:pb-4">
        <div className="flex items-center gap-3 rounded-card bg-ink/95 px-4 py-3 text-white shadow-float backdrop-blur">
          <span className="min-w-0 flex-1 truncate text-[14px]">{dirty ? "Есть несохранённые изменения" : "Всё сохранено"}</span>
          <button type="button" onClick={save} disabled={pending || !dirty} className="h-10 rounded-full bg-accent px-5 font-semibold disabled:opacity-40">{pending ? "Сохраняем…" : "Сохранить"}</button>
        </div>
      </div>
      <Toast text={msg} />
    </div>
  );
}
