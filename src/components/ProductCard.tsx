"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { discountPct, money, unitPrice, volumeLabel } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useHydrated, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductVisual";
import { cartKey, defaultVariant, hasPriceRange, withVariant } from "@/lib/variants";

export function Badge({ p }: { p: Product }) {
  const { t } = useI18n();
  const pct = discountPct(p);
  if (pct) return <span className="absolute left-3 top-3 grid size-11 place-items-center rounded-full bg-accent text-[13px] font-bold text-white tabular md:size-[52px] md:text-[15px]">−{pct}%</span>;
  if (p.badge === "hit") return <span className="absolute left-3 top-3 rounded-full bg-hit px-2.5 py-0.5 text-[12px] font-semibold uppercase text-white">{t.hit}</span>;
  if (p.badge === "choice") return <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-0.5 text-[12px] font-semibold text-white">{t.choice}</span>;
  if (p.badge === "new") return <span className="absolute left-3 top-3 rounded-full bg-white px-2.5 py-0.5 text-[12px] font-semibold text-ink">{t.isNew}</span>;
  return null;
}

export function FavButton({ id, className = "" }: { id: string; className?: string }) {
  const { t } = useI18n();
  const hydrated = useHydrated();
  const fav = useShop((s) => s.favorites.includes(id));
  const toggle = useShop((s) => s.toggleFav);
  const on = hydrated && fav;
  const [pop, setPop] = useState(0);
  return (
    <button
      type="button"
      aria-label={t.favorites}
      aria-pressed={on}
      onClick={(e) => { e.preventDefault(); toggle(id); if (!on) { track("wishlist_add", { item_id: id }); setPop((n) => n + 1); } }}
      className={`grid size-9 place-items-center rounded-full transition hover:bg-white/70 active:scale-90 ${on ? "text-accent" : "text-ink/45"} ${className}`}
    >
      <span key={pop} className={pop ? "heart-pop" : ""}><Icon name="heart" size={21} fill={on} /></span>
    </button>
  );
}

/** Ценник, который является кнопкой «в корзину». После добавления превращается в счётчик. */
export function PriceButton({ p, source, size = "md", quiet = false }: { p: Product; source: string; size?: "md" | "lg"; /** без шторки «Добавлено» (например, поверх видео) */ quiet?: boolean }) {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  // Ключ корзины: товар или товар с вариантом (выбранным или по умолчанию).
  const key = cartKey(p.id, p.variant?.id ?? defaultVariant(p)?.id);
  const qty = useShop((s) => s.cart[key] || 0);
  const add = useShop((s) => s.add);
  const setQty = useShop((s) => s.setQty);
  const setAdded = useUi((s) => s.setAdded);
  const pct = discountPct(p);
  const h = size === "lg" ? "h-12" : "h-10 md:h-11";

  if (hydrated && qty > 0) {
    return (
      <div className={`flex ${h} w-fit items-center rounded-full bg-accent text-white`}>
        <button type="button" aria-label="−" className="grid h-full w-10 place-items-center" onClick={() => { setQty(key, qty - 1); track("remove_from_cart", { item_id: p.id }); }}>
          <Icon name="minus" size={18} />
        </button>
        <span className="min-w-6 text-center font-bold tabular">{qty}</span>
        <button type="button" aria-label="+" className="grid h-full w-10 place-items-center" onClick={() => { add(key); track("add_to_cart", { item_id: p.id, price: p.price, qty: 1, source }); }}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    );
  }

  // Объёмы с разной ценой: из карточки ведём выбирать объём, а не кладём «какой-то».
  if (!p.variant && hasPriceRange(p))
    return (
      <Link href={`/${lang}/p/${p.slug}`} onClick={() => track("select_item", { item_id: p.id, source })} className={`flex ${h} w-fit items-center gap-1.5 rounded-full bg-surface px-3.5 transition hover:bg-ink hover:text-white`}>
        <span className="text-[14px] text-ink/60">{lang === "ru" ? "от" : "dan"}</span>
        <span className="text-[15px] font-bold tabular md:text-[17px]">{money(p.price, lang)}</span>
      </Link>
    );

  const onAdd = () => {
    if (p.stock === "out") return;
    add(key);
    if (!quiet) setAdded(key);
    track("add_to_cart", { item_id: p.id, price: p.price, qty: 1, source });
  };

  if (pct) {
    return (
      <button type="button" onClick={onAdd} className={`group flex ${h} w-fit max-w-full items-center rounded-full bg-accent-soft pl-3 text-accent transition hover:brightness-95 active:scale-95`}>
        <Icon name="bag" size={18} className="hidden shrink-0 min-[400px]:block" />
        <span className="whitespace-nowrap text-[14px] font-bold tabular min-[400px]:ml-1.5 md:text-[17px]">{money(p.price, lang)}</span>
        <span className="ml-1.5 hidden whitespace-nowrap text-[12px] text-accent/55 line-through tabular lg:inline">{money(p.oldPrice!, lang)}</span>
        <span className="ml-1.5 grid h-full shrink-0 place-items-center rounded-full bg-accent px-2 text-[13px] font-bold text-white md:ml-2 md:px-2.5 md:text-[16px]">−{pct}%</span>
      </button>
    );
  }
  return (
    <button type="button" onClick={onAdd} className={`flex ${h} w-fit items-center gap-1.5 rounded-full bg-surface px-3.5 transition hover:bg-ink hover:text-white active:scale-95`}>
      <Icon name="bag" size={18} />
      <span className="text-[15px] font-bold tabular md:text-[17px]">{money(p.price, lang)}</span>
    </button>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-accent">
      <Icon name="star" size={size} fill strokeWidth={0} />
      <span className="font-semibold tabular">{value.toFixed(1)}</span>
    </span>
  );
}

/** Для объёмов: самая выгодная цена за мл среди вариантов («от 780 сум / мл»). */
function bestUnitPrice(p: Product, lang: "ru" | "uz") {
  const best = (p.variants ?? []).filter((v) => v.price && v.volume && v.stock !== "out").sort((a, b) => a.price! / a.volume! - b.price! / b.volume!)[0];
  if (!best) return unitPrice(p, lang);
  return `${lang === "ru" ? "от" : "dan"} ${unitPrice({ ...p, price: best.price!, volume: best.volume! }, lang)}`;
}

/** Кружки оттенков поверх фото: нажатие меняет фото в карточке, «+N» ведёт на страницу товара. */
function Swatches({ p, sel, onPick, href }: { p: Product; sel: string | undefined; onPick: (id: string) => void; href: string }) {
  const { lang } = useI18n();
  const router = useRouter();
  const all = p.variants ?? [];
  const extraMobile = Math.max(0, all.length - 5);
  const extraDesk = Math.max(0, all.length - 6);
  return (
    <div className="absolute inset-x-2 bottom-2 flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-1 backdrop-blur md:gap-1.5" onClick={(e) => e.preventDefault()}>
      {all.slice(0, 6).map((v, i) => (
        <button
          key={v.id}
          type="button"
          aria-label={v.name[lang] || v.name.ru}
          title={v.name[lang] || v.name.ru}
          aria-pressed={sel === v.id}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPick(v.id); }}
          className={`relative size-6 shrink-0 rounded-full ring-1 ring-ink/15 transition md:size-7 ${i === 5 ? "hidden md:block" : ""} ${sel === v.id ? "outline outline-2 outline-offset-2 outline-ink" : ""}`}
          style={{ background: v.hex ?? "#ddd" }}
        >
          {v.stock === "out" && <span className="absolute left-1/2 top-1/2 h-px w-[130%] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-ink/60" />}
        </button>
      ))}
      {/* Внутри ссылки карточки нельзя вложить вторую ссылку — переходим программно */}
      {extraMobile > 0 && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(href); }} className="ml-0.5 text-[13px] font-semibold text-accent underline md:hidden">+{extraMobile}</button>}
      {extraDesk > 0 && <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(href); }} className="ml-0.5 hidden text-[13px] font-semibold text-accent underline md:inline">+{extraDesk}</button>}
    </div>
  );
}

export function ProductCard({ p: base, source }: { p: Product; source: string }) {
  const { lang, t } = useI18n();
  const shades = base.variantKind === "shade" && (base.variants?.length ?? 0) > 0;
  const volumes = base.variantKind === "volume" && (base.variants?.length ?? 0) > 1;
  const [sel, setSel] = useState<string | undefined>(() => defaultVariant(base)?.id);
  const p = shades ? withVariant(base, sel) : base;
  const href = `/${lang}/p/${p.slug}${shades && sel ? `?v=${sel}` : ""}`;
  return (
    <article className="flex min-w-0 flex-col">
      <Link
        href={href}
        onClick={() => track("select_item", { item_id: p.id, source })}
        className="group relative block aspect-square overflow-hidden rounded-card bg-surface"
      >
        <div className="h-full w-full p-[7%] transition duration-300 group-hover:scale-[1.04]">
          <ProductImage p={p} />
        </div>
        <Badge p={p} />
        <FavButton id={p.id} className="absolute right-2 top-2" />
        {shades && <Swatches p={base} sel={sel} onPick={(id) => { setSel(id); track("variant_preview", { item_id: p.id, variant: id, source }); }} href={href} />}
        {volumes && (
          <span className="absolute bottom-2 left-2 max-w-[calc(100%-16px)] truncate rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-medium backdrop-blur">
            {base.variants!.map((v) => volumeLabel({ ...base, volume: v.volume ?? base.volume }, lang)).join(" · ")}
          </span>
        )}
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <span className="truncate text-[13px] text-ink/70 md:text-[14px]">{shades && p.variant ? `${p.type[lang]} · ${p.variant.name[lang] || p.variant.name.ru}` : p.type[lang]}</span>
        <Link href={href} className="line-clamp-2 min-h-[2.75em] text-[15px] font-medium leading-snug md:text-[17px]">
          {p.brand} {p.name}
        </Link>
        <div className="flex min-h-5 flex-wrap items-center gap-x-2 text-[13px]">
          {p.reviews >= 3 && (
            <>
              <Stars value={p.rating} />
              <span className="text-muted">{t.reviewsCount(p.reviews)}</span>
            </>
          )}
        </div>
        <span className="text-[12px] text-muted tabular">{volumes && hasPriceRange(base) ? bestUnitPrice(base, lang) : unitPrice(p, lang)}</span>
        <div className="mt-auto pt-2">
          {p.stock === "out" ? (
            <span className="inline-flex h-10 items-center rounded-full bg-surface px-3.5 text-[14px] text-muted md:h-11">{lang === "ru" ? "Нет в наличии" : "Mavjud emas"}</span>
          ) : (
            <PriceButton p={p} source={source} />
          )}
        </div>
      </div>
    </article>
  );
}
