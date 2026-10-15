"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { TrackSection } from "./Section";
import { useCatalog } from "./CatalogProvider";
import type { HeroBanner } from "@/lib/storefront";

type Slide = HeroBanner;

// Запасной баннер, если в админке все выключены: без него «съедет» шапка главной.
const FALLBACK: Slide = {
  id: "fallback", tone: "light", bg: "radial-gradient(120% 90% at 80% 20%,#ffd9e8 0%,#f7c3d8 35%,#e7b7e0 70%,#cdb8ef 100%)", art: ["serum", "cream", "essence"],
  eyebrow: { ru: "Оригинальная корейская косметика", uz: "Original koreys kosmetikasi" },
  title: { ru: "Уход, который проверили до вас", uz: "Sizdan oldin tekshirilgan parvarish" },
  text: { ru: "Проверяем партию и срок годности, упаковываем как подарок и привозим завтра.", uz: "Partiya va muddatni tekshiramiz, sovg'a kabi qadoqlab ertaga yetkazamiz." },
  cta: { ru: "Подобрать уход", uz: "Parvarish tanlash" }, href: "/quiz",
};

const DELAY = 5500;
const SPEED = 800;

// Раскладка 3D-иконок: две крупные или три поменьше, каждая слегка покачивается.
const LAYOUTS: Record<number, { l: string; t: string; w: string; r: string; d: string }[]> = {
  2: [
    { l: "6%", t: "8%", w: "52%", r: "-6deg", d: "0s" },
    { l: "48%", t: "26%", w: "44%", r: "7deg", d: "-2.5s" },
  ],
  3: [
    { l: "2%", t: "18%", w: "40%", r: "-7deg", d: "0s" },
    { l: "34%", t: "0%", w: "38%", r: "4deg", d: "-2s" },
    { l: "62%", t: "30%", w: "36%", r: "8deg", d: "-4s" },
  ],
};

function SlideArt({ icons, active }: { icons: string[]; active: boolean }) {
  const layout = LAYOUTS[icons.length] ?? LAYOUTS[3];
  return (
    <div className={`relative h-full w-full ${active ? "hero-art-in" : "opacity-0"}`}>
      {icons.map((name, i) => {
        const s = layout[i % layout.length];
        return (
          <div key={name} className="float absolute aspect-square" style={{ left: s.l, top: s.t, width: s.w, ["--r" as string]: s.r, animationDelay: s.d }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/images/icons/${name}.webp`} alt="" draggable={false} className="h-full w-full object-contain drop-shadow-[0_24px_30px_rgba(17,17,17,.18)]" />
          </div>
        );
      })}
    </div>
  );
}

/** Один слайд. Используется и в карусели, и в предпросмотре баннера в админке. */
export function HeroSlide({ s, lang, active, eager = false, onClick }: { s: Slide; lang: "ru" | "uz"; active: boolean; eager?: boolean; onClick?: () => void }) {
  const d = s.tone === "dark";
  const t = (v: { ru: string; uz: string }) => v[lang] || v.ru;
  return (
    <div className="relative h-full w-full shrink-0" style={{ background: s.bg }} aria-hidden={!active} role="group" aria-roledescription="slide">
      {s.image && (
        <picture>
          <source media="(min-width: 768px)" srcSet={s.image.desktop} />
          <img src={s.image.mobile} alt="" fetchPriority={eager ? "high" : "auto"} loading={eager ? "eager" : "lazy"} className="absolute inset-0 h-full w-full object-cover object-[50%_40%] md:object-right" draggable={false} />
        </picture>
      )}
      {/* декоративная сетка */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className={`absolute inset-x-0 top-[58%] h-px md:top-[64.5%] ${d ? "bg-white/25" : "bg-white/70"}`} />
        <div className={`absolute inset-y-0 left-1/2 hidden w-px md:block ${d ? "bg-white/25" : "bg-white/70"}`} />
      </div>
      <div className="wrap relative grid h-full grid-rows-[auto_1fr] pt-[96px] md:grid-cols-2 md:grid-rows-1 md:items-center md:pb-24 md:pt-[150px]">
        <div key={active ? "in" : "idle"} className={`max-w-[560px] ${active ? "hero-in" : ""} ${d ? "text-white" : "text-ink"}`}>
          {t(s.eyebrow) && <p className={`text-[12px] font-semibold uppercase tracking-[0.14em] md:text-[13px] ${d ? "text-white/70" : "text-ink/60"}`}>{t(s.eyebrow)}</p>}
          <h2 className="mt-3 text-[34px] font-bold leading-[1.02] tracking-[-0.02em] text-balance md:text-[60px]">{t(s.title)}</h2>
          {t(s.text) && <p className={`mt-4 max-w-[44ch] text-[15px] md:text-[19px] ${d ? "text-white/80" : "text-ink/75"}`}>{t(s.text)}</p>}
          <Link
            href={`/${lang}${s.href}`}
            tabIndex={active ? 0 : -1}
            onClick={onClick}
            className="mt-6 inline-flex h-14 items-center gap-2 rounded-card bg-accent px-6 text-[16px] font-semibold text-white shadow-float transition hover:bg-accent-dark active:scale-95 md:h-[68px] md:px-8 md:text-[18px]"
          >
            {t(s.cta)} <Icon name="arrowR" size={20} />
          </Link>
        </div>
        <div className="relative mx-auto h-[170px] w-full max-w-[300px] md:h-[440px] md:max-w-[520px]">
          {!s.image && s.art.length > 0 && <SlideArt icons={s.art} active={active} />}
        </div>
      </div>
    </div>
  );
}

/** Счётчики баннера для админки: показ (раз за визит) и клик. */
function bannerEvent(id: string, type: "view" | "click") {
  if (type === "view") {
    try {
      const k = `nabi_bv_${id}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* приватный режим */ }
  }
  fetch(`/api/banners/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type }), keepalive: true }).catch(() => {});
}

export function HeroCarousel() {
  const { lang } = useI18n();
  const { banners } = useCatalog();
  const SLIDES = banners.length ? banners : [FALLBACK];
  const setTone = useUi((s) => s.setHeroTone);
  const n = SLIDES.length;
  // Позиция в «ленте» с клонами по краям: 0 — клон последнего, 1..n — слайды, n+1 — клон первого.
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [auto, setAuto] = useState(true);
  const [paused, setPaused] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; t: number; locked: boolean | null } | null>(null);
  const width = useRef(1);
  const busy = useRef(false);
  const index = (pos - 1 + n) % n;
  const slide = SLIDES[index];

  useEffect(() => { setTone(slide.tone); }, [slide.tone, setTone]);
  useEffect(() => { if (slide.id !== "fallback") bannerEvent(slide.id, "view"); }, [slide.id]);
  useEffect(() => () => setTone("light"), [setTone]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setAuto(false);
  }, []);

  const go = useCallback((next: number) => {
    if (busy.current) return;
    busy.current = true;
    setAnimate(true);
    setPos(next);
  }, []);

  // Автолистание. Останавливается навсегда после действия пользователя, как у hollyshop.
  useEffect(() => {
    if (!auto || paused || n < 2) return;
    const id = setTimeout(() => go(pos + 1), DELAY);
    return () => clearTimeout(id);
  }, [auto, paused, pos, go, n]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const onEnd = () => {
    busy.current = false;
    if (pos === 0 || pos === n + 1) {
      setAnimate(false);
      setPos(pos === 0 ? n : 1);
    }
  };

  const user = (next: number, how: string) => {
    setAuto(false);
    go(next);
    track("hero_navigate", { how, to: ((next - 1 + n) % n) + 1 });
  };

  const onDown = (e: React.PointerEvent) => {
    width.current = (e.currentTarget as HTMLElement).clientWidth;
    start.current = { x: e.clientX, y: e.clientY, t: Date.now(), locked: null };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x, dy = e.clientY - s.y;
    if (s.locked === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) s.locked = Math.abs(dx) > Math.abs(dy);
    if (s.locked) { setAnimate(false); setDrag(dx); }
  };
  const onUp = () => {
    const s = start.current;
    start.current = null;
    if (!s || !s.locked) { setDrag(0); return; }
    const v = drag / Math.max(1, Date.now() - s.t);
    const d = drag;
    setDrag(0);
    setAnimate(true);
    if (d < -width.current * 0.18 || v < -0.4) user(pos + 1, "swipe");
    else if (d > width.current * 0.18 || v > 0.4) user(pos - 1, "swipe");
  };

  const tape = [SLIDES[n - 1], ...SLIDES, SLIDES[0]];
  const dark = slide.tone === "dark";

  return (
    <TrackSection id="hero" reveal={false} className="relative -mt-[72px] md:-mt-[160px]">
      <div
        className="relative h-[620px] touch-pan-y select-none overflow-hidden rounded-b-[32px] md:h-[700px] md:rounded-b-block"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-roledescription="carousel"
      >
        <div
          className="flex h-full"
          style={{
            transform: `translateX(calc(${-pos * 100}% + ${drag}px))`,
            transition: animate && drag === 0 ? `transform ${SPEED}ms cubic-bezier(.65,0,.25,1)` : "none",
          }}
          onTransitionEnd={onEnd}
        >
          {tape.map((s, i) => (
            <HeroSlide key={`${s.id}-${i}`} s={s} lang={lang} active={i === pos} eager={i === 1}
              onClick={() => { track("hero_click", { slide: s.id }); if (s.id !== "fallback") bannerEvent(s.id, "click"); }} />
          ))}
        </div>

        {/* Пагинация-капсула со стрелками */}
        <div className={`${n < 2 ? "hidden" : ""} absolute bottom-[112px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border px-1.5 py-1 backdrop-blur-sm md:bottom-[124px] ${dark ? "border-white/40 bg-white/10" : "border-ink/15 bg-white/30"}`}>
          <button type="button" aria-label="←" onClick={() => user(pos - 1, "arrow")} className={`hidden size-7 place-items-center rounded-full transition-colors md:grid ${dark ? "text-white hover:bg-white/20" : "hover:bg-white/60"}`}>
            <Icon name="arrowL" size={16} />
          </button>
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`${i + 1} / ${n}`}
              aria-current={i === index}
              onClick={() => user(i + 1, "dot")}
              className="grid h-6 place-items-center px-1"
            >
              <span className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-500 ${i === index ? "w-6" : "w-1.5"} ${dark ? "bg-white/40" : "bg-ink/25"}`}>
                {i === index && (
                  <span
                    key={`${pos}-${auto}-${paused}`}
                    className={`absolute inset-0 origin-left rounded-full ${dark ? "bg-white" : "bg-ink"}`}
                    style={auto && !paused ? { animation: `dot-fill ${DELAY}ms linear both` } : undefined}
                  />
                )}
              </span>
            </button>
          ))}
          <button type="button" aria-label="→" onClick={() => user(pos + 1, "arrow")} className={`hidden size-7 place-items-center rounded-full transition-colors md:grid ${dark ? "text-white hover:bg-white/20" : "hover:bg-white/60"}`}>
            <Icon name="arrowR" size={16} />
          </button>
        </div>
      </div>
    </TrackSection>
  );
}
