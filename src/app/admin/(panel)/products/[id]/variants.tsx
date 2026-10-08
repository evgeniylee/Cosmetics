"use client";
// Варианты товара в админке: оттенки (цвет + фото, цена общая) или объёмы (объём + своя цена).
import { useRef, useState } from "react";
import type { ProductInputT, VariantInputT } from "@/server/product-schema";
import { compressImage } from "@/lib/compress-image";
import { fmtSum } from "@/lib/admin-format";
import { uploadProductImage } from "../../actions";
import { Card } from "../../ui";

type Kind = ProductInputT["variantKind"];
const input = "h-10 w-full rounded-lg border border-line bg-white px-2.5 text-[14px] outline-none focus:border-accent";
const UNIT: Record<string, string> = { ml: "мл", g: "г", pcs: "шт" };

function VariantPhotos({ images, onChange, error }: { images: string[]; onChange: (v: string[]) => void; error?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const upload = async (files: FileList) => {
    const list = Array.from(files).slice(0, 8 - images.length);
    setBusy(list.length);
    let acc = images;
    for (const f of list) {
      try {
        const fd = new FormData();
        fd.set("file", await compressImage(f));
        const r = await uploadProductImage(fd);
        if (r.ok && r.url) { acc = [...acc, r.url]; onChange(acc); } else setErr(r.ok ? "Не удалось загрузить" : r.error);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Не удалось загрузить");
      }
      setBusy((n) => n - 1);
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {images.map((src, i) => (
          <div key={src} className="relative size-14 overflow-hidden rounded-lg bg-surface ring-1 ring-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-contain" />
            <button type="button" aria-label="Удалить фото" onClick={() => onChange(images.filter((x) => x !== src))} className="absolute right-0.5 top-0.5 grid size-5 place-items-center rounded-full bg-white/90 text-[11px] text-warn shadow">✕</button>
            {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-ink/70 text-center text-[9px] text-white">главное</span>}
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => <div key={i} className="size-14 animate-pulse rounded-lg bg-surface" />)}
        {images.length + busy < 8 && (
          <button type="button" onClick={() => ref.current?.click()} className={`grid size-14 place-items-center rounded-lg border-2 border-dashed text-[20px] text-muted hover:border-accent hover:text-accent ${error ? "border-warn" : "border-line"}`}>+</button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files?.length) upload(e.target.files); e.target.value = ""; }} />
      {(error || err) && <p className="mt-1 text-[12px] text-warn">{error || err}</p>}
    </div>
  );
}

export function VariantsEditor({ kind, variants, unit, onKind, onChange, errors }: {
  kind: Kind; variants: VariantInputT[]; unit: string; onKind: (k: Kind) => void; onChange: (v: VariantInputT[]) => void; errors: Record<string, string>;
}) {
  const set = (i: number, patch: Partial<VariantInputT>) => onChange(variants.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const move = (i: number, d: number) => {
    const a = [...variants];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  const blank = (): VariantInputT =>
    kind === "shade"
      ? { name: { ru: "", uz: "" }, hex: "#D9A08F", images: [], stock: "in_stock" }
      : { name: { ru: "", uz: "" }, volume: null, price: null, oldPrice: null, costPrice: null, images: [], stock: "in_stock" };
  const e = (i: number, k: string) => errors[`variants.${i}.${k}`];

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 font-bold">Варианты</h2>
        <div className="flex rounded-full bg-surface p-1 text-[13px]">
          {([["", "Без вариантов"], ["shade", "Оттенки"], ["volume", "Объёмы"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => { if (k !== kind) { onKind(k); onChange([]); } }} className={`h-8 rounded-full px-3 font-medium ${kind === k ? "bg-white shadow" : "text-muted"}`}>{l}</button>
          ))}
        </div>
      </div>
      {kind === "" && <p className="text-[13px] text-muted">Если у товара есть разные цвета (тинты, кушоны) или объёмы (150 и 500 мл) — выберите тип. Каждый вариант будет отдельной позицией в корзине и заказе.</p>}
      {kind === "shade" && <p className="text-[13px] text-muted">Цена у всех оттенков общая — из блока «Цена». У каждого оттенка обязательны цвет кружка и фото: по нему покупатель видит цвет.</p>}
      {kind === "volume" && <p className="text-[13px] text-muted">У каждого объёма своя цена. В каталоге покажем «от» самой низкой цены, цена товара подставится сама.</p>}
      {errors["variants"] && <p className="text-[13px] text-warn">{errors["variants"]}</p>}

      {kind && (
        <ul className="space-y-2">
          {variants.map((v, i) => (
            <li key={v.id ?? `new-${i}`} className="rounded-xl bg-surface/70 p-3 ring-1 ring-line">
              <div className="flex flex-wrap items-start gap-2">
                {kind === "shade" ? (
                  <label className="shrink-0" title="Цвет кружка">
                    <input type="color" aria-label="Цвет оттенка" value={v.hex ?? "#D9A08F"} onChange={(ev) => set(i, { hex: ev.target.value.toUpperCase() })} className="size-10 cursor-pointer rounded-full border-0 bg-transparent p-0" />
                  </label>
                ) : (
                  <div className="w-24 shrink-0">
                    <input aria-label="Объём" inputMode="decimal" placeholder={`Объём, ${UNIT[unit] ?? unit}`} value={v.volume ?? ""}
                      onChange={(ev) => { const vol = Number(ev.target.value.replace(",", ".")) || null; set(i, { volume: vol, name: { ru: vol ? `${vol} ${UNIT[unit] ?? unit}` : "", uz: vol ? `${vol} ${unit === "ml" ? "ml" : unit === "g" ? "g" : "dona"}` : "" } }); }}
                      className={`${input} ${e(i, "volume") ? "border-warn" : ""}`} />
                  </div>
                )}
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
                  <input aria-label="Название (рус.)" placeholder={kind === "shade" ? "Название: 01 Peach" : "Подпись: 150 мл"} value={v.name.ru} onChange={(ev) => set(i, { name: { ...v.name, ru: ev.target.value } })} className={`${input} ${errors[`variants.${i}.name.ru`] ? "border-warn" : ""}`} />
                  <input aria-label="Название (узб.)" placeholder="O‘zbekcha (необязательно)" value={v.name.uz} onChange={(ev) => set(i, { name: { ...v.name, uz: ev.target.value } })} className={input} />
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-10 place-items-center rounded-lg bg-white text-[13px] disabled:opacity-30">↑</button>
                  <button type="button" aria-label="Ниже" disabled={i === variants.length - 1} onClick={() => move(i, 1)} className="grid size-10 place-items-center rounded-lg bg-white text-[13px] disabled:opacity-30">↓</button>
                  <button type="button" aria-label="Удалить вариант" onClick={() => onChange(variants.filter((_, j) => j !== i))} className="grid size-10 place-items-center rounded-lg bg-white text-warn">✕</button>
                </div>
              </div>

              <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr]">
                {kind === "volume" && (
                  <>
                    <label className="text-[12px] text-muted">Цена<input inputMode="numeric" value={v.price ?? ""} onChange={(ev) => set(i, { price: Number(ev.target.value.replace(/\s/g, "")) || null })} className={`${input} mt-0.5 ${e(i, "price") ? "border-warn" : ""}`} /></label>
                    <label className="text-[12px] text-muted">Старая цена<input inputMode="numeric" value={v.oldPrice ?? ""} onChange={(ev) => set(i, { oldPrice: Number(ev.target.value.replace(/\s/g, "")) || null })} className={`${input} mt-0.5 ${e(i, "oldPrice") ? "border-warn" : ""}`} /></label>
                  </>
                )}
                <label className="text-[12px] text-muted">Себестоимость<input inputMode="numeric" value={v.costPrice ?? ""} placeholder={kind === "shade" ? "как у товара" : ""} onChange={(ev) => set(i, { costPrice: ev.target.value === "" ? null : Number(ev.target.value.replace(/\s/g, "")) })} className={`${input} mt-0.5`} /></label>
                <label className="text-[12px] text-muted">Наличие
                  <select value={v.stock} onChange={(ev) => set(i, { stock: ev.target.value as VariantInputT["stock"] })} className={`${input} mt-0.5`}>
                    <option value="in_stock">В наличии</option><option value="on_order">Под заказ</option><option value="out">Нет</option>
                  </select>
                </label>
                <label className="text-[12px] text-muted">Артикул / штрихкод<input value={v.sku ?? ""} onChange={(ev) => set(i, { sku: ev.target.value || null })} className={`${input} mt-0.5`} /></label>
              </div>
              {kind === "volume" && v.price && v.costPrice ? <p className="mt-1 text-[12px] text-muted">Маржа {Math.round(((v.price - v.costPrice) / v.price) * 100)}% · прибыль {fmtSum(v.price - v.costPrice)}</p> : null}

              <div className="mt-2">
                <p className="mb-1 text-[12px] text-muted">{kind === "shade" ? "Фото оттенка (обязательно): упаковка, мазок, на коже" : "Фото этого объёма (необязательно)"}</p>
                <VariantPhotos images={v.images} onChange={(imgs) => set(i, { images: imgs })} error={e(i, "images")} />
              </div>
              {(e(i, "hex") || errors[`variants.${i}.name.ru`] || e(i, "volume") || e(i, "price") || e(i, "oldPrice")) && (
                <p className="mt-1 text-[12px] text-warn">{e(i, "hex") || errors[`variants.${i}.name.ru`] || e(i, "volume") || e(i, "price") || e(i, "oldPrice")}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {kind && variants.length < 40 && (
        <button type="button" onClick={() => onChange([...variants, blank()])} className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white">
          + {kind === "shade" ? "Оттенок" : "Объём"}
        </button>
      )}
    </Card>
  );
}
