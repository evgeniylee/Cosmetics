"use client";
import Link from "next/link";
import { useState } from "react";
import { CATEGORIES, PRODUCTS, getById } from "@/data/catalog";
import { CREATOR_CODES } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useHydrated, useShop } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";
import { Rail, TrackSection } from "./Section";

export function QuickCategories() {
  const { lang } = useI18n();
  return (
    <TrackSection id="quick_categories" className="wrap relative z-10 -mt-24 md:-mt-28">
      <div className="no-scrollbar flex gap-3 overflow-x-auto rounded-panel bg-white p-4 shadow-float md:grid md:grid-cols-7 md:gap-6 md:rounded-[40px] md:p-6">
        {CATEGORIES.map((c, i) => (
          <Link key={c.id} href={`/${lang}/catalog?cat=${c.id}`} data-stagger style={{ "--i": i } as React.CSSProperties} className="group flex w-[84px] shrink-0 flex-col items-center gap-2 md:w-auto">
            <span className="grid aspect-square w-full place-items-center rounded-card bg-surface transition-colors duration-300 group-hover:bg-accent-soft">
              <span className="cat-icon grid size-[58%] place-items-center rounded-[30%] bg-[linear-gradient(145deg,#ff9cc4,#e4467e_60%,#b92d65)] text-white shadow-[inset_0_2px_6px_rgba(255,255,255,.6),0_10px_20px_-8px_rgba(228,70,126,.6)]">
                <Icon name={c.icon} size={26} />
              </span>
            </span>
            <span className="text-center text-[13px] leading-tight md:text-[15px]">{c.name[lang]}</span>
          </Link>
        ))}
      </div>
    </TrackSection>
  );
}

export function ContinueShopping() {
  const { lang, t } = useI18n();
  const hydrated = useHydrated();
  const recent = useShop((s) => s.recent);
  const cartCount = useShop((s) => Object.keys(s.cart).length);
  if (!hydrated || (recent.length === 0 && cartCount === 0)) return null;
  const items = recent.map((id) => getById(id)!).filter(Boolean).slice(0, 8);
  return (
    <TrackSection id="continue" className="wrap mt-14 md:mt-24">
      {items.length > 0 ? (
        <Rail title={t.continueTitle} href={cartCount ? `/${lang}/cart` : undefined} allLabel={t.backToCart}>
          {items.map((p) => <ProductCard key={p.id} p={p} source="continue" />)}
        </Rail>
      ) : (
        <Link href={`/${lang}/cart`} className="flex items-center justify-between rounded-card bg-accent-soft p-5 font-semibold text-accent">
          {t.backToCart} <Icon name="chevron" />
        </Link>
      )}
    </TrackSection>
  );
}

export function QuizBanner() {
  const { lang, t } = useI18n();
  return (
    <TrackSection id="quiz_banner" className="wrap mt-14 md:mt-24">
      <Link href={`/${lang}/quiz`} className="relative flex flex-col gap-4 overflow-hidden rounded-panel bg-ink p-6 text-white md:flex-row md:items-center md:rounded-block md:p-12">
        <div aria-hidden className="absolute -right-10 -top-16 size-64 rounded-full bg-accent/60 blur-3xl" />
        <div className="relative max-w-[640px]">
          <h2 className="text-[26px] font-bold leading-tight md:text-[42px]">{t.quizTitle}</h2>
          <p className="mt-2 text-white/75 md:text-[17px]">{t.quizText}</p>
        </div>
        <span className="relative flex h-12 w-fit items-center gap-2 rounded-card bg-white px-5 font-semibold text-ink md:ml-auto md:h-[60px] md:px-7">
          {t.quizCta} <Icon name="arrowR" size={18} />
        </span>
      </Link>
    </TrackSection>
  );
}

export function Hits() {
  const { lang, t } = useI18n();
  const items = [...PRODUCTS].sort((a, b) => b.reviews - a.reviews).slice(0, 8);
  return (
    <TrackSection id="hits" className="wrap mt-14 scroll-mt-28 md:mt-24">
      <span id="hits" />
      <Rail title={t.hits} href={`/${lang}/catalog?sort=popular`} allLabel={t.all}>
        {items.map((p) => <ProductCard key={p.id} p={p} source="home_hits" />)}
      </Rail>
    </TrackSection>
  );
}

export function CreatorsPick() {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const code = "MADINA";
  const c = CREATOR_CODES[code];
  const picks = ["1", "2", "5", "13"].map((id) => getById(id)!);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch {}
    setCopied(true);
    track("creator_code_copy", { code });
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <TrackSection id="creators" className="wrap mt-14 md:mt-24">
      <h2 className="h-section mb-5 md:mb-8">{t.creatorsTitle}</h2>
      <div className="grid overflow-hidden rounded-panel bg-surface md:grid-cols-[360px_1fr] md:rounded-block">
        <div className="flex flex-col gap-4 p-5 md:border-r md:border-white md:p-8">
          <div className="aspect-[4/5] w-full max-w-[280px] rounded-panel bg-[linear-gradient(160deg,#f5d0de,#d9b9e8)]" aria-hidden>
            <div className="grid h-full place-items-center text-[64px] font-bold text-white/80">М</div>
          </div>
          <div>
            <p className="text-[20px] font-bold">{c.name}</p>
            <p className="text-[14px] text-muted">{c.handle}</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-card border-2 border-dashed border-accent bg-white px-4 py-3">
            <div>
              <p className="text-[12px] text-muted">{t.creatorsCode} −10%</p>
              <p className="text-[20px] font-bold tracking-wider">{code}</p>
            </div>
            <button type="button" onClick={copy} className="h-10 rounded-full bg-accent px-4 text-[14px] font-semibold text-white">{copied ? t.copied : t.copy}</button>
          </div>
        </div>
        <div className="min-w-0 p-5 md:p-8">
          <div className="no-scrollbar flex gap-3 overflow-x-auto md:grid md:grid-cols-4 md:gap-6">
            {picks.map((p) => <div key={p.id} className="w-[46%] shrink-0 md:w-auto"><ProductCard p={p} source="creator_pick" /></div>)}
          </div>
          <Link href={`/${lang}/catalog?creator=${code}`} className="mt-6 flex items-center justify-center gap-1 rounded-card bg-white py-3 text-[15px] font-medium">
            {picks.length} {t.creatorPicks} <Icon name="chevron" size={18} />
          </Link>
        </div>
      </div>
    </TrackSection>
  );
}

const VIDEOS = [
  { title: { ru: "Мой утренний уход за 3 минуты", uz: "3 daqiqalik ertalabki parvarishim" }, handle: "@madina.skincare", g: "linear-gradient(170deg,#f6c9d8,#c78fb0)" },
  { title: { ru: "SPF без белых следов: тест на смуглой коже", uz: "Oq izsiz SPF: test" }, handle: "@sevara.tt", g: "linear-gradient(170deg,#f8e2a8,#d7a95b)" },
  { title: { ru: "Как я убрала покраснения за месяц", uz: "Qizarishni qanday yo'qotdim" }, handle: "@aziza.glow", g: "linear-gradient(170deg,#cde6d0,#7fae8a)" },
  { title: { ru: "Распаковка заказа NABI", uz: "NABI buyurtmasini ochish" }, handle: "@kamila_beauty", g: "linear-gradient(170deg,#cfd8f5,#8b9ad6)" },
];

export function Videos() {
  const { lang, t } = useI18n();
  return (
    <TrackSection id="videos" className="wrap mt-14 md:mt-24">
      <Rail title={t.videosTitle} itemClass="w-[62%] sm:w-[38%] lg:w-[calc(25%-22px)]">
        {VIDEOS.map((v) => (
          <button key={v.handle} type="button" onClick={() => track("video_play", { handle: v.handle })} className="relative block aspect-[9/16] w-full overflow-hidden rounded-panel text-left" style={{ background: v.g }}>
            <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
            </span>
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-16 text-white">
              <span className="block text-[15px] font-semibold leading-snug md:text-[17px]">{v.title[lang]}</span>
              <span className="mt-1 block text-[13px] text-white/80">{v.handle}</span>
            </span>
          </button>
        ))}
      </Rail>
    </TrackSection>
  );
}

export function Trust() {
  const { t } = useI18n();
  const items = [
    { icon: "shield", title: t.trust1, text: t.trust1t },
    { icon: "gift", title: t.trust2, text: t.trust2t },
    { icon: "truck", title: t.trust3, text: t.trust3t },
  ];
  return (
    <TrackSection id="trust" className="wrap mt-14 md:mt-24">
      <h2 className="h-section mb-5 md:mb-8">{t.trustTitle}</h2>
      <ol className="grid gap-3 md:grid-cols-3 md:gap-6">
        {items.map((it, i) => (
          <li key={it.title} data-stagger style={{ "--i": i } as React.CSSProperties} className="flex gap-4 rounded-panel bg-surface p-5 transition-transform duration-300 hover:-translate-y-1 md:flex-col md:p-8">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-accent md:size-14">
              <Icon name={it.icon} size={26} />
            </span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">0{i + 1}</p>
              <p className="mt-1 text-[17px] font-bold md:text-[20px]">{it.title}</p>
              <p className="mt-1 text-[14px] text-ink/70 md:text-[15px]">{it.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </TrackSection>
  );
}

export function Brands() {
  const { lang, t } = useI18n();
  const brands = Array.from(new Set(PRODUCTS.map((p) => p.brand)));
  return (
    <TrackSection id="brands" className="wrap mt-14 md:mt-24">
      <h2 className="h-section mb-5 md:mb-8">{t.brandsTitle}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto md:grid md:grid-cols-6 md:gap-5">
        {brands.map((b, i) => (
          <Link key={b} data-stagger style={{ "--i": Math.min(i, 8) } as React.CSSProperties} href={`/${lang}/catalog?brand=${encodeURIComponent(b)}`} className="grid h-20 w-40 shrink-0 place-items-center rounded-card bg-surface px-3 text-center text-[16px] font-bold uppercase tracking-[0.12em] hover:bg-accent-soft md:h-[106px] md:w-auto md:text-[18px]">
            {b}
          </Link>
        ))}
      </div>
    </TrackSection>
  );
}

export function Subscribe() {
  const { t } = useI18n();
  return (
    <TrackSection id="subscribe" className="wrap mt-14 md:mt-24">
      <div className="flex flex-col gap-5 rounded-panel bg-accent-soft p-6 md:flex-row md:items-center md:rounded-block md:p-12">
        <div className="flex-1">
          <h2 className="text-[26px] font-bold leading-tight md:text-[42px]">{t.subTitle}</h2>
          <p className="mt-2 max-w-[52ch] text-ink/70 md:text-[17px]">{t.subText}</p>
        </div>
        <a href="https://t.me/" target="_blank" rel="noreferrer" onClick={() => track("telegram_click", { place: "subscribe" })} className="flex h-14 w-fit items-center gap-2 rounded-card bg-accent px-6 font-semibold text-white hover:bg-accent-dark">
          <Icon name="telegram" size={20} /> {t.subCta}
        </a>
      </div>
    </TrackSection>
  );
}

export function Seo() {
  const { t } = useI18n();
  return (
    <section className="wrap mt-14 md:mt-24">
      <div className="grid overflow-hidden rounded-panel border border-line md:grid-cols-[1fr_1.4fr]">
        <h2 className="p-6 text-[24px] font-bold leading-tight md:border-r md:border-line md:p-8 md:text-[34px]">{t.seoTitle}</h2>
        <p className="p-6 pt-0 text-[15px] text-ink/80 md:p-8">{t.seoText}</p>
      </div>
    </section>
  );
}
