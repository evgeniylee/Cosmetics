"use client";
// Редактор баннера главной: тексты, кнопка и куда ведёт, фон / картинка / иконки, даты показа и живой предпросмотр.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CATEGORIES } from "@/data/catalog";
import { compressImage } from "@/lib/compress-image";
import { BANNER_ICONS, type HeroBanner } from "@/lib/storefront";
import { HeroSlide } from "@/components/HeroCarousel";
import { saveBanner, uploadProductImage } from "../../../actions";
import { Card, Toast } from "../../../ui";

type L = { ru: string; uz: string };
type Icon = (typeof BANNER_ICONS)[number];
export type BannerFormValue = {
  id: string | null; tone: "light" | "dark"; bg: string; imageDesktop: string | null; imageMobile: string | null; art: Icon[];
  eyebrow: L; title: L; text: L; cta: L; href: string; active: boolean; startsAt: string | null; endsAt: string | null;
};

const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-accent";
const BGS: { l: string; v: string; tone: "light" | "dark" }[] = [
  { l: "Розовый", v: "radial-gradient(120% 90% at 80% 20%,#ffd9e8 0%,#f7c3d8 35%,#e7b7e0 70%,#cdb8ef 100%)", tone: "light" },
  { l: "Солнечный", v: "radial-gradient(110% 90% at 75% 30%,#fff6d6 0%,#ffe7a8 40%,#ffd3a3 75%,#ffc4b8 100%)", tone: "light" },
  { l: "Голубой", v: "radial-gradient(110% 90% at 78% 25%,#e3f1ff 0%,#c4dcf5 45%,#b9c8f0 80%,#d6c9f2 100%)", tone: "light" },
  { l: "Зелёный тёмный", v: "radial-gradient(90% 90% at 80% 25%,#2f6b55 0%,#1b3d33 45%,#111814 100%)", tone: "dark" },
  { l: "Фуксия", v: "radial-gradient(100% 100% at 85% 20%,#ff8fbf 0%,#e4467e 40%,#7a2cc2 100%)", tone: "dark" },
  { l: "Графит", v: "radial-gradient(100% 100% at 80% 20%,#3a3a40 0%,#1c1c20 55%,#111 100%)", tone: "dark" },
  { l: "Светлый", v: "#f7f6f9", tone: "light" },
];

async function upload(file: File, max: number) {
  const fd = new FormData();
  fd.set("file", await compressImage(file, max, 0.88));
  fd.set("folder", "banners");
  const r = await uploadProductImage(fd);
  if (!r.ok || !r.url) throw new Error(r.ok ? "Не удалось загрузить" : r.error);
  return r.url;
}

function Uploader({ label, hint, value, onChange, max, ratio }: { label: string; hint: string; value: string | null; onChange: (v: string | null) => void; max: number; ratio: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <p className="text-[13px] font-medium">{label}</p>
      <p className="text-[12px] text-muted">{hint}</p>
      <button type="button" onClick={() => ref.current?.click()} className="relative mt-1.5 grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-surface text-[13px] text-muted" style={{ aspectRatio: ratio }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="" className="absolute inset-0 h-full w-full object-cover" /> : busy ? "Загружаем…" : "+ Загрузить"}
      </button>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={async (e) => {
        const f = e.target.files?.[0]; e.target.value = ""; if (!f) return;
        setBusy(true); setErr(null);
        try { onChange(await upload(f, max)); } catch (x) { setErr(x instanceof Error ? x.message : "Не удалось"); } finally { setBusy(false); }
      }} />
      {value && <button type="button" onClick={() => onChange(null)} className="mt-1 text-[13px] text-muted underline">Убрать</button>}
      {err && <p className="mt-1 text-[12px] text-warn">{err}</p>}
    </div>
  );
}

/** Предпросмотр баннера так, как на сайте на ПК (1440 × 700), уменьшенный под ширину блока. */
function Preview({ s, lang }: { s: HeroBanner; lang: "ru" | "uz" }) {
  const box = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setK(el.clientWidth / 1440));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={box} className="relative w-full overflow-hidden rounded-2xl ring-1 ring-line" style={{ aspectRatio: "1440 / 700" }}>
      <div className="pointer-events-none absolute left-0 top-0 h-[700px] w-[1440px] origin-top-left" style={{ transform: `scale(${k})` }}>
        <HeroSlide s={s} lang={lang} active />
      </div>
    </div>
  );
}

export function BannerForm({ initial, brands, creators }: { initial: BannerFormValue; brands: { slug: string; name: string }[]; creators: { code: string; name: string }[] }) {
  const [f, setF] = useState(initial);
  const [lang, setLang] = useState<"ru" | "uz">("ru");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof BannerFormValue>(k: K, v: BannerFormValue[K]) => setF((s) => ({ ...s, [k]: v }));
  const setL = (k: "eyebrow" | "title" | "text" | "cta", v: string) => setF((s) => ({ ...s, [k]: { ...s[k], [lang]: v } }));
  const links: { l: string; v: string }[] = [
    { l: "Подбор ухода (квиз)", v: "/quiz" }, { l: "Весь каталог", v: "/catalog" }, { l: "Скидки", v: "/catalog?sale=1" }, { l: "Новинки", v: "/catalog?sort=new" }, { l: "Хиты", v: "/catalog?sort=popular" },
    ...CATEGORIES.map((c) => ({ l: `Категория: ${c.name.ru}`, v: `/catalog?cat=${c.id}` })),
    ...brands.map((b) => ({ l: `Бренд: ${b.name}`, v: `/brands/${b.slug}` })),
    ...creators.map((c) => ({ l: `Подборка креатора: ${c.name}`, v: `/catalog?creator=${c.code}` })),
  ];
  const preset = links.some((x) => x.v === f.href) ? f.href : "custom";
  const preview: HeroBanner = {
    id: f.id ?? "new", tone: f.tone, bg: f.bg, art: f.art, eyebrow: f.eyebrow, title: f.title.ru || f.title.uz ? f.title : { ru: "Заголовок баннера", uz: "" },
    text: f.text, cta: f.cta, href: f.href,
    image: f.imageDesktop || f.imageMobile ? { desktop: (f.imageDesktop || f.imageMobile)!, mobile: (f.imageMobile || f.imageDesktop)! } : undefined,
  };
  const err = (k: string) => errors[k] || errors[`${k}.ru`];

  const submit = () => start(async () => {
    const r = await saveBanner(f);
    if (!r.ok) { setErrors(r.fields ?? {}); setMsg(r.error); setTimeout(() => setMsg(null), 2400); return; }
    setErrors({});
    setMsg(r.message ?? "Сохранено"); setTimeout(() => setMsg(null), 2000);
    if (!f.id && r.id) { setF((s) => ({ ...s, id: r.id! })); router.replace(`/admin/storefront/banners/${r.id}`); }
    router.refresh();
  });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4 px-4 pb-32 md:px-8">
      <Card className="space-y-2">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 font-bold">Как будет на сайте</h2>
          <div className="flex rounded-full bg-surface p-1 text-[13px]">
            {(["ru", "uz"] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full px-3 font-medium ${lang === l ? "bg-white shadow" : "text-muted"}`}>{l === "ru" ? "Русский" : "O‘zbekcha"}</button>)}
          </div>
        </div>
        <Preview s={preview} lang={lang} />
        <p className="text-[12px] text-muted">Вид на компьютере. На телефоне текст стоит сверху, картинка или иконки — под ним.</p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-3">
          <h2 className="font-bold">Текст и кнопка <span className="font-normal text-muted">· {lang === "ru" ? "русский" : "узбекский"}</span></h2>
          <label className="block"><span className="text-[13px] text-muted">Надпись над заголовком (необязательно)</span><input className={`${input} mt-1`} maxLength={60} value={f.eyebrow[lang]} onChange={(e) => setL("eyebrow", e.target.value)} placeholder="Сезон SPF" /></label>
          <label className="block"><span className="text-[13px] text-muted">Заголовок — до 70 знаков, лучше 3–6 слов</span><input id="b-title" className={`${input} mt-1 ${err("title") ? "border-warn" : ""}`} maxLength={70} value={f.title[lang]} onChange={(e) => setL("title", e.target.value)} placeholder="Санскрины без белых следов" /></label>
          <label className="block"><span className="text-[13px] text-muted">Текст (необязательно)</span><textarea className={`${input} mt-1 h-auto py-2`} rows={2} maxLength={160} value={f.text[lang]} onChange={(e) => setL("text", e.target.value)} /></label>
          <label className="block"><span className="text-[13px] text-muted">Текст кнопки</span><input id="b-cta" className={`${input} mt-1 ${err("cta") ? "border-warn" : ""}`} maxLength={30} value={f.cta[lang]} onChange={(e) => setL("cta", e.target.value)} /></label>
          <label className="block"><span className="text-[13px] text-muted">Куда ведёт кнопка</span>
            <select id="b-link" className={`${input} mt-1`} value={preset} onChange={(e) => { if (e.target.value !== "custom") set("href", e.target.value); }}>
              {links.map((x) => <option key={x.v} value={x.v}>{x.l}</option>)}
              <option value="custom">Своя ссылка…</option>
            </select>
          </label>
          {preset === "custom" && <input className={`${input} ${errors.href ? "border-warn" : ""}`} value={f.href} onChange={(e) => set("href", e.target.value)} placeholder="/catalog?concern=acne" />}
          {errors.href && <p className="text-[12px] text-warn">{errors.href}</p>}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">Оформление</h2>
          <div>
            <p className="text-[13px] text-muted">Фон</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {BGS.map((b) => (
                <button key={b.l} type="button" title={b.l} aria-label={b.l} aria-pressed={f.bg === b.v} onClick={() => setF((s) => ({ ...s, bg: b.v, tone: b.tone }))}
                  className={`size-10 rounded-full ring-1 ring-line ${f.bg === b.v ? "outline outline-2 outline-offset-2 outline-ink" : ""}`} style={{ background: b.v }} />
              ))}
              <label className="relative size-10 cursor-pointer overflow-hidden rounded-full ring-1 ring-line" title="Свой цвет" style={{ background: f.bg.startsWith("#") ? f.bg : "conic-gradient(red,yellow,lime,cyan,blue,magenta,red)" }}>
                <input type="color" aria-label="Свой цвет фона" className="absolute inset-0 opacity-0" value={f.bg.startsWith("#") ? f.bg : "#f7f6f9"} onChange={(e) => set("bg", e.target.value)} />
              </label>
            </div>
          </div>
          <div>
            <p className="text-[13px] text-muted">Цвет текста</p>
            <div className="mt-1.5 flex w-fit rounded-full bg-surface p-1 text-[13px]">
              {([["light", "Тёмный текст"], ["dark", "Белый текст"]] as const).map(([v, l]) => <button key={v} type="button" onClick={() => set("tone", v)} className={`h-8 rounded-full px-3 font-medium ${f.tone === v ? "bg-white shadow" : "text-muted"}`}>{l}</button>)}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <Uploader label="Картинка для компьютера" hint="2880 × 1400. Левую половину оставьте спокойной — там текст." value={f.imageDesktop} onChange={(v) => set("imageDesktop", v)} max={2880} ratio="2880 / 1400" />
            <Uploader label="Картинка для телефона" hint="780 × 1240. Верх спокойный — там текст." value={f.imageMobile} onChange={(v) => set("imageMobile", v)} max={1240} ratio="780 / 1240" />
          </div>
          {!f.imageDesktop && !f.imageMobile && (
            <div>
              <p className="text-[13px] text-muted">Без картинки справа будут иконки категорий (до 3)</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {BANNER_ICONS.map((ic) => {
                  const on = f.art.includes(ic);
                  return (
                    <button key={ic} type="button" aria-pressed={on} disabled={!on && f.art.length >= 3} onClick={() => set("art", on ? f.art.filter((x) => x !== ic) : [...f.art, ic])}
                      className={`grid size-14 place-items-center rounded-xl bg-surface disabled:opacity-40 ${on ? "outline outline-2 outline-accent" : ""}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/images/icons/${ic}.webp`} alt={ic} className="size-11 object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="space-y-3">
        <h2 className="font-bold">Показ</h2>
        <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--color-accent)]" />Показывать на главной</label>
        <div className="grid max-w-md grid-cols-2 gap-2">
          <label className="block"><span className="text-[13px] text-muted">С (необязательно)</span><input type="date" className={`${input} mt-1`} value={f.startsAt ?? ""} onChange={(e) => set("startsAt", e.target.value || null)} /></label>
          <label className="block"><span className="text-[13px] text-muted">По (включительно)</span><input type="date" className={`${input} mt-1 ${errors.endsAt ? "border-warn" : ""}`} value={f.endsAt ?? ""} onChange={(e) => set("endsAt", e.target.value || null)} /></label>
        </div>
        <p className="text-[12px] text-muted">Для акций: баннер сам появится и сам исчезнет в эти даты (по Ташкенту).</p>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 px-3 md:bottom-0 md:left-[232px] md:px-8 md:pb-4">
        <button type="submit" disabled={pending} className="h-12 w-full rounded-card bg-accent font-semibold text-white shadow-float disabled:opacity-50 md:w-auto md:px-10">{pending ? "Сохраняем…" : "Сохранить баннер"}</button>
      </div>
      <Toast text={msg} />
    </form>
  );
}
