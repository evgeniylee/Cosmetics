"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getById, type L10n } from "@/data/catalog";
import { track } from "@/lib/analytics";
import { useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductVisual } from "./ProductVisual";
import { TrackSection } from "./Section";

type Slide = {
  id: string;
  tone: "light" | "dark";
  bg: string;
  /** Фон-картинка (когда будут готовы изображения): /images/hero-*.webp */
  image?: { desktop: string; mobile: string };
  eyebrow: L10n;
  title: L10n;
  text: L10n;
  cta: L10n;
  href: string;
  products: string[];
};

const SLIDES: Slide[] = [
  {
    id: "promise", tone: "light",
    bg: "radial-gradient(120% 90% at 80% 20%,#ffd9e8 0%,#f7c3d8 35%,#e7b7e0 70%,#cdb8ef 100%)",
    eyebrow: { ru: "Оригинальная корейская косметика", uz: "Original koreys kosmetikasi" },
    title: { ru: "Уход, который проверили до вас", uz: "Sizdan oldin tekshirilgan parvarish" },
    text: { ru: "Проверяем партию и срок годности, упаковываем как подарок и привозим завтра.", uz: "Partiya va muddatni tekshiramiz, sovg'a kabi qadoqlab ertaga yetkazamiz." },
    cta: { ru: "Подобрать уход", uz: "Parvarish tanlash" }, href: "/quiz", products: ["2", "1", "5", "8"],
  },
  {
    id: "spf", tone: "light",
    bg: "radial-gradient(110% 90% at 75% 30%,#fff6d6 0%,#ffe7a8 40%,#ffd3a3 75%,#ffc4b8 100%)",
    eyebrow: { ru: "Сезон SPF", uz: "SPF mavsumi" },
    title: { ru: "Санскрины без белых следов", uz: "Oq izsiz quyoshdan himoya" },
    text: { ru: "Лёгкие текстуры под макияж. Каждый день, даже в пасмурную погоду.", uz: "Makiyaj ostiga yengil teksturalar. Har kuni." },
    cta: { ru: "Выбрать SPF", uz: "SPF tanlash" }, href: "/catalog?cat=spf", products: ["2", "10", "9"],
  },
  {
    id: "acne", tone: "dark",
    bg: "radial-gradient(90% 90% at 80% 25%,#2f6b55 0%,#1b3d33 45%,#111814 100%)",
    eyebrow: { ru: "Против акне", uz: "Husnbuzarga qarshi" },
    title: { ru: "Чистая кожа без агрессии", uz: "Agressiyasiz toza teri" },
    text: { ru: "Кислотные тонеры, центелла и патчи, которые работают за одну ночь.", uz: "Kislotali tonerlar, sentella va bir kechada ishlaydigan patchlar." },
    cta: { ru: "Смотреть подборку", uz: "To'plamni ko'rish" }, href: "/catalog?concern=acne", products: ["7", "6", "14"],
  },
  {
    id: "creator", tone: "dark",
    bg: "radial-gradient(100% 100% at 85% 20%,#ff8fbf 0%,#e4467e 40%,#7a2cc2 100%)",
    eyebrow: { ru: "Выбор креаторов", uz: "Kreatorlar tanlovi" },
    title: { ru: "−10% по коду MADINA", uz: "MADINA kodi bilan −10%" },
    text: { ru: "Любимый уход Мадины: эссенция, санскрин и крем с церамидами.", uz: "Madinaning sevimli parvarishi: essensiya, SPF va seramidli krem." },
    cta: { ru: "Смотреть подборку", uz: "To'plamni ko'rish" }, href: "/catalog?creator=MADINA", products: ["1", "13", "5"],
  },
  {
    id: "hydra", tone: "light",
    bg: "radial-gradient(110% 90% at 78% 25%,#e3f1ff 0%,#c4dcf5 45%,#b9c8f0 80%,#d6c9f2 100%)",
    eyebrow: { ru: "Увлажнение", uz: "Namlash" },
    title: { ru: "Кожа не тянет даже зимой", uz: "Qishda ham teri tortilmaydi" },
    text: { ru: "Гиалуроновые сыворотки, ночные маски и кремы с церамидами.", uz: "Gialuron zardoblari, tungi niqoblar va seramidli kremlar." },
    cta: { ru: "Выбрать увлажнение", uz: "Namlashni tanlash" }, href: "/catalog?concern=dryness", products: ["5", "11", "13"],
  },
];

const DELAY = 5500;
const SPEED = 800;

function SlideArt({ ids, active }: { ids: string[]; active: boolean }) {
  const pos = [
    { l: "6%", t: "18%", r: "-8deg", d: "0s" },
    { l: "30%", t: "0%", r: "5deg", d: "-1.5s" },
    { l: "54%", t: "22%", r: "-4deg", d: "-3s" },
    { l: "76%", t: "6%", r: "9deg", d: "-4.5s" },
  ];
  return (
    <div className={`relative h-full w-full ${active ? "hero-art-in" : "opacity-0"}`}>
      {ids.map((id, i) => {
        const p = getById(id)!;
        const s = pos[i % pos.length];
        return (
          <div key={id} className="float absolute h-[78%] w-[26%]" style={{ left: s.l, top: s.t, ["--r" as string]: s.r, animationDelay: s.d }}>
            <ProductVisual pack={p.pack} color={p.color} brand={p.brand} />
          </div>
        );
      })}
    </div>
  );
}

export function HeroCarousel() {
  const { lang } = useI18n();
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
    if (!auto || paused) return;
    const id = setTimeout(() => go(pos + 1), DELAY);
    return () => clearTimeout(id);
  }, [auto, paused, pos, go]);

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
          {tape.map((s, i) => {
            const active = i === pos;
            const d = s.tone === "dark";
            return (
              <div key={`${s.id}-${i}`} className="relative h-full w-full shrink-0" style={{ background: s.bg }} aria-hidden={!active} role="group" aria-roledescription="slide">
                {s.image && (
                  <picture>
                    <source media="(min-width: 768px)" srcSet={s.image.desktop} />
                    <img src={s.image.mobile} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
                  </picture>
                )}
                {/* декоративная сетка */}
                <div aria-hidden className="pointer-events-none absolute inset-0">
                  <div className={`absolute inset-x-0 top-[58%] h-px md:top-[64.5%] ${d ? "bg-white/25" : "bg-white/70"}`} />
                  <div className={`absolute inset-y-0 left-1/2 hidden w-px md:block ${d ? "bg-white/25" : "bg-white/70"}`} />
                </div>
                <div className="wrap relative grid h-full grid-rows-[auto_1fr] pt-[96px] md:grid-cols-2 md:grid-rows-1 md:items-center md:pb-24 md:pt-[150px]">
                  <div key={active ? `in-${pos}` : "idle"} className={`max-w-[560px] ${active ? "hero-in" : ""} ${d ? "text-white" : "text-ink"}`}>
                    <p className={`text-[12px] font-semibold uppercase tracking-[0.14em] md:text-[13px] ${d ? "text-white/70" : "text-ink/60"}`}>{s.eyebrow[lang]}</p>
                    <h2 className="mt-3 text-[34px] font-bold leading-[1.02] tracking-[-0.02em] text-balance md:text-[60px]">{s.title[lang]}</h2>
                    <p className={`mt-4 max-w-[44ch] text-[15px] md:text-[19px] ${d ? "text-white/80" : "text-ink/75"}`}>{s.text[lang]}</p>
                    <Link
                      href={`/${lang}${s.href}`}
                      tabIndex={active ? 0 : -1}
                      onClick={() => track("hero_click", { slide: s.id })}
                      className="mt-6 inline-flex h-14 items-center gap-2 rounded-card bg-accent px-6 text-[16px] font-semibold text-white shadow-float transition hover:bg-accent-dark active:scale-95 md:h-[68px] md:px-8 md:text-[18px]"
                    >
                      {s.cta[lang]} <Icon name="arrowR" size={20} />
                    </Link>
                  </div>
                  <div className="relative mx-auto h-[160px] w-full max-w-[420px] md:h-[400px] md:max-w-none">
                    <SlideArt ids={s.products} active={active} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Пагинация-капсула со стрелками */}
        <div className={`absolute bottom-[112px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full border px-1.5 py-1 backdrop-blur-sm md:bottom-[124px] ${dark ? "border-white/40 bg-white/10" : "border-ink/15 bg-white/30"}`}>
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
