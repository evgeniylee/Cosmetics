"use client";
import Link from "next/link";
import { useState } from "react";
import { SAMPLES } from "@/data/catalog";
import { CITIES, CREATOR_CODES, SAMPLES_FROM, money } from "@/lib/shop";
import { useCartTotals } from "@/lib/useCart";
import { track } from "@/lib/analytics";
import { useShop } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { FreeShippingBar } from "./FreeShippingBar";
import { ProductVisual } from "./ProductVisual";

export function Summary({ cta }: { cta?: React.ReactNode }) {
  const { lang, t } = useI18n();
  const { subtotal, discount, discountSource, delivery, total } = useCartTotals();
  return (
    <div className="space-y-2 text-[15px]">
      <div className="flex justify-between"><span>{t.subtotal}</span><span className="tabular">{money(subtotal, lang)}</span></div>
      {discount > 0 && <div className="flex justify-between text-success"><span>{t.discount} {discountSource}</span><span className="tabular">−{money(discount, lang)}</span></div>}
      <div className="flex justify-between"><span>{t.delivery}</span><span className="tabular">{delivery ? money(delivery, lang) : t.free}</span></div>
      <div className="flex justify-between border-t border-line pt-3 text-[20px] font-bold"><span>{t.total}</span><span className="tabular">{money(total, lang)}</span></div>
      {cta}
    </div>
  );
}

export function PromoField() {
  const { t } = useI18n();
  const promo = useShop((s) => s.promo);
  const setPromo = useShop((s) => s.setPromo);
  const { hydrated } = useCartTotals();
  const [value, setValue] = useState("");
  const [err, setErr] = useState(false);
  const active = hydrated ? promo : null;
  const apply = () => {
    const code = value.trim().toUpperCase();
    if (!code) return;
    const ok = !!CREATOR_CODES[code];
    track("promo_apply", { code, success: ok, error_reason: ok ? null : "not_found" });
    if (ok) { setPromo(code); setErr(false); setValue(""); } else setErr(true);
  };
  return (
    <div>
      <label htmlFor="promo" className="text-[14px] font-semibold">{t.promo}</label>
      {active ? (
        <div className="mt-2 flex items-center justify-between rounded-xl bg-accent-soft px-3 py-2.5 text-[14px] text-accent">
          <span>{t.promoOk(active)}</span>
          <button type="button" onClick={() => setPromo(null)} aria-label={t.remove}><Icon name="close" size={16} /></button>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <input id="promo" value={value} onChange={(e) => { setValue(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && apply()} placeholder="MADINA" className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 font-semibold uppercase tracking-wider outline-none focus:border-accent" />
          <button type="button" onClick={apply} className="h-11 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white">{t.promoApply}</button>
        </div>
      )}
      {err && <p className="mt-1.5 text-[13px] text-warn">{t.promoNotFound}</p>}
      <p className="mt-1.5 text-[12px] text-muted">{t.promoOne}</p>
    </div>
  );
}

export function Cart() {
  const { lang, t } = useI18n();
  const { hydrated, lines, afterDiscount, city } = useCartTotals();
  const setQty = useShop((s) => s.setQty);
  const setCity = useShop((s) => s.setCity);
  const samples = useShop((s) => s.samples);
  const toggleSample = useShop((s) => s.toggleSample);

  if (!hydrated) return <div className="wrap h-[50vh]" />;

  if (lines.length === 0)
    return (
      <div className="wrap py-16 text-center">
        <h1 className="h-section">{t.cartEmpty}</h1>
        <p className="mt-3 text-ink/70">{t.cartEmptyText}</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/${lang}/catalog?sort=popular`} className="grid h-12 place-items-center rounded-card bg-accent px-6 font-semibold text-white">{t.hits}</Link>
          <Link href={`/${lang}/quiz`} className="grid h-12 place-items-center rounded-card bg-surface px-6 font-semibold">{t.heroCta}</Link>
        </div>
      </div>
    );

  const samplesOpen = afterDiscount >= SAMPLES_FROM;

  return (
    <div className="wrap pt-6 md:pt-10">
      <h1 className="h-section">{t.cart}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_400px] md:gap-12">
        <div className="min-w-0 space-y-6">
          <FreeShippingBar />
          <ul className="divide-y divide-line">
            {lines.map(({ p, qty }) => (
              <li key={p.id} className="flex gap-3 py-4 md:gap-5">
                <Link href={`/${lang}/p/${p.slug}`} className="size-24 shrink-0 overflow-hidden rounded-card bg-surface md:size-28"><ProductVisual pack={p.pack} color={p.color} /></Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/${lang}/p/${p.slug}`} className="line-clamp-2 text-[15px] font-medium leading-snug">{p.brand} {p.name}</Link>
                  <span className="text-[13px] text-muted">{p.type[lang]}</span>
                  <div className="mt-auto flex items-center gap-3 pt-2">
                    <div className="flex h-10 items-center rounded-full bg-surface">
                      <button type="button" aria-label="−" onClick={() => setQty(p.id, qty - 1)} className="grid h-full w-10 place-items-center"><Icon name="minus" size={16} /></button>
                      <span className="min-w-5 text-center font-semibold tabular">{qty}</span>
                      <button type="button" aria-label="+" onClick={() => setQty(p.id, qty + 1)} className="grid h-full w-10 place-items-center"><Icon name="plus" size={16} /></button>
                    </div>
                    <button type="button" onClick={() => { setQty(p.id, 0); track("remove_from_cart", { item_id: p.id }); }} aria-label={t.remove} className="text-muted hover:text-ink"><Icon name="trash" size={20} /></button>
                    <span className="ml-auto font-bold tabular">{money(p.price * qty, lang)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <section className="rounded-panel bg-surface p-5">
            <p className="flex items-center gap-2 font-semibold"><Icon name="gift" size={20} className="text-accent" /> {t.samplesTitle}</p>
            {samplesOpen ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {SAMPLES.map((s) => {
                  const on = samples.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSample(s.id)} disabled={!on && samples.length >= 2} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[14px] disabled:opacity-40 ${on ? "border-accent bg-white text-accent" : "border-transparent bg-white"}`}>
                      <span className={`grid size-5 place-items-center rounded-md border ${on ? "border-accent bg-accent text-white" : "border-line"}`}>{on && <Icon name="check" size={14} />}</span>
                      {s.name[lang]}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="mt-1 text-[14px] text-ink/70">{t.samplesLocked(money(SAMPLES_FROM - afterDiscount, lang))}</p>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-5 md:sticky md:top-28 md:self-start">
          <div className="space-y-5 rounded-panel p-5 shadow-float ring-1 ring-line md:p-6">
            <div>
              <label htmlFor="cart-city" className="text-[14px] font-semibold">{t.coCity}</label>
              <select id="cart-city" value={city} onChange={(e) => setCity(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-line bg-white px-3 outline-none">
                {CITIES.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
              </select>
            </div>
            <PromoField />
            <Summary
              cta={
                <Link href={`/${lang}/checkout`} onClick={() => track("begin_checkout", { items_count: lines.length })} className="mt-3 grid h-14 place-items-center rounded-card bg-accent text-[16px] font-semibold text-white hover:bg-accent-dark">
                  {t.checkout}
                </Link>
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
