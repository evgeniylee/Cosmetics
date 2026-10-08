"use client";
import { brandSlug } from "@/lib/slug";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CATEGORIES, type Product } from "@/data/catalog";
import { RAIL_ALL, type RailKey } from "@/lib/storefront";
import { useCatalog } from "./CatalogProvider";
import { track } from "@/lib/analytics";
import { useHydrated, useShop } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";
import { ProductImage } from "./ProductVisual";
import { Rail, TrackSection } from "./Section";
import { VideoViewer } from "./VideoViewer";

export function QuickCategories() {
  const { lang } = useI18n();
  return (
    <TrackSection id="quick_categories" className="wrap relative z-10 -mt-24 md:-mt-28">
      <div className="no-scrollbar flex gap-3 overflow-x-auto rounded-panel bg-white p-4 shadow-float md:grid md:grid-cols-7 md:gap-6 md:rounded-[40px] md:p-6">
        {CATEGORIES.map((c, i) => (
          <Link key={c.id} href={`/${lang}/catalog?cat=${c.id}`} data-stagger style={{ "--i": i } as React.CSSProperties} className="group flex w-[84px] shrink-0 flex-col items-center gap-2 md:w-auto">
            <span className="grid aspect-square w-full place-items-center rounded-card bg-surface transition-colors duration-300 group-hover:bg-accent-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/images/icons/${c.id}.webp`} alt="" width={160} height={160} draggable={false} className="cat-icon size-[78%] object-contain drop-shadow-[0_10px_14px_rgba(228,70,126,.18)]" />
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
  const { byId } = useCatalog();
  if (!hydrated || (recent.length === 0 && cartCount === 0)) return null;
  const items = recent.map((id) => byId(id)!).filter(Boolean).slice(0, 8);
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

/** «Выбор креаторов»: фото креатора, промокод и его подборка. Несколько креаторов — переключаются аватарками. */
export function CreatorsPick() {
  const { lang, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [sel, setSel] = useState(0);
  const { creators, byId } = useCatalog();
  if (!creators.length) return null;
  const c = creators[Math.min(sel, creators.length - 1)];
  const code = c.code;
  const picks = c.picks.map((id) => byId(id)!).filter(Boolean).slice(0, 8);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); } catch {}
    setCopied(true);
    track("creator_code_copy", { code });
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <TrackSection id="creators" className="wrap mt-14 md:mt-24">
      <div className="mb-5 flex flex-wrap items-center gap-3 md:mb-8">
        <h2 className="h-section mr-auto">{t.creatorsTitle}</h2>
        {creators.length > 1 && (
          <div className="no-scrollbar -mx-4 flex w-[calc(100%+32px)] gap-2 overflow-x-auto px-4 md:mx-0 md:w-auto md:px-0" role="tablist" aria-label={t.creatorsTitle}>
            {creators.map((x, i) => (
              <button key={x.code} type="button" role="tab" aria-selected={x.code === c.code} onClick={() => { setSel(i); track("creator_tab", { code: x.code }); }}
                className={`flex h-11 shrink-0 items-center gap-2 rounded-full pl-1 pr-4 text-[14px] font-medium transition ${x.code === c.code ? "bg-ink text-white" : "bg-surface hover:bg-line"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {x.photo ? <img src={x.photo} alt="" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-accent-soft font-bold text-accent">{x.name.slice(0, 1)}</span>}
                {x.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div key={c.code} className="anim-fade grid overflow-hidden rounded-panel bg-surface md:grid-cols-[320px_1fr] md:rounded-block">
        <div className="flex gap-4 p-5 md:flex-col md:border-r md:border-white md:p-8">
          <div className="aspect-[4/5] w-[38%] shrink-0 overflow-hidden rounded-panel bg-[linear-gradient(160deg,#f5d0de,#d9b9e8)] md:w-full md:max-w-[280px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {c.photo ? <img src={c.photo} alt={c.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[64px] font-bold text-white/80">{c.name.slice(0, 1)}</div>}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3 md:gap-4">
            <div>
              <p className="text-[20px] font-bold">{c.name}</p>
              {c.handle && <p className="text-[14px] text-muted">{c.handle}</p>}
            </div>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 rounded-card border-2 border-dashed border-accent bg-white px-3 py-2.5 md:mt-0 md:px-4 md:py-3">
              <div>
                <p className="text-[12px] text-muted">{t.creatorsCode} −{c.percent}%</p>
                <p className="text-[18px] font-bold tracking-wider md:text-[20px]">{code}</p>
              </div>
              <button type="button" onClick={copy} className="h-9 rounded-full bg-accent px-4 text-[14px] font-semibold text-white md:h-10">{copied ? t.copied : t.copy}</button>
            </div>
          </div>
        </div>
        <div className="min-w-0 p-5 pt-0 md:p-8">
          <div className="no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:px-0">
            {picks.slice(0, 4).map((p) => <div key={p.id} className="w-[46%] shrink-0 md:w-auto"><ProductCard p={p} source="creator_pick" /></div>)}
          </div>
          <Link href={`/${lang}/catalog?creator=${code}`} className="mt-6 flex items-center justify-center gap-1 rounded-card bg-white py-3 text-[15px] font-medium">
            {picks.length} {t.creatorPicks} <Icon name="chevron" size={18} />
          </Link>
        </div>
      </div>
    </TrackSection>
  );
}

/** «Обзоры креаторов»: обложки видео; нажатие открывает плеер с товарами. Ссылка ?video=ID открывает сразу нужное видео. */
export function Videos() {
  const { lang, t } = useI18n();
  const { videos, byId } = useCatalog();
  const [open, setOpen] = useState<number | null>(null);
  const pushed = useRef(false);

  const setUrl = (id: string | null, push: boolean) => {
    const u = new URL(window.location.href);
    if (id) u.searchParams.set("video", id); else u.searchParams.delete("video");
    window.history[push ? "pushState" : "replaceState"]({ ...window.history.state, nabiVideo: id }, "", u);
  };
  useEffect(() => {
    const fromUrl = () => {
      const id = new URLSearchParams(window.location.search).get("video");
      const i = id ? videos.findIndex((v) => v.id === id) : -1;
      setOpen(i >= 0 ? i : null);
      if (i < 0) pushed.current = false;
    };
    fromUrl();
    window.addEventListener("popstate", fromUrl);
    return () => window.removeEventListener("popstate", fromUrl);
  }, [videos]);

  const show = (i: number) => {
    setOpen(i);
    setUrl(videos[i].id, true);
    pushed.current = true;
    track("video_open", { video_id: videos[i].id });
  };
  const onIndex = useCallback((i: number) => {
    setOpen((cur) => {
      if (cur !== i) setUrl(videos[i].id, false);
      return i;
    });
  }, [videos]);
  const close = () => {
    // Открыли кликом — «назад» уберёт ?video из адреса; пришли по ссылке — просто чистим адрес.
    if (pushed.current) window.history.back();
    else { setUrl(null, false); setOpen(null); }
  };
  if (!videos.length) return null;
  return (
    <TrackSection id="videos" className="wrap mt-14 md:mt-24">
      <Rail title={t.videosTitle} itemClass="w-[46%] sm:w-[31%] lg:w-[calc(20%-24px)]">
        {videos.map((v, i) => {
          const first = byId(v.products[0] ?? "");
          return (
            <button key={v.id} type="button" onClick={() => show(i)} className="group relative block aspect-[9/16] w-full overflow-hidden rounded-panel bg-ink text-left">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {v.poster && <img src={v.poster} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />}
              <span className="absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink transition group-hover:scale-110 md:size-14">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
              </span>
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-16 text-white md:p-4">
                <span className="line-clamp-3 block text-[14px] font-semibold leading-snug md:text-[16px]">{v.title[lang] || v.title.ru}</span>
                {first && (
                  <span className="mt-2 flex items-center gap-1.5 rounded-full bg-white/90 p-1 pr-2.5 text-[12px] font-medium text-ink">
                    <span className="size-6 shrink-0 overflow-hidden rounded-full bg-surface"><ProductImage p={first} /></span>
                    <span className="truncate">{v.products.length > 1 ? (lang === "ru" ? `${v.products.length} товара в видео` : `Videoda ${v.products.length} ta mahsulot`) : first.brand}</span>
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </Rail>
      {open !== null && videos[open] && (
        <VideoViewer videos={videos} index={open} onIndex={onIndex} onClose={close} onNavigate={() => { pushed.current = false; setOpen(null); }} />
      )}
    </TrackSection>
  );
}

/** Продающая лента главной (Хиты, Новинки, Скидки, Рекомендуем) — состав задаётся в админке «Витрина». */
export function HomeRail({ k }: { k: RailKey }) {
  const { lang, t } = useI18n();
  const { rails, byId } = useCatalog();
  const rail = rails.find((r) => r.key === k);
  const items = (rail?.ids ?? []).map((id) => byId(id)).filter(Boolean) as Product[];
  if (!rail || !items.length) return null;
  const all = RAIL_ALL[k];
  return (
    <TrackSection id={`rail_${k}`} className="wrap mt-14 scroll-mt-28 md:mt-24">
      {k === "hits" && <span id="hits" />}
      <Rail title={rail.title[lang] || rail.title.ru} href={all ? `/${lang}${all}` : undefined} allLabel={t.all}>
        {items.map((p) => <ProductCard key={p.id} p={p} source={`home_${k}`} />)}
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
  const { brands } = useCatalog();
  return (
    <TrackSection id="brands" className="wrap mt-14 md:mt-24">
      <h2 className="h-section mb-5 md:mb-8">{t.brandsTitle}</h2>
      <div className="no-scrollbar flex gap-3 overflow-x-auto md:grid md:grid-cols-6 md:gap-5">
        {brands.map((b, i) => (
          <Link key={b} data-stagger style={{ "--i": Math.min(i, 8) } as React.CSSProperties} href={`/${lang}/brands/${brandSlug(b)}`} className="grid h-20 w-40 shrink-0 place-items-center rounded-card bg-surface px-3 text-center text-[16px] font-bold uppercase tracking-[0.12em] hover:bg-accent-soft md:h-[106px] md:w-auto md:text-[18px]">
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
