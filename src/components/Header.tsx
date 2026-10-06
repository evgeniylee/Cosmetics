"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

export function Header() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const city = useShop((s) => s.city);
  const setSearch = useUi((s) => s.setSearch);
  const count = useCartCount();
  const hydrated = useHydrated();
  const [bump, setBump] = useState(false);
  const other = lang === "ru" ? "uz" : "ru";
  const switchHref = pathname.replace(/^\/(ru|uz)/, `/${other}`);
  const cityName = CITIES.find((c) => c.id === (hydrated ? city : "tashkent"))?.[lang];

  useEffect(() => {
    if (!count) return;
    setBump(true);
    const id = setTimeout(() => setBump(false), 400);
    return () => clearTimeout(id);
  }, [count]);

  return (
    <>
      <div className="bg-ink text-white">
        <p className="wrap truncate py-1.5 text-center text-[12px] md:text-[13px]">{t.topStrip}</p>
      </div>
      <header className="sticky top-[env(safe-area-inset-top,0px)] z-40 px-2 pt-2 md:px-5 md:pt-3">
        <div className="mx-auto max-w-[1400px] rounded-card border border-line bg-white/90 shadow-float backdrop-blur-md">
          <div className="flex h-14 items-center gap-2 px-3 md:h-[68px] md:gap-4 md:px-5">
            <div className="hidden items-center gap-4 md:flex">
              <span className="flex items-center gap-1.5 text-[14px] text-accent">
                <Icon name="pin" size={18} /> {cityName}
              </span>
              <span className="h-8 w-px bg-line" />
              <Link href={`/${lang}/catalog`} className="flex h-9 items-center gap-2 rounded-full bg-accent px-4 text-[14px] font-medium text-white hover:bg-accent-dark">
                <Icon name="menu" size={18} /> {t.catalog}
              </Link>
            </div>
            <Link href={`/${lang}`} className="md:absolute md:left-1/2 md:-translate-x-1/2" aria-label="NABI">
              <Logo className="text-[24px] md:text-[28px]" />
            </Link>
            <button
              type="button"
              onClick={() => setSearch(true)}
              className="ml-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-3.5 text-left text-[14px] text-muted md:hidden"
            >
              <Icon name="search" size={18} className="shrink-0 text-ink" />
              <span className="truncate">{t.searchPh}</span>
            </button>
            <div className="ml-auto hidden items-center gap-1 text-accent md:flex">
              <button type="button" onClick={() => setSearch(true)} aria-label={t.searchPh} className="grid size-11 place-items-center rounded-full hover:bg-accent-soft">
                <Icon name="search" />
              </button>
              <Link href={`/${lang}/catalog?fav=1`} aria-label={t.favorites} className="grid size-11 place-items-center rounded-full hover:bg-accent-soft">
                <Icon name="heart" />
              </Link>
              <Link href={`/${lang}/cart`} aria-label={t.cart} className="relative grid size-11 place-items-center rounded-full hover:bg-accent-soft">
                <Icon name="bag" />
                {count > 0 && <span className={`absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white tabular ${bump ? "anim-bump" : ""}`}>{count}</span>}
              </Link>
              <Link href={`/${lang}/account`} aria-label={t.profile} className="grid size-11 place-items-center rounded-full hover:bg-accent-soft">
                <Icon name="user" />
              </Link>
              <Link href={switchHref} className="ml-1 grid h-9 place-items-center rounded-full border border-line px-3 text-[13px] font-semibold uppercase text-ink hover:border-accent">
                {other}
              </Link>
            </div>
            <Link href={switchHref} className="grid h-9 shrink-0 place-items-center rounded-full border border-line px-2.5 text-[12px] font-semibold uppercase md:hidden">
              {other}
            </Link>
          </div>
        </div>
      </header>
    </>
  );
}

export function BottomNav() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const count = useCartCount();
  const items = [
    { href: `/${lang}`, icon: "home", label: t.home, active: pathname === `/${lang}` },
    { href: `/${lang}/catalog`, icon: "menu", label: t.catalog, active: pathname.startsWith(`/${lang}/catalog`) },
    { href: `/${lang}/quiz`, icon: "spark", label: t.quiz, active: pathname.startsWith(`/${lang}/quiz`) },
    { href: `/${lang}/cart`, icon: "bag", label: t.cart, active: pathname.startsWith(`/${lang}/cart`), badge: count },
    { href: `/${lang}/account`, icon: "user", label: t.profile, active: pathname.startsWith(`/${lang}/account`) },
  ];
  if (pathname.includes("/checkout")) return null;
  return (
    <nav className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom,0px))] z-40 md:hidden" aria-label="Навигация">
      <ul className="grid grid-cols-5 rounded-card border border-line bg-white/95 py-1.5 shadow-float backdrop-blur-md">
        {items.map((it) => (
          <li key={it.icon}>
            <Link href={it.href} className={`relative flex flex-col items-center gap-0.5 py-1 text-[11px] ${it.active ? "text-accent" : "text-ink/70"}`}>
              <span className={`grid h-8 w-12 place-items-center rounded-xl ${it.active ? "bg-accent-soft" : ""}`}>
                <Icon name={it.icon} size={22} />
              </span>
              {it.label}
              {!!it.badge && <span className="absolute right-3 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white tabular">{it.badge}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
