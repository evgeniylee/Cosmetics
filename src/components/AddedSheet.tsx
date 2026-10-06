"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { PRODUCTS, getById } from "@/data/catalog";
import { useCartTotals } from "@/lib/useCart";
import { money } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductVisual } from "./ProductVisual";
import { FreeShippingBar } from "./FreeShippingBar";

/** Шторка после добавления в корзину: прогресс до бесплатной доставки и недорогие допродажи. */
export function AddedSheet() {
  const { lang, t } = useI18n();
  const id = useUi((s) => s.addedId);
  const close = useUi((s) => s.setAdded);
  const { cart } = useCartTotals();
  const add = useShop((s) => s.add);
  const pathname = usePathname();

  // Закрываем шторку при переходе на другую страницу.
  useEffect(() => close(null), [pathname, close]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, close]);

  if (!id) return null;
  const p = getById(id);
  if (!p) return null;
  const upsell = PRODUCTS.filter((x) => x.id !== id && !cart[x.id]).sort((a, b) => a.price - b.price).slice(0, 3);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={t.added}>
      <div className="absolute inset-0 bg-ink/30 anim-fade" onClick={() => close(null)} />
      <div className="anim-sheet absolute inset-x-0 bottom-0 mx-auto max-w-[640px] rounded-t-panel bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] md:bottom-6 md:rounded-panel">
        <div className="flex items-center gap-3">
          <span className="grid size-8 place-items-center rounded-full bg-success text-white"><Icon name="check" size={18} /></span>
          <p className="flex-1 font-semibold">{t.added}</p>
          <button type="button" onClick={() => close(null)} aria-label="✕" className="grid size-9 place-items-center rounded-full bg-surface"><Icon name="close" size={18} /></button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface"><ProductVisual pack={p.pack} color={p.color} /></span>
          <span className="min-w-0 flex-1 text-[14px] leading-snug">{p.brand} {p.name}</span>
          <span className="font-bold tabular">{money(p.price, lang)}</span>
        </div>
        <div className="mt-4"><FreeShippingBar /></div>
        <p className="mt-5 text-[14px] font-semibold">{t.addMore}</p>
        <div className="mt-2 grid grid-cols-3 gap-3">
          {upsell.map((u) => (
            <div key={u.id} className="min-w-0">
              <Link href={`/${lang}/p/${u.slug}`} onClick={() => close(null)} className="block aspect-square overflow-hidden rounded-xl bg-surface">
                <ProductVisual pack={u.pack} color={u.color} />
              </Link>
              <p className="mt-1 line-clamp-2 text-[12px] leading-tight">{u.brand} {u.name}</p>
              <button
                type="button"
                onClick={() => { add(u.id); track("add_to_cart", { item_id: u.id, price: u.price, qty: 1, source: "added_sheet" }); }}
                className="mt-1.5 flex h-8 w-full items-center justify-center gap-1 rounded-full bg-surface text-[12px] font-bold tabular"
              >
                <Icon name="plus" size={14} /> {money(u.price, lang)}
              </button>
            </div>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => close(null)} className="h-12 rounded-card bg-surface font-semibold">{t.continueShopping}</button>
          <Link href={`/${lang}/cart`} onClick={() => close(null)} className="grid h-12 place-items-center rounded-card bg-accent font-semibold text-white">{t.checkout}</Link>
        </div>
      </div>
    </div>
  );
}
