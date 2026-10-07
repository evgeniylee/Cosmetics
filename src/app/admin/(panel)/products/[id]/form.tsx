"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { CATEGORIES, CONCERNS, PACKS, SKIN_TYPES } from "@/data/catalog";
import type { ProductInputT } from "@/server/product-schema";
import { ProductVisual } from "@/components/ProductVisual";
import { fmtSum } from "@/lib/admin-format";
import { saveProduct, uploadProductImage } from "../../actions";
import { Card, Toast } from "../../ui";

type L = { ru: string; uz: string };
const TR: Record<string, string> = { а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sch", ы: "y", э: "e", ю: "yu", я: "ya" };
const slugify = (s: string) =>
  s.toLowerCase().split("").map((c) => TR[c] ?? c).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-accent";
const area = "w-full rounded-xl border border-line bg-white p-3 text-[15px] outline-none focus:border-accent";

function Field({ label, error, hint, children, className = "" }: { label: string; error?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[13px] text-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block text-[12px] text-warn">{error}</span> : hint ? <span className="mt-1 block text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

function Chips<T extends string>({ all, value, onChange }: { all: { id: T; name: L }[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {all.map((o) => {
        const on = value.includes(o.id);
        return (
          <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])}
            className={`rounded-full px-3 py-1.5 text-[14px] transition-colors ${on ? "bg-ink text-white" : "bg-surface hover:bg-line"}`}>
            {o.name.ru}
          </button>
        );
      })}
    </div>
  );
}

/** Сжимаем фото в браузере: длинная сторона до 1400px, WebP (или JPEG, если браузер не умеет WebP). */
async function compress(file: File): Promise<File> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = (b: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, b, 0.86));
  let out = await blob("image/webp");
  if (!out || out.type !== "image/webp") out = await blob("image/jpeg");
  if (!out) throw new Error("Не удалось обработать фото");
  return new File([out], out.type === "image/webp" ? "photo.webp" : "photo.jpg", { type: out.type });
}

export function ProductForm({ initial, options, brands }: { initial: ProductInputT; options: { id: string; label: string }[]; brands: string[] }) {
  const [p, setP] = useState<ProductInputT>(initial);
  const [lang, setLang] = useState<"ru" | "uz">("ru");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [uploading, setUploading] = useState(0);
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const dirty = JSON.stringify(p) !== JSON.stringify(initial);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 2600); };
  const set = <K extends keyof ProductInputT>(k: K, v: ProductInputT[K]) => setP((s) => ({ ...s, [k]: v }));
  const setC = <K extends keyof ProductInputT["content"]>(k: K, v: ProductInputT["content"][K]) => setP((s) => ({ ...s, content: { ...s.content, [k]: v } }));
  const setL = (k: "type" | "desc" | "why" | "howTo", v: string) => setC(k, { ...p.content[k], [lang]: v });
  const setOpt = (k: "rank" | "reviewSummary", v: string) => {
    const cur = p.content[k] ?? { ru: "", uz: "" };
    const next = { ...cur, [lang]: v };
    setC(k, next.ru || next.uz ? next : null);
  };
  const autoSlug = (brand: string, name: string) => { if (!slugTouched) set("slug", slugify(`${brand} ${name}`)); };
  const num = (v: string) => (v === "" ? null : Number(v.replace(/\s/g, "")));

  // Живой расчёт маржи.
  const margin = p.costPrice != null && p.price > 0 ? Math.round(((p.price - p.costPrice) / p.price) * 100) : null;
  const profit = p.costPrice != null ? p.price - p.costPrice : null;
  const promoProfit = p.costPrice != null ? Math.round(p.price * 0.9) - p.costPrice : null;

  const ingText = p.content.ingredients.map((i) => i[lang]).join("\n");
  const setIng = (text: string) => {
    const lines = text.split("\n");
    const other = lang === "ru" ? "uz" : "ru";
    setC("ingredients", lines.map((line, i) => ({ [lang]: line, [other]: p.content.ingredients[i]?.[other] ?? "" }) as L).filter((x, i) => x.ru || x.uz || i < lines.length - 1));
  };

  const upload = async (files: FileList) => {
    const list = Array.from(files).slice(0, 10 - p.images.length);
    setUploading(list.length);
    for (const f of list) {
      try {
        const fd = new FormData();
        fd.set("file", await compress(f));
        const r = await uploadProductImage(fd);
        if (r.ok && r.url) setP((s) => ({ ...s, images: [...s.images, r.url!] }));
        else flash(r.ok ? "Не удалось загрузить" : r.error);
      } catch (e) {
        flash(e instanceof Error ? e.message : "Не удалось загрузить фото");
      }
      setUploading((n) => n - 1);
    }
  };
  const moveImg = (i: number, d: number) => setP((s) => {
    const a = [...s.images];
    const j = i + d;
    if (j < 0 || j >= a.length) return s;
    [a[i], a[j]] = [a[j], a[i]];
    return { ...s, images: a };
  });

  const submit = () => start(async () => {
    const clean = { ...p, content: { ...p.content, ingredients: p.content.ingredients.filter((i) => i.ru.trim() || i.uz.trim()).map((i) => ({ ru: i.ru.trim(), uz: i.uz.trim() || i.ru.trim() })) } };
    const r = await saveProduct(clean);
    if (!r.ok) { setErrors(r.fields ?? {}); flash(r.error); return; }
    setErrors({});
    flash(r.message ?? "Сохранено");
    if (!p.id && r.id) router.replace(`/admin/products/${r.id}`);
    else router.refresh();
  });

  const e = (k: string) => errors[k];
  const lErr = (k: string) => errors[`content.${k}.${lang}`];
  const uzMissing = (["type", "desc"] as const).some((k) => p.content[k].ru && !p.content[k].uz);

  return (
    <form onSubmit={(ev) => { ev.preventDefault(); submit(); }} className="grid gap-4 px-4 pb-32 md:px-8 lg:grid-cols-[1fr_340px] lg:pb-24">
      <div className="min-w-0 space-y-4">
        <Card className="space-y-3">
          <h2 className="font-bold">Основное</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Бренд" error={e("brand")}>
              <input className={input} list="brands" value={p.brand} onChange={(ev) => { set("brand", ev.target.value); autoSlug(ev.target.value, p.name); }} />
              <datalist id="brands">{brands.map((b) => <option key={b} value={b} />)}</datalist>
            </Field>
            <Field label="Название (как на упаковке, латиницей)" error={e("name")}>
              <input className={input} value={p.name} onChange={(ev) => { set("name", ev.target.value); autoSlug(p.brand, ev.target.value); }} />
            </Field>
            <Field label="Адрес страницы (slug)" error={e("slug")} hint={`/ru/p/${p.slug || "…"}`}>
              <input className={input} value={p.slug} onChange={(ev) => { setSlugTouched(true); set("slug", ev.target.value.toLowerCase()); }} />
            </Field>
            <Field label="Категория" error={e("category")}>
              <select className={input} value={p.category} onChange={(ev) => set("category", ev.target.value)}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name.ru}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-[1fr_100px] gap-2">
              <Field label="Объём" error={e("volume")}><input className={input} inputMode="decimal" value={p.volume} onChange={(ev) => set("volume", Number(ev.target.value.replace(",", ".")) || 0)} /></Field>
              <Field label="Ед."><select className={input} value={p.unit} onChange={(ev) => set("unit", ev.target.value as ProductInputT["unit"])}><option value="ml">мл</option><option value="g">г</option><option value="pcs">шт</option></select></Field>
            </div>
            <Field label="На сколько дней хватает" error={e("daysSupply")} hint="Для напоминания о повторной покупке">
              <input className={input} inputMode="numeric" value={p.daysSupply} onChange={(ev) => set("daysSupply", Number(ev.target.value) || 0)} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">Цена и себестоимость</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Цена, сум" error={e("price")}><input className={input} inputMode="numeric" value={p.price || ""} onChange={(ev) => set("price", num(ev.target.value) ?? 0)} /></Field>
            <Field label="Старая цена" error={e("oldPrice")} hint="Зачёркнутая, если есть скидка"><input className={input} inputMode="numeric" value={p.oldPrice ?? ""} onChange={(ev) => set("oldPrice", num(ev.target.value))} /></Field>
            <Field label="Себестоимость" error={e("costPrice")} hint="Закупка + доставка до склада"><input className={input} inputMode="numeric" value={p.costPrice ?? ""} onChange={(ev) => set("costPrice", num(ev.target.value))} /></Field>
          </div>
          <div className={`rounded-xl px-3 py-2.5 text-[14px] ${margin == null ? "bg-surface text-muted" : margin < 25 ? "bg-[#fde8df] text-warn" : "bg-[#e3f5e6] text-[#2f7a3a]"}`}>
            {margin == null ? "Укажите себестоимость — без неё не посчитать прибыль в сводке" : (
              <>Прибыль с единицы <b className="tabular">{fmtSum(profit)}</b> · маржа <b>{margin}%</b> · с промокодом −10%: <b className="tabular">{fmtSum(promoProfit)}</b>{margin < 25 && " — мало: после комиссии креатора и доставки может уйти в минус"}</>
            )}
          </div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 font-bold">Фото</h2>
            <span className="text-[13px] text-muted">{p.images.length}/10 · первое — главное</span>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {p.images.map((src, i) => (
              <div key={src} className="group relative aspect-square overflow-hidden rounded-xl bg-surface ring-1 ring-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="h-full w-full object-contain" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-ink px-2 py-0.5 text-[11px] text-white">главное</span>}
                <div className="absolute inset-x-1 bottom-1 flex justify-between">
                  <button type="button" aria-label="Левее" disabled={i === 0} onClick={() => moveImg(i, -1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-[13px] shadow disabled:opacity-0">←</button>
                  <button type="button" aria-label="Удалить фото" onClick={() => set("images", p.images.filter((x) => x !== src))} className="grid size-7 place-items-center rounded-full bg-white/90 text-[13px] text-warn shadow">✕</button>
                  <button type="button" aria-label="Правее" disabled={i === p.images.length - 1} onClick={() => moveImg(i, 1)} className="grid size-7 place-items-center rounded-full bg-white/90 text-[13px] shadow disabled:opacity-0">→</button>
                </div>
              </div>
            ))}
            {Array.from({ length: uploading }).map((_, i) => <div key={`u${i}`} className="aspect-square animate-pulse rounded-xl bg-surface" />)}
            {p.images.length + uploading < 10 && (
              <button type="button" onClick={() => fileRef.current?.click()} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-[13px] text-muted hover:border-accent hover:text-accent">
                <span className="text-center"><span className="block text-[26px] leading-none">+</span>Добавить</span>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(ev) => { if (ev.target.files?.length) upload(ev.target.files); ev.target.value = ""; }} />
          <p className="text-[12px] text-muted">Лучше всего — товар на белом или светлом фоне, квадрат. Фото сжимаются автоматически. Только реальные фото товара, без генерации.</p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">Для кого</h2>
          <div><p className="mb-1.5 text-[13px] text-muted">Тип кожи</p><Chips all={SKIN_TYPES} value={p.skin} onChange={(v) => set("skin", v)} /></div>
          <div><p className="mb-1.5 text-[13px] text-muted">Решает проблемы</p><Chips all={CONCERNS} value={p.concerns} onChange={(v) => set("concerns", v)} /></div>
        </Card>

        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <h2 className="flex-1 font-bold">Тексты</h2>
            <div className="flex rounded-full bg-surface p-1 text-[14px]">
              {(["ru", "uz"] as const).map((l) => (
                <button key={l} type="button" onClick={() => setLang(l)} className={`h-8 rounded-full px-4 font-medium ${lang === l ? "bg-white shadow" : "text-muted"}`}>{l === "ru" ? "Русский" : "O‘zbekcha"}</button>
              ))}
            </div>
          </div>
          {uzMissing && lang === "ru" && <p className="rounded-xl bg-[#fff1d6] px-3 py-2 text-[13px] text-[#9a5b00]">Нет перевода на узбекский — на узбекской версии покажем русский текст.</p>}
          <Field label="Тип средства (коротко)" error={lErr("type")} hint="Например: Увлажняющая сыворотка"><input className={input} value={p.content.type[lang]} onChange={(ev) => setL("type", ev.target.value)} /></Field>
          <Field label="Описание" error={lErr("desc")}><textarea className={area} rows={4} value={p.content.desc[lang]} onChange={(ev) => setL("desc", ev.target.value)} /></Field>
          <Field label="Почему его берут" error={lErr("why")} hint="Одна-две фразы о главной пользе"><textarea className={area} rows={2} value={p.content.why[lang]} onChange={(ev) => setL("why", ev.target.value)} /></Field>
          <Field label="Как применять" error={lErr("howTo")}><textarea className={area} rows={3} value={p.content.howTo[lang]} onChange={(ev) => setL("howTo", ev.target.value)} /></Field>
          <Field label="Ключевые компоненты" hint="Каждый с новой строки, например: Ниацинамид 5% — выравнивает тон"><textarea className={area} rows={4} value={ingText} onChange={(ev) => setIng(ev.target.value)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Плашка-рейтинг (необязательно)" hint="Например: №1 в Olive Young"><input className={input} value={p.content.rank?.[lang] ?? ""} onChange={(ev) => setOpt("rank", ev.target.value)} /></Field>
            <Field label="Что говорят в отзывах (необязательно)"><input className={input} value={p.content.reviewSummary?.[lang] ?? ""} onChange={(ev) => setOpt("reviewSummary", ev.target.value)} /></Field>
          </div>
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="space-y-3">
          <h2 className="font-bold">На сайте</h2>
          <label className="flex items-center gap-3 text-[15px]">
            <input type="checkbox" checked={p.active} onChange={(ev) => set("active", ev.target.checked)} className="size-5 accent-[var(--color-accent)]" />
            Показывать на сайте
          </label>
          <Field label="Наличие">
            <select className={input} value={p.stock} onChange={(ev) => set("stock", ev.target.value as ProductInputT["stock"])}>
              <option value="in_stock">В наличии</option><option value="on_order">Под заказ (дольше доставка)</option><option value="out">Нет в наличии</option>
            </select>
          </Field>
          <Field label="Метка">
            <select className={input} value={p.badge ?? ""} onChange={(ev) => set("badge", ev.target.value as ProductInputT["badge"])}>
              <option value="">Без метки</option><option value="hit">Хит</option><option value="choice">Выбор NABI</option><option value="new">Новинка</option>
            </select>
          </Field>
          <Field label="Порядок" hint="Меньше — выше в каталоге" error={e("sort")}><input className={input} inputMode="numeric" value={p.sort} onChange={(ev) => set("sort", Number(ev.target.value) || 0)} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Рейтинг" error={e("rating")}><input className={input} inputMode="decimal" value={p.rating} onChange={(ev) => set("rating", Number(ev.target.value.replace(",", ".")) || 0)} /></Field>
            <Field label="Отзывов" error={e("reviews")}><input className={input} inputMode="numeric" value={p.reviews} onChange={(ev) => set("reviews", Number(ev.target.value) || 0)} /></Field>
          </div>
          <p className="text-[12px] text-muted">Рейтинг и отзывы — только реальные, например с Olive Young; укажите источник в тексте отзывов.</p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-bold">Берут вместе</h2>
          {[0, 1, 2].map((i) => (
            <select key={i} aria-label={`Товар ${i + 1}`} className={input} value={p.fbt[i] ?? ""}
              onChange={(ev) => { const a = [...p.fbt]; a[i] = ev.target.value; set("fbt", a.filter(Boolean)); }}>
              <option value="">—</option>
              {options.filter((o) => o.id === p.fbt[i] || !p.fbt.includes(o.id)).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
          ))}
        </Card>

        {!p.images.length && (
          <Card className="space-y-3">
            <h2 className="font-bold">Заглушка без фото</h2>
            <div className="mx-auto aspect-square w-32 rounded-xl bg-surface p-3"><ProductVisual pack={p.pack as never} color={p.color} brand={p.brand || undefined} /></div>
            <div className="grid grid-cols-[1fr_64px] gap-2">
              <select aria-label="Форма упаковки" className={input} value={p.pack} onChange={(ev) => set("pack", ev.target.value)}>
                {PACKS.map((k) => <option key={k} value={k}>{{ bottle: "Флакон", tube: "Туба", jar: "Баночка", pump: "Помпа", dropper: "Пипетка" }[k]}</option>)}
              </select>
              <input aria-label="Цвет" type="color" value={p.color} onChange={(ev) => set("color", ev.target.value.toUpperCase())} className="h-11 w-full cursor-pointer rounded-xl border border-line bg-white p-1" />
            </div>
          </Card>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-[calc(76px+env(safe-area-inset-bottom,0px))] z-30 px-3 md:bottom-0 md:left-[232px] md:px-8 md:pb-4">
        <div className="flex items-center gap-3 rounded-card bg-ink/95 px-4 py-3 text-white shadow-float backdrop-blur">
          <span className="min-w-0 flex-1 truncate text-[14px]">{Object.keys(errors).length ? <span className="text-[#ffb59a]">Есть ошибки в форме</span> : dirty ? "Есть несохранённые изменения" : "Всё сохранено"}</span>
          <button type="submit" disabled={pending || !dirty || uploading > 0} className="h-10 rounded-full bg-accent px-5 font-semibold disabled:opacity-40">
            {pending ? "Сохраняем…" : p.id ? "Сохранить" : "Создать товар"}
          </button>
        </div>
      </div>
      <Toast text={msg} />
    </form>
  );
}
