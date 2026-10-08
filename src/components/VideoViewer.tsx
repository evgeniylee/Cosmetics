"use client";
// Плеер видео креаторов поверх страницы.
// ПК: слева описание и креатор, в центре вертикальное видео (соседние видео выглядывают сверху и снизу), справа «Товары в видео».
// Телефон: на весь экран, листается свайпом вверх/вниз, товары — карточками внизу поверх видео.
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/data/catalog";
import type { HomeVideo } from "@/lib/storefront";
import { track } from "@/lib/analytics";
import { cartKey, defaultVariant } from "@/lib/variants";
import { useHydrated, useShop } from "@/store/shop";
import { useCatalog } from "./CatalogProvider";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { PriceButton } from "./ProductCard";
import { ProductImage } from "./ProductVisual";

type Ev = "view" | "click" | "cart";

/** Корзина видна и поверх плеера — после добавления можно сразу оформить. */
function CartPill({ onNavigate, className = "" }: { onNavigate: () => void; className?: string }) {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  const n = useShop((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));
  if (!hydrated || !n) return null;
  return (
    <Link href={`/${lang}/cart`} onClick={onNavigate} className={`anim-fade flex h-10 items-center gap-1.5 rounded-full bg-accent px-3.5 text-[14px] font-semibold text-white ${className}`}>
      <Icon name="bag" size={18} /> {lang === "ru" ? "Корзина" : "Savat"} · {n}
    </Link>
  );
}
export function videoEvent(id: string, type: Ev) {
  if (type === "view") {
    // Один просмотр на видео за сессию.
    try {
      const k = `nabi_vv_${id}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* приватный режим */ }
  }
  fetch(`/api/videos/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }), keepalive: true }).catch(() => {});
}

const useIsDesktop = () => {
  const [d, setD] = useState<boolean | null>(null);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const on = () => setD(m.matches);
    on();
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, []);
  return d;
};

/** Само видео: играет, только когда активно; тап — пауза; полоска прогресса. */
function Clip({ v, active, muted, setMuted, className = "" }: { v: HomeVideo; active: boolean; muted: boolean; setMuted: (m: boolean) => void; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  const [pr, setPr] = useState(0);
  const watched = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!active) { el.pause(); return; }
    setPaused(false);
    el.muted = muted;
    el.play().catch(() => {
      // Браузер не дал включить звук без жеста — играем без звука.
      el.muted = true;
      setMuted(true);
      el.play().catch(() => setPaused(true));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);

  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) { el.play().catch(() => {}); setPaused(false); } else { el.pause(); setPaused(true); }
  };
  return (
    <div className={`relative overflow-hidden bg-black ${className}`}>
      <video
        ref={ref}
        src={v.src}
        poster={v.poster ?? undefined}
        playsInline
        loop
        muted={muted}
        preload={active ? "auto" : "none"}
        onClick={toggle}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration) setPr(el.currentTime / el.duration);
          watched.current += 0.25;
          if (active && el.currentTime > 2 && watched.current > 2) { videoEvent(v.id, "view"); track("video_view", { video_id: v.id }); }
        }}
        className="h-full w-full cursor-pointer object-cover"
      />
      {paused && (
        <button type="button" onClick={toggle} aria-label="Play" className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-ink">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M8 5v14l11-7z" /></svg>
        </button>
      )}
      <button type="button" onClick={() => setMuted(!muted)} aria-label={muted ? "Включить звук" : "Выключить звук"} className="absolute right-3 top-[calc(12px+env(safe-area-inset-top,0px))] z-10 grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur md:right-4 md:top-4">
        {muted ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" /><path d="m23 9-6 6M17 9l6 6" /></svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M11 5 6 9H2v6h4l5 4V5z" fill="currentColor" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" /></svg>
        )}
      </button>
      <div
        className="absolute inset-x-3 bottom-2 z-10 h-4 cursor-pointer py-1.5 md:inset-x-4 md:bottom-3"
        onClick={(e) => {
          const el = ref.current;
          if (!el?.duration) return;
          const r = e.currentTarget.getBoundingClientRect();
          el.currentTime = ((e.clientX - r.left) / r.width) * el.duration;
        }}
      >
        <div className="h-1 overflow-hidden rounded-full bg-white/30"><div className="h-full rounded-full bg-white" style={{ width: `${pr * 100}%` }} /></div>
      </div>
    </div>
  );
}

/** Кнопка цены, которая засчитывает добавление в корзину видео (только первое добавление товара). */
function VideoPrice({ v, p }: { v: HomeVideo; p: Product }) {
  const key = cartKey(p.id, p.variant?.id ?? defaultVariant(p)?.id);
  return (
    <div
      onClickCapture={(e) => {
        const btn = (e.target as HTMLElement).closest("button,a");
        if (!btn) return;
        if (btn.tagName === "A") { videoEvent(v.id, "click"); return; }
        if (!(useShop.getState().cart[key] > 0)) { videoEvent(v.id, "cart"); track("video_add_to_cart", { video_id: v.id, item_id: p.id }); }
      }}
    >
      <PriceButton p={p} source="video" quiet />
    </div>
  );
}

const OutOfStock = ({ lang }: { lang: "ru" | "uz" }) => (
  <span className="inline-flex h-10 items-center rounded-full bg-surface px-3.5 text-[14px] text-muted">{lang === "ru" ? "Нет в наличии" : "Mavjud emas"}</span>
);

function PromoChip({ v, dark = false }: { v: HomeVideo; dark?: boolean }) {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  const promo = useShop((s) => s.promo);
  const setPromo = useShop((s) => s.setPromo);
  const c = v.creator;
  if (!c) return null;
  const applied = hydrated && promo?.code === c.code;
  return (
    <div className={`flex items-center gap-2 rounded-2xl border-2 border-dashed px-3 py-2 ${dark ? "border-white/40 text-white" : "border-accent bg-white"}`}>
      <div className="min-w-0 flex-1 leading-tight">
        <p className={`text-[12px] ${dark ? "text-white/70" : "text-muted"}`}>{lang === "ru" ? "Промокод" : "Promokod"} −{c.percent}%</p>
        <p className="text-[17px] font-bold tracking-wider">{c.code}</p>
      </div>
      <button
        type="button"
        disabled={applied}
        onClick={() => { setPromo({ code: c.code, percent: c.percent }); track("promo_from_video", { code: c.code, video_id: v.id }); }}
        className={`h-9 shrink-0 rounded-full px-3.5 text-[13px] font-semibold ${applied ? (dark ? "bg-white/20" : "bg-surface text-ink") : "bg-accent text-white"}`}
      >
        {applied ? (lang === "ru" ? "Применён ✓" : "Qo'llandi ✓") : lang === "ru" ? "Применить" : "Qo'llash"}
      </button>
    </div>
  );
}

function CreatorLine({ v, dark = false }: { v: HomeVideo; dark?: boolean }) {
  const c = v.creator;
  if (!c) return null;
  return (
    <div className="flex items-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {c.photo ? <img src={c.photo} alt="" className="size-10 rounded-full object-cover" /> : <span className="grid size-10 place-items-center rounded-full bg-accent text-[16px] font-bold text-white">{c.name.slice(0, 1)}</span>}
      <div className="min-w-0 leading-tight">
        <p className="truncate font-semibold">{c.name}</p>
        {c.handle && <p className={`truncate text-[13px] ${dark ? "text-white/70" : "text-white/60"}`}>{c.handle}</p>}
      </div>
    </div>
  );
}

function useVideoProducts(v: HomeVideo) {
  const { byId } = useCatalog();
  return v.products.map((id) => byId(id)).filter(Boolean) as Product[];
}

/** Правая колонка на ПК. */
function ProductsPanel({ v, onNavigate }: { v: HomeVideo; onNavigate: () => void }) {
  const { lang } = useI18n();
  const items = useVideoProducts(v);
  return (
    <aside className="flex max-h-[84vh] w-full max-w-[380px] flex-col rounded-[28px] bg-white p-5 text-ink">
      <h3 className="text-[20px] font-bold">{lang === "ru" ? "Товары в видео" : "Videodagi mahsulotlar"}</h3>
      <ul className="no-scrollbar -mx-1 mt-3 flex-1 space-y-3 overflow-y-auto px-1">
        {items.map((p) => (
          <li key={p.id} className="flex gap-3">
            <Link href={`/${lang}/p/${p.slug}`} onClick={() => { videoEvent(v.id, "click"); track("video_product_click", { video_id: v.id, item_id: p.id }); onNavigate(); }} className="size-[88px] shrink-0 overflow-hidden rounded-2xl bg-surface p-1.5">
              <ProductImage p={p} />
            </Link>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-[12px] text-ink/60">{p.type[lang]}</span>
              <Link href={`/${lang}/p/${p.slug}`} onClick={() => { videoEvent(v.id, "click"); onNavigate(); }} className="line-clamp-2 text-[14px] font-medium leading-snug">{p.brand} {p.name}</Link>
              <div className="mt-auto pt-1">{p.stock === "out" ? <OutOfStock lang={lang} /> : <VideoPrice v={v} p={p} />}</div>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Карточки товаров поверх видео на телефоне. */
function ProductsStrip({ v, onNavigate }: { v: HomeVideo; onNavigate: () => void }) {
  const { lang } = useI18n();
  const items = useVideoProducts(v);
  if (!items.length) return null;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4">
      {items.map((p) => (
        <div key={p.id} className={`flex shrink-0 snap-start items-center gap-2.5 rounded-2xl bg-white p-2 pr-3 text-ink ${items.length === 1 ? "w-full" : "w-[82%]"}`}>
          <Link href={`/${lang}/p/${p.slug}`} onClick={() => { videoEvent(v.id, "click"); track("video_product_click", { video_id: v.id, item_id: p.id }); onNavigate(); }} className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface p-1">
            <ProductImage p={p} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/${lang}/p/${p.slug}`} onClick={() => { videoEvent(v.id, "click"); onNavigate(); }} className="line-clamp-2 text-[13px] font-medium leading-snug">{p.brand} {p.name}</Link>
            <div className="mt-1">{p.stock === "out" ? <OutOfStock lang={lang} /> : <VideoPrice v={v} p={p} />}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function VideoViewer({ videos, index, onIndex, onClose, onNavigate }: {
  videos: HomeVideo[]; index: number; onIndex: (i: number) => void; onClose: () => void; onNavigate: () => void;
}) {
  const desktop = useIsDesktop();
  const [muted, setMuted] = useState(false);

  // Блокируем прокрутку страницы под плеером.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => { html.style.overflow = prev; };
  }, []);

  const go = useCallback((d: number) => {
    const j = index + d;
    if (j >= 0 && j < videos.length) onIndex(j);
  }, [index, videos.length, onIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") { e.preventDefault(); go(1); }
      if (e.key === "ArrowUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  if (desktop === null) return null;
  return desktop
    ? <Desktop videos={videos} index={index} go={go} muted={muted} setMuted={setMuted} onClose={onClose} onNavigate={onNavigate} onIndex={onIndex} />
    : <Mobile videos={videos} index={index} onIndex={onIndex} muted={muted} setMuted={setMuted} onClose={onClose} onNavigate={onNavigate} />;
}

type ViewProps = { videos: HomeVideo[]; index: number; muted: boolean; setMuted: (m: boolean) => void; onClose: () => void; onNavigate: () => void; onIndex: (i: number) => void };

function Desktop({ videos, index, go, muted, setMuted, onClose, onNavigate, onIndex }: ViewProps & { go: (d: number) => void }) {
  const { lang } = useI18n();
  const v = videos[index];
  const prev = videos[index - 1];
  const next = videos[index + 1];
  const wheelAt = useRef(0);
  const Peek = ({ x, i, pos }: { x?: HomeVideo; i: number; pos: "top" | "bottom" }) => (
    <button type="button" disabled={!x} onClick={() => onIndex(i)} aria-label={pos === "top" ? "Предыдущее видео" : "Следующее видео"}
      className={`h-[6vh] w-[calc(80vh*9/16)] shrink-0 overflow-hidden opacity-50 transition hover:opacity-80 disabled:invisible ${pos === "top" ? "rounded-b-3xl" : "rounded-t-3xl"}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {x?.poster ? <img src={x.poster} alt="" className={`h-[calc(80vh)] w-full object-cover ${pos === "top" ? "-translate-y-[calc(80vh-6vh)]" : ""}`} /> : <span className="block h-full w-full bg-white/20" />}
    </button>
  );
  return (
    <div role="dialog" aria-modal="true" aria-label={v.title[lang]} className="anim-fade fixed inset-0 z-[80] bg-[#151515]/95 text-white backdrop-blur-sm"
      onWheel={(e) => {
        if (Math.abs(e.deltaY) < 30 || Date.now() - wheelAt.current < 700) return;
        if ((e.target as HTMLElement).closest("aside")) return;
        wheelAt.current = Date.now();
        go(e.deltaY > 0 ? 1 : -1);
      }}>
      <div className="absolute right-6 top-6 z-10 flex items-center gap-3">
        <CartPill onNavigate={onNavigate} className="h-12 px-5" />
        <button type="button" onClick={onClose} aria-label="Закрыть" className="grid size-12 place-items-center rounded-full bg-white/10 hover:bg-white/20"><Icon name="close" size={22} /></button>
      </div>
      <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center gap-8 px-8 lg:gap-12">
        <div className="max-w-[340px] space-y-4 justify-self-end">
          <CreatorLine v={v} />
          <h2 className="text-[26px] font-bold leading-tight lg:text-[30px]">{v.title[lang] || v.title.ru}</h2>
          {(v.description[lang] || v.description.ru) && <p className="whitespace-pre-line text-[15px] leading-relaxed text-white/75">{v.description[lang] || v.description.ru}</p>}
          <PromoChip v={v} dark />
        </div>
        <div className="flex h-full flex-col items-center justify-center gap-[1.5vh]">
          <Peek x={prev} i={index - 1} pos="top" />
          <div className="relative">
            <Clip key={v.id} v={v} active muted={muted} setMuted={setMuted} className="h-[80vh] w-[calc(80vh*9/16)] rounded-[28px]" />
            <div className="absolute -right-16 top-1/2 flex -translate-y-1/2 flex-col gap-3">
              <button type="button" onClick={() => go(-1)} disabled={!prev} aria-label="Предыдущее видео" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25"><Icon name="chevron" size={20} className="-rotate-90" /></button>
              <button type="button" onClick={() => go(1)} disabled={!next} aria-label="Следующее видео" className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 disabled:opacity-25"><Icon name="chevron" size={20} className="rotate-90" /></button>
            </div>
          </div>
          <Peek x={next} i={index + 1} pos="bottom" />
        </div>
        <div className="justify-self-start pl-10"><ProductsPanel v={v} onNavigate={onNavigate} /></div>
      </div>
    </div>
  );
}

function Mobile({ videos, index, onIndex, muted, setMuted, onClose, onNavigate }: ViewProps) {
  const { lang } = useI18n();
  const box = useRef<HTMLDivElement>(null);
  const [desc, setDesc] = useState(false);
  // Открыли не с первого видео — сразу прокручиваем к нему.
  useEffect(() => {
    const el = box.current;
    if (el) el.scrollTop = index * el.clientHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => { if (e.isIntersecting) onIndex(Number((e.target as HTMLElement).dataset.i)); }),
      { root: el, threshold: 0.6 }
    );
    el.querySelectorAll("[data-i]").forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [onIndex]);
  useEffect(() => setDesc(false), [index]);

  return (
    <div role="dialog" aria-modal="true" aria-label={videos[index]?.title[lang]} className="fixed inset-0 z-[80] bg-black text-white">
      <div ref={box} className="no-scrollbar h-[100dvh] snap-y snap-mandatory overflow-y-auto overscroll-contain">
        {videos.map((v, i) => (
          <section key={v.id} data-i={i} className="relative h-[100dvh] snap-start snap-always">
            {Math.abs(i - index) <= 1 && <Clip v={v} active={i === index} muted={muted} setMuted={setMuted} className="h-full w-full" />}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent px-4 pb-[calc(20px+env(safe-area-inset-bottom,0px))] pt-24">
              <div className="pointer-events-auto space-y-3">
                <CreatorLine v={v} dark />
                <button type="button" onClick={() => setDesc((d) => !d)} className="block text-left">
                  <span className="block text-[17px] font-bold leading-snug">{v.title[lang] || v.title.ru}</span>
                  {(v.description[lang] || v.description.ru) && (
                    <span className={`mt-0.5 text-[14px] text-white/80 ${desc && i === index ? "block" : "line-clamp-1"}`}>{v.description[lang] || v.description.ru}</span>
                  )}
                </button>
                {v.creator && <PromoChip v={v} dark />}
                <ProductsStrip v={v} onNavigate={onNavigate} />
              </div>
            </div>
          </section>
        ))}
      </div>
      <div className="absolute left-3 top-[calc(12px+env(safe-area-inset-top,0px))] z-10 flex items-center gap-2">
        <button type="button" onClick={onClose} aria-label="Закрыть" className="grid size-10 place-items-center rounded-full bg-black/40 backdrop-blur"><Icon name="close" size={22} /></button>
        <CartPill onNavigate={onNavigate} />
      </div>
      <p className="pointer-events-none absolute right-16 top-[calc(22px+env(safe-area-inset-top,0px))] text-[13px] tabular text-white/70">{index + 1} / {videos.length}</p>
    </div>
  );
}

