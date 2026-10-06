"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/data/menu";
import { CITIES } from "@/lib/shop";
import { useHydrated, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline gap-1 font-bold tracking-[0.04em] ${className}`}>
      NABI<span className="text-accent">.</span>
    </span>
  );
}

function useCartCount() {
  const hydrated = useHydrated();
  const n = useShop((s) => Object.values(s.cart).reduce((a, b) => a + b, 0));
  return hydrated ? n : 0;
}

/** true, пока страница в самом верху. */
function useAtTop() {
  const [top, setTop] = useState(true);
  useEffect(() => {
    const on = () => setTop(window.scrollY < 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return top;
}

/** Иконка «бургер ↔ крестик» с анимацией. */
function Burger({ open }: { open: boolean }) {
  const line = "absolute left-0 h-[2px] w-[18px] rounded-full bg-current transition-all duration-300 ease-[cubic-bezier(.2,.8,.2,1)]";
  return (
    <span className="relative block h-[14px] w-[18px]" aria-hidden>
      <span className={`${line} ${open ? "top-[6px] rotate-45" : "top-0"}`} />
      <span className={`${line} top-[6px] ${open ? "scale-x-0 opacity-0" : ""}`} />
      <span className={`${line} ${open ? "top-[6px] -rotate-45" : "top-[12px]"}`} />
    </span>
  );
}

export function Header() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const city = useShop((s) => s.city);
  const setSearch = useUi((s) => s.setSearch);
  const menuOpen = useUi((s) => s.menuOpen);
  const setMenu = useUi((s) => s.setMenu);
  const heroTone = useUi((s) => s.heroTone);
  const count = useCartCount();
  const hydrated = useHydrated();
  const atTop = useAtTop();
  const [bump, setBump] = useState(false);
  const other = lang === "ru" ? "uz" : "ru";
  const switchHref = pathname.replace(/^\/(ru|uz)/, `/${other}`);
  const cityName = CITIES.find((c) => c.id === (hydrated ? city : "tashkent"))?.[lang];

  // Прозрачная шапка — только в самом верху и когда меню закрыто.
  const clear = atTop && !menuOpen;
  // Белый текст — когда шапка прозрачная поверх тёмного слайда главной.
  const onDark = clear && heroTone === "dark" && pathname === `/${lang}`;

  useEffect(() => {
    if (!count) return;
    setBump(true);
    const id = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(id);
  }, [count]);

  useEffect(() => setMenu(false), [pathname, setMenu]);

  const iconBtn = `grid size-11 place-items-center rounded-full transition-colors duration-200 ${onDark ? "hover:bg-white/15" : "hover:bg-accent-soft"}`;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-[env(safe-area-inset-top,0px)] z-[60] px-2 pt-2 md:px-5 md:pt-5">
      <div
        className={`pointer-events-auto mx-auto max-w-[1400px] overflow-hidden rounded-card transition-[background-color,box-shadow,color] duration-300 ${
          clear
            ? `bg-transparent ${onDark ? "text-white shadow-[0_0_0_1px_rgba(255,255,255,.45)]" : "text-ink shadow-[0_0_0_1px_rgba(17,17,17,.15)]"} delay-[0ms,0ms,0ms]`
            : "bg-white/95 text-ink shadow-[0_0_0_1px_rgba(17,17,17,.08),0_12px_40px_rgba(17,17,17,.08)] backdrop-blur-md"
        }`}
      >
        <div className="relative flex h-14 items-center gap-2 px-3 md:h-[68px] md:gap-4 md:px-5">
          <div className="hidden h-full items-center gap-4 md:flex">
            <span className={`flex items-center gap-1.5 text-[14px] ${onDark ? "text-white" : "text-accent"}`}>
              <Icon name="pin" size={18} /> {cityName}
            </span>
            <span className={`h-full w-px ${onDark ? "bg-white/40" : "bg-ink/12"}`} />
            <button
              type="button"
              onClick={() => setMenu(!menuOpen)}
              aria-expanded={menuOpen}
              aria-controls="mega-menu"
              className="flex h-9 items-center gap-2.5 rounded-full bg-accent px-4 text-[14px] font-medium text-white transition hover:bg-accent-dark active:scale-95"
            >
              <Burger open={menuOpen} /> {t.catalog}
            </button>
          </div>
          <Link href={`/${lang}`} className="md:absolute md:left-1/2 md:-translate-x-1/2" aria-label="NABI">
            <Logo className={`text-[24px] md:text-[28px] ${onDark ? "[&>span]:text-white" : ""}`} />
          </Link>
          <button
            type="button"
            onClick={() => setSearch(true)}
            className={`ml-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full px-3.5 text-left text-[14px] transition-colors md:hidden ${onDark ? "bg-white/20 text-white/85" : clear ? "bg-white/60 text-muted" : "bg-surface text-muted"}`}
          >
            <Icon name="search" size={18} className="shrink-0" />
            <span className="truncate">{t.searchPh}</span>
          </button>
          <div className={`ml-auto hidden items-center gap-1 md:flex ${onDark ? "text-white" : "text-accent"}`}>
            <button type="button" onClick={() => setSearch(true)} aria-label={t.searchPh} className={iconBtn}>
              <Icon name="search" />
            </button>
            <Link href={`/${lang}/catalog?fav=1`} aria-label={t.favorites} className={iconBtn}>
              <Icon name="heart" />
            </Link>
            <Link href={`/${lang}/cart`} aria-label={t.cart} className={`relative ${iconBtn}`}>
              <Icon name="bag" />
              {count > 0 && <span className={`absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white tabular ${bump ? "anim-bump" : ""}`}>{count}</span>}
            </Link>
            <Link href={`/${lang}/account`} aria-label={t.profile} className={iconBtn}>
              <Icon name="user" />
            </Link>
            <Link href={switchHref} className={`ml-1 grid h-9 place-items-center rounded-full border px-3 text-[13px] font-semibold uppercase transition-colors ${onDark ? "border-white/50 text-white" : "border-line text-ink hover:border-accent"}`}>
              {other}
            </Link>
          </div>
          <Link href={switchHref} className={`grid h-9 shrink-0 place-items-center rounded-full border px-2.5 text-[12px] font-semibold uppercase md:hidden ${onDark ? "border-white/50" : "border-line"}`}>
            {other}
          </Link>
        </div>

        {/* Вторая строка: видна только в самом верху страницы и только на десктопе */}
        <nav
          aria-label={t.catalog}
          className={`hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] md:block ${clear ? "max-h-14 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <ul className={`no-scrollbar flex h-[52px] items-center justify-center gap-7 overflow-x-auto border-t px-5 text-[15px] ${onDark ? "border-white/40" : "border-ink/12"}`}>
            {NAV_LINKS.map((l, i) => (
              <li key={l.href + i} className="shrink-0">
                <Link href={`/${lang}${l.href}`} className={`transition-colors hover:text-accent ${i === NAV_LINKS.length - 1 ? (onDark ? "text-white underline underline-offset-4" : "text-accent") : ""}`}>
                  {l.label[lang]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

/** Отступ под фиксированную шапку. Страницы с баннером под шапкой его компенсируют. */
export function HeaderSpacer() {
  return <div aria-hidden className="h-[72px] md:h-[160px]" />;
}

export function BottomNav() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const count = useCartCount();
  const menuOpen = useUi((s) => s.menuOpen);
  const setMenu = useUi((s) => s.setMenu);
  if (pathname.includes("/checkout")) return null;
  const items = [
    { href: `/${lang}`, icon: "home", label: t.home, active: !menuOpen && pathname === `/${lang}` },
    { icon: "menu", label: t.catalog, active: menuOpen, onClick: () => setMenu(!menuOpen) },
    { href: `/${lang}/quiz`, icon: "spark", label: t.quiz, active: !menuOpen && pathname.startsWith(`/${lang}/quiz`) },
    { href: `/${lang}/cart`, icon: "bag", label: t.cart, active: !menuOpen && pathname.startsWith(`/${lang}/cart`), badge: count },
    { href: `/${lang}/account`, icon: "user", label: t.profile, active: !menuOpen && pathname.startsWith(`/${lang}/account`) },
  ];
  const inner = (it: (typeof items)[number]) => (
    <>
      <span className={`grid h-8 w-12 place-items-center rounded-xl transition-colors duration-200 ${it.active ? "bg-accent-soft" : ""}`}>
        {it.icon === "menu" ? <Burger open={menuOpen} /> : <Icon name={it.icon} size={22} />}
      </span>
      {it.label}
      {!!it.badge && <span className="absolute right-3 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white tabular">{it.badge}</span>}
    </>
  );
  const cls = (a: boolean) => `relative flex w-full flex-col items-center gap-0.5 py-1 text-[11px] transition-colors active:scale-95 ${a ? "text-accent" : "text-ink/70"}`;
  return (
    <nav className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom,0px))] z-[70] md:hidden" aria-label="Навигация">
      <ul className="grid grid-cols-5 rounded-card border border-line bg-white/95 py-1.5 shadow-float backdrop-blur-md">
        {items.map((it) => (
          <li key={it.icon}>
            {it.onClick ? (
              <button type="button" onClick={it.onClick} aria-expanded={menuOpen} aria-controls="mobile-menu" className={cls(it.active)}>{inner(it)}</button>
            ) : (
              <Link href={it.href!} onClick={() => setMenu(false)} className={cls(it.active)}>{inner(it)}</Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
