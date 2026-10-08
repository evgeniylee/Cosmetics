"use client";
import { brandSlug } from "@/lib/slug";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CONCERNS, SKIN_TYPES, type Product } from "@/data/catalog";
import { useCatalog } from "./CatalogProvider";
import { catName } from "@/lib/search";
import { fmtCountdown, money, msToCutoff, unitPrice, volumeLabel } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useHydrated, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { Badge, FavButton, PriceButton, ProductCard, Stars } from "./ProductCard";
import { ProductImage } from "./ProductVisual";
import { Rail } from "./Section";

function DeliveryPromise() {
  const { lang, t } = useI18n();
  const hydrated = useHydrated();
  const city = useShop((s) => s.city);
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    setMs(msToCutoff());
    const id = setInterval(() => setMs(msToCutoff()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (!hydrated || ms === null) return <div className="h-5" />;
  if (city !== "tashkent") return <p className="flex items-center gap-2 text-[14px]"><Icon name="truck" size={18} /> {t.deliveryRegions}</p>;
  return (
    <p className="flex items-center gap-2 text-[14px] text-success">
      <Icon name="truck" size={18} />
      {ms > 0 ? t.deliveryPromise(fmtCountdown(ms, lang)) : t.deliveryPromiseLate}
    </p>
  );
}

function Accordion({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group border-b border-line py-1">
      <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[17px] font-semibold md:text-[20px]">
        {title}
        <Icon name="plus" size={22} className="transition group-open:rotate-45" />
      </summary>
      <div className="pb-5 text-[15px] leading-relaxed text-ink/80">{children}</div>
    </details>
  );
}

function FrequentlyBought({ p }: { p: Product }) {
  const { lang, t } = useI18n();
  const add = useShop((s) => s.add);
  const setAdded = useUi((s) => s.setAdded);
  const { byId } = useCatalog();
  const items = [p, ...p.fbt.map((id) => byId(id)!).filter(Boolean)];
  const [sel, setSel] = useState<string[]>(items.map((i) => i.id));
  const total = items.filter((i) => sel.includes(i.id)).reduce((a, i) => a + i.price, 0);
  return (
    <section className="rounded-panel border border-line p-5 md:p-8">
      <h2 className="text-[22px] font-bold md:text-[28px]">{t.fbt}</h2>
      <ul className="mt-4 space-y-3">
        {items.map((i) => (
          <li key={i.id} className="flex items-center gap-3">
            <input
              id={`fbt-${i.id}`}
              type="checkbox"
              checked={sel.includes(i.id)}
              onChange={() => setSel((s) => (s.includes(i.id) ? s.filter((x) => x !== i.id) : [...s, i.id]))}
              className="size-5 accent-[var(--color-accent)]"
            />
            <label htmlFor={`fbt-${i.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
              <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface"><ProductImage p={i} brand={false} /></span>
              <span className="min-w-0 flex-1 text-[14px] leading-snug">{i.brand} {i.name}</span>
              <span className="shrink-0 font-semibold tabular">{money(i.price, lang)}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <p className="text-[15px]">{t.fbtTotal}: <span className="text-[20px] font-bold tabular">{money(total, lang)}</span></p>
        <button
          type="button"
          disabled={!sel.length}
          onClick={() => {
            sel.forEach((id) => add(id));
            setAdded(p.id);
            track("fbt_add", { item_id: p.id, count: sel.length, value: total });
          }}
          className="ml-auto h-12 rounded-card bg-ink px-5 font-semibold text-white disabled:opacity-40"
        >
          {t.fbtAdd(sel.length)}
        </button>
      </div>
    </section>
  );
}

const DEMO_REVIEWS = [
  { name: "Нигора", skin: "combo", stars: 5, text: { ru: "Пользуюсь второй месяц, кожа заметно спокойнее. Упаковка пришла как подарок, приятно.", uz: "Ikkinchi oy ishlataman, teri ancha tinchlandi." }, helpful: 12 },
  { name: "Дильноза", skin: "dry", stars: 5, text: { ru: "Привезли на следующий день, срок годности до 2028. Буду брать ещё.", uz: "Ertasi kuni olib kelishdi, muddati 2028 gacha." }, helpful: 7 },
  { name: "Камила", skin: "oily", stars: 4, text: { ru: "Хорошо, но на моей жирной коже к вечеру немного блестит.", uz: "Yaxshi, lekin yog'li terimda kechga yaltiraydi." }, helpful: 3 },
];

export function ProductDetail({ p }: { p: Product }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const viewed = useShop((s) => s.viewed);
  const add = useShop((s) => s.add);
  const { products } = useCatalog();
  const [shot, setShot] = useState(0);
  const buyRef = useRef<HTMLDivElement>(null);
  const [sticky, setSticky] = useState(false);

  useEffect(() => {
    viewed(p.id);
    track("view_item", { item_id: p.id, price: p.price, category: p.cat });
  }, [p.id, p.price, p.cat, viewed]);

  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setSticky(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const similar = products.filter((x) => x.id !== p.id && (x.cat === p.cat || x.concerns.some((c) => p.concerns.includes(c)))).slice(0, 8);
  const compare = [p, ...products.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 2)];
  const dist = [5, 4, 3, 2, 1].map((s) => ({ s, pct: s === 5 ? 78 : s === 4 ? 15 : s === 3 ? 5 : 1 }));

  const buyNow = () => {
    add(p.id);
    track("buy_now_click", { item_id: p.id });
    router.push(`/${lang}/checkout`);
  };

  return (
    <div className="wrap pt-4 md:pt-8">
      <nav className="text-[13px] text-muted">
        <Link href={`/${lang}`}>{t.home}</Link> / <Link href={`/${lang}/catalog`}>{t.catalog}</Link> / <Link href={`/${lang}/catalog?cat=${p.cat}`}>{catName(p.cat, lang)}</Link>
      </nav>

      <div className="mt-4 grid gap-6 md:grid-cols-[1.05fr_1fr] md:gap-12">
        {/* Галерея */}
        <div className="md:sticky md:top-28 md:self-start">
          <div className="relative aspect-square overflow-hidden rounded-panel bg-surface">
            <div key={shot} className="anim-fade h-full w-full p-[6%]"><ProductImage p={p} index={shot} /></div>
            <Badge p={p} />
          </div>
          {(p.images?.length ?? 0) > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {p.images!.map((src, i) => (
                <button key={src} type="button" onClick={() => { setShot(i); track("gallery_swipe", { item_id: p.id, index: i }); }} aria-label={`${i + 1}`} className={`size-[72px] shrink-0 overflow-hidden rounded-2xl bg-surface p-1.5 transition ${i === shot ? "ring-2 ring-accent" : "opacity-80 hover:opacity-100"}`}>
                  <ProductImage p={p} index={i} brand={false} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Информация и покупка */}
        <div className="min-w-0">
          <div className="flex items-center gap-3 text-[14px]">
            <Stars value={p.rating} size={16} />
            <a href="#reviews" className="text-muted underline-offset-2 hover:underline">{t.reviewsCount(p.reviews)}</a>
            <button
              type="button"
              className="ml-auto flex items-center gap-1 text-ink/70"
              onClick={async () => {
                track("share", { item_id: p.id });
                try { await navigator.clipboard.writeText(window.location.href); } catch {}
              }}
            >
              {t.share} <Icon name="share" size={16} />
            </button>
          </div>
          <Link href={`/${lang}/brands/${brandSlug(p.brand)}`} className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink/60 hover:text-accent">{p.brand} <Icon name="chevron" size={14} /></Link>
          <h1 className="mt-1 text-[22px] font-bold leading-tight md:text-[30px]">{p.brand} {p.name}</h1>
          <p className="mt-1 text-[15px] text-ink/70">{p.type[lang]} · {volumeLabel(p, lang)}</p>
          {p.rank && <span className="mt-3 inline-block rounded-full bg-surface px-3 py-1 text-[13px] font-medium">{p.rank[lang]}</span>}

          <div ref={buyRef} className="mt-5 rounded-panel bg-white p-5 shadow-float ring-1 ring-line md:p-7">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-[30px] font-bold tabular md:text-[38px]">{money(p.price, lang)}</span>
              {p.oldPrice && <span className="text-[16px] text-muted line-through tabular">{money(p.oldPrice, lang)}</span>}
            </div>
            <p className="text-[13px] text-muted tabular">{unitPrice(p, lang)}</p>
            <div className="mt-3"><DeliveryPromise /></div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => { add(p.id); useUi.getState().setAdded(p.id); track("add_to_cart", { item_id: p.id, price: p.price, qty: 1, source: "pdp" }); }}
                className="h-14 flex-1 rounded-card bg-accent text-[16px] font-semibold text-white hover:bg-accent-dark md:h-[64px] md:text-[17px]"
              >
                {t.addToCart}
              </button>
              <FavButton id={p.id} className="!size-14 shrink-0 !rounded-card bg-surface md:!size-[64px]" />
            </div>
            <button type="button" onClick={buyNow} className="mt-2 h-12 w-full rounded-card border border-ink/15 font-semibold hover:border-ink">
              {t.buyNow}
            </button>
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-accent-soft p-3 text-[13px] text-ink/80">
              <Icon name="shield" size={18} className="shrink-0 text-accent" /> {t.originalNote}
            </p>
          </div>

          <section className="mt-8">
            <h2 className="text-[17px] font-semibold md:text-[20px]">{t.forWhom}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {p.skin.map((s) => <span key={s} className="rounded-full bg-surface px-3 py-1.5 text-[13px]">{SKIN_TYPES.find((x) => x.id === s)!.name[lang]}</span>)}
              {p.concerns.map((c) => <span key={c} className="rounded-full bg-accent-soft px-3 py-1.5 text-[13px] text-accent">{CONCERNS.find((x) => x.id === c)!.name[lang]}</span>)}
            </div>
          </section>

          <section className="mt-6 rounded-panel bg-surface p-5">
            <h2 className="font-semibold">{t.whyWeLove}</h2>
            <p className="mt-1 text-[15px] text-ink/80">{p.why[lang]}</p>
          </section>

          <div className="mt-6">
            <Accordion title={t.description} open>{p.desc[lang]}</Accordion>
            <Accordion title={t.howTo}>{p.howTo[lang]}</Accordion>
            <Accordion title={t.ingredients}>
              <div className="flex flex-wrap gap-2">
                {p.ingredients.map((i) => <span key={i.ru} className="rounded-full bg-surface px-3 py-1.5 text-[14px]">{i[lang]}</span>)}
              </div>
            </Accordion>
            <Accordion title={t.specs}>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1">
                <dt className="text-muted">{t.brand}</dt><dd><Link href={`/${lang}/brands/${brandSlug(p.brand)}`} className="text-accent underline-offset-2 hover:underline">{p.brand}</Link></dd>
                <dt className="text-muted">{t.volume}</dt><dd>{volumeLabel(p, lang)}</dd>
                <dt className="text-muted">—</dt><dd>{t.daysSupply(p.daysSupply)}</dd>
              </dl>
            </Accordion>
          </div>
        </div>
      </div>

      <div className="mt-12 md:mt-20"><FrequentlyBought p={p} /></div>

      {/* Отзывы */}
      <section id="reviews" className="mt-12 scroll-mt-28 md:mt-20">
        <h2 className="h-section">{t.reviews}</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-[320px_1fr] md:gap-12">
          <div>
            <p className="flex items-baseline gap-2"><span className="text-[48px] font-bold leading-none tabular">{p.rating.toFixed(1)}</span><span className="text-muted">/ 5 · {t.reviewsCount(p.reviews)}</span></p>
            <ul className="mt-4 space-y-1.5">
              {dist.map((d) => (
                <li key={d.s} className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 tabular">{d.s}</span>
                  <Icon name="star" size={13} fill strokeWidth={0} className="text-accent" />
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface"><span className="block h-full rounded-full bg-accent" style={{ width: `${d.pct}%` }} /></span>
                  <span className="w-9 text-right text-muted tabular">{d.pct}%</span>
                </li>
              ))}
            </ul>
            {p.reviewSummary && (
              <div className="mt-5 rounded-card bg-surface p-4">
                <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t.customersSay}</p>
                <p className="mt-1 text-[14px]">{p.reviewSummary[lang]}</p>
              </div>
            )}
          </div>
          <ul className="divide-y divide-line">
            {DEMO_REVIEWS.map((r) => (
              <li key={r.name} className="py-5 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="font-semibold">{r.name}</span>
                  <span className="text-[12px] text-success">✓ {t.verified}</span>
                  <span className="ml-auto flex text-accent">{Array.from({ length: r.stars }).map((_, i) => <Icon key={i} name="star" size={15} fill strokeWidth={0} />)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-muted">{t.skinType}: {SKIN_TYPES.find((s) => s.id === r.skin)!.name[lang]}</p>
                <p className="mt-2 text-[15px]">{r.text[lang]}</p>
                <button type="button" className="mt-2 rounded-full bg-surface px-3 py-1 text-[13px]">{t.helpful} · {r.helpful}</button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Вопросы и ответы */}
      <section className="mt-12 md:mt-16">
        <div className="flex items-center gap-3">
          <h2 className="text-[22px] font-bold md:text-[28px]">{t.qa}</h2>
          <button type="button" className="ml-auto h-10 rounded-full bg-surface px-4 text-[14px]">{t.askQuestion}</button>
        </div>
        <div className="mt-4 rounded-card bg-surface p-4 text-[15px]">
          <p className="font-semibold">{lang === "ru" ? "Подойдёт ли при беременности?" : "Homiladorlikda mos keladimi?"}</p>
          <p className="mt-1 text-ink/75">{lang === "ru" ? "NABI: в составе нет ретиноидов и высоких концентраций кислот, но перед применением лучше посоветоваться с врачом." : "NABI: tarkibida retinoidlar yo'q, lekin shifokor bilan maslahatlashing."}</p>
        </div>
      </section>

      {/* Сравнение */}
      {compare.length > 1 && (
        <section className="mt-12 md:mt-16">
          <h2 className="text-[22px] font-bold md:text-[28px]">{t.compare}</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-[14px]">
              <thead>
                <tr>
                  <th className="w-36" />
                  {compare.map((c) => (
                    <th key={c.id} className="p-2 text-left align-top font-medium">
                      <Link href={`/${lang}/p/${c.slug}`} className="block">
                        <span className="block aspect-square w-24 overflow-hidden rounded-xl bg-surface"><ProductImage p={c} brand={false} /></span>
                        <span className="mt-2 line-clamp-2 block">{c.brand} {c.name}</span>
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular">
                {[
                  [t.price, (c: Product) => money(c.price, lang)],
                  [t.volume, (c: Product) => volumeLabel(c, lang)],
                  ["", (c: Product) => unitPrice(c, lang)],
                  [t.rating, (c: Product) => `${c.rating.toFixed(1)} · ${c.reviews}`],
                  [t.skinType, (c: Product) => c.skin.map((s) => SKIN_TYPES.find((x) => x.id === s)!.name[lang]).join(", ")],
                ].map(([label, fn], i) => (
                  <tr key={i} className="border-t border-line">
                    <td className="p-2 text-muted">{label as string}</td>
                    {compare.map((c) => <td key={c.id} className={`p-2 ${c.id === p.id ? "font-semibold" : ""}`}>{(fn as (c: Product) => string)(c)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mt-12 md:mt-20">
        <Rail title={t.similar}>{similar.map((s) => <ProductCard key={s.id} p={s} source="similar" />)}</Rail>
      </div>

      {/* Липкая панель покупки на мобиле */}
      {sticky && (
        <div className="anim-sheet fixed inset-x-2 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] z-30 flex items-center gap-3 rounded-card border border-line bg-white p-2 pl-4 shadow-float md:hidden">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] text-ink/70">{p.brand}</span>
            <span className="block font-bold tabular">{money(p.price, lang)}</span>
          </span>
          <PriceButton p={p} source="pdp_sticky" />
        </div>
      )}
    </div>
  );
}
