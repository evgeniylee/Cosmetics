"use client";
import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/data/catalog";
import { discountPct, money, unitPrice } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useHydrated, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductVisual } from "./ProductVisual";

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
export function PriceButton({ p, source, size = "md" }: { p: Product; source: string; size?: "md" | "lg" }) {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  const qty = useShop((s) => s.cart[p.id] || 0);
  const add = useShop((s) => s.add);
  const setQty = useShop((s) => s.setQty);
  const setAdded = useUi((s) => s.setAdded);
  const pct = discountPct(p);
  const h = size === "lg" ? "h-12" : "h-10 md:h-11";

  if (hydrated && qty > 0) {
    return (
      <div className={`flex ${h} w-fit items-center rounded-full bg-accent text-white`}>
        <button type="button" aria-label="−" className="grid h-full w-10 place-items-center" onClick={() => { setQty(p.id, qty - 1); track("remove_from_cart", { item_id: p.id }); }}>
          <Icon name="minus" size={18} />
        </button>
        <span className="min-w-6 text-center font-bold tabular">{qty}</span>
        <button type="button" aria-label="+" className="grid h-full w-10 place-items-center" onClick={() => { add(p.id); track("add_to_cart", { item_id: p.id, price: p.price, qty: 1, source }); }}>
          <Icon name="plus" size={18} />
        </button>
      </div>
    );
  }

  const onAdd = () => {
    add(p.id);
    setAdded(p.id);
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

export function ProductCard({ p, source }: { p: Product; source: string }) {
  const { lang, t } = useI18n();
  return (
    <article className="flex min-w-0 flex-col">
      <Link
        href={`/${lang}/p/${p.slug}`}
        onClick={() => track("select_item", { item_id: p.id, source })}
        className="group relative block aspect-square overflow-hidden rounded-card bg-surface"
      >
        <div className="h-full w-full transition duration-300 group-hover:scale-[1.04]">
          <ProductVisual pack={p.pack} color={p.color} brand={p.brand} />
        </div>
        <Badge p={p} />
        <FavButton id={p.id} className="absolute right-2 top-2" />
      </Link>
      <div className="mt-3 flex flex-1 flex-col gap-1">
        <span className="text-[13px] text-ink/70 md:text-[14px]">{p.type[lang]}</span>
        <Link href={`/${lang}/p/${p.slug}`} className="line-clamp-2 text-[15px] font-medium leading-snug md:text-[17px]">
          {p.brand} {p.name}
        </Link>
        <div className="flex flex-wrap items-center gap-x-2 text-[13px]">
          {p.reviews >= 3 && (
            <>
              <Stars value={p.rating} />
              <span className="text-muted">{t.reviewsCount(p.reviews)}</span>
            </>
          )}
        </div>
        <span className="text-[12px] text-muted tabular">{unitPrice(p, lang)}</span>
        <div className="mt-auto pt-2">
          <PriceButton p={p} source={source} />
        </div>
      </div>
    </article>
  );
}
