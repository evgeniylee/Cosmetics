"use client";
import { brandSlug } from "@/lib/slug";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useCatalog } from "./CatalogProvider";
import { MENU, type MenuSection } from "@/data/menu";
import { track } from "@/lib/analytics";
import { useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

const T = {
  all: { ru: "Смотреть все", uz: "Barchasini ko'rish" },
  back: { ru: "Назад", uz: "Orqaga" },
  catalog: { ru: "Каталог", uz: "Katalog" },
  brandsSearch: { ru: "Найти бренд", uz: "Brendni topish" },
  popular: { ru: "Все бренды", uz: "Barcha brendlar" },
  nothing: { ru: "Бренд не найден", uz: "Brend topilmadi" },
};

/** Блокирует прокрутку страницы, пока открыт оверлей. */
function useScrollLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [on]);
}

function BrandsPanel({ onPick }: { onPick: () => void }) {
  const { lang } = useI18n();
  const [q, setQ] = useState("");
  const [letter, setLetter] = useState<string | null>(null);
  const { brands: BRANDS } = useCatalog();
  const letters = useMemo(() => Array.from(new Set(BRANDS.map((b) => (/[0-9]/.test(b[0]) ? "0–9" : b[0].toUpperCase())))).sort(), [BRANDS]);
  const list = BRANDS.filter((b) => (!q || b.toLowerCase().includes(q.toLowerCase())) && (!letter || b.toUpperCase().startsWith(letter) || (letter === "0–9" && /[0-9]/.test(b[0]))));
  return (
    <div>
      <div className="flex items-center gap-4">
        <h2 className="text-[28px] font-bold md:text-[42px]">{lang === "ru" ? "Бренды" : "Brendlar"}</h2>
        <label className="flex h-11 flex-1 items-center gap-2 rounded-full bg-surface px-4 md:max-w-[280px]">
          <Icon name="search" size={18} />
          <span className="sr-only">{T.brandsSearch[lang]}</span>
          <input id="brand-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={T.brandsSearch[lang]} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none focus-visible:outline-none" />
        </label>
      </div>
      <div className="mt-5 flex flex-wrap gap-1 border-b border-line pb-4">
        {letters.map((l) => (
          <button key={l} type="button" onClick={() => setLetter(letter === l ? null : l)} className={`grid h-9 min-w-9 place-items-center rounded-full px-2 text-[15px] transition-colors ${letter === l ? "bg-ink text-white" : "hover:bg-surface"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-5 grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((b, i) => (
          <Link key={b} href={`/${lang}/brands/${brandSlug(b)}`} onClick={onPick} style={{ animationDelay: `${i * 18}ms` }} className="menu-item-in rounded-lg py-2 text-[16px] transition-colors hover:text-accent">
            {b}
          </Link>
        ))}
        {list.length === 0 && <p className="text-muted">{T.nothing[lang]}</p>}
      </div>
      <Link href={`/${lang}/brands`} onClick={onPick} className="mt-4 inline-flex h-11 items-center rounded-full bg-ink px-5 text-[15px] font-semibold text-white">{lang === "ru" ? "Все бренды →" : "Barcha brendlar →"}</Link>
    </div>
  );
}

function SectionPanel({ s, onPick }: { s: MenuSection; onPick: () => void }) {
  const { lang } = useI18n();
  if (s.brands) return <BrandsPanel onPick={onPick} />;
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
      <div>
        <div className="flex items-center gap-4">
          <h2 className="text-[28px] font-bold md:text-[42px]">{s.label[lang]}</h2>
          <Link href={`/${lang}${s.href}`} onClick={onPick} className="flex h-9 items-center gap-1 rounded-full bg-surface pl-3.5 pr-2 text-[14px] hover:bg-line">
            {T.all[lang]} <Icon name="chevron" size={16} />
          </Link>
        </div>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {s.columns?.map((c) => (
            <div key={c.title.ru}>
              <p className="text-[15px] font-bold">{c.title[lang]}</p>
              <ul className="mt-3 space-y-1">
                {c.links.map((l, i) => (
                  <li key={l.href} className="menu-item-in" style={{ animationDelay: `${i * 35}ms` }}>
                    <Link href={`/${lang}${l.href}`} onClick={onPick} className="group/l inline-flex items-center gap-3 py-1.5 text-[16px] transition-colors hover:text-accent">
                      {l.img && (
                        <span className="grid size-10 place-items-center rounded-xl bg-surface transition-colors group-hover/l:bg-accent-soft">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={l.img} alt="" className="size-8 object-contain transition-transform duration-300 group-hover/l:-rotate-6 group-hover/l:scale-110" />
                        </span>
                      )}
                      {l.label[lang]}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      {s.promo && (
        <div className="hidden space-y-4 lg:block">
          {s.promo.map((p) => (
            <Link key={p.href} href={`/${lang}${p.href}`} onClick={onPick} className="group block">
              <span className="relative block aspect-[16/10] overflow-hidden rounded-card" style={{ background: p.tone }}>
                {p.image ? (
                  <img src={p.image} alt="" className="h-full w-full object-cover object-right transition-transform duration-500 group-hover:scale-105" />
                ) : p.icon ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={`/images/icons/${p.icon}.webp`} alt="" className="absolute right-[8%] top-1/2 h-[82%] -translate-y-1/2 object-contain transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105" />
                ) : null}
              </span>
              <span className="mt-3 block text-[16px] font-bold">{p.title[lang]}</span>
              <span className="block text-[14px] text-ink/70">{p.text[lang]}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Десктоп: панель выезжает сверху, разделы переключаются при наведении. */
export function MegaMenu() {
  const { lang } = useI18n();
  const open = useUi((s) => s.menuOpen);
  const setOpen = useUi((s) => s.setMenu);
  const [active, setActive] = useState(MENU[0].id);
  const [desktop, setDesktop] = useState(false);
  useScrollLock(open);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!open) return;
    track("menu_open", { device: desktop ? "desktop" : "mobile" });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen, desktop]);

  const close = () => setOpen(false);
  const section = MENU.find((m) => m.id === active)!;

  if (!desktop) return <MobileMenu open={open} close={close} />;

  return (
    <div aria-hidden={!open} className={open ? "" : "pointer-events-none"}>
      <div onClick={close} className={`fixed inset-0 z-[50] bg-ink/50 transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />
      <div
        id="mega-menu"
        role="dialog"
        aria-modal="true"
        aria-label={T.catalog[lang]}
        className={`fixed inset-x-0 top-0 z-[55] max-h-[100dvh] overflow-y-auto rounded-b-block bg-white pt-[110px] shadow-float transition-transform duration-500 ease-[cubic-bezier(.16,1.12,.3,1)] ${open ? "translate-y-0" : "-translate-y-[105%]"}`}
      >
        <div className="mx-auto grid max-w-[1400px] grid-cols-[300px_1fr] px-5 pb-12">
          <ul className="border-r border-line py-8 pr-8">
            {MENU.map((m) => {
              const on = m.id === active;
              const direct = !m.columns && !m.brands;
              const cls = `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-[17px] transition-colors duration-200 ${on && !direct ? "bg-surface" : "hover:bg-surface/70"}`;
              return (
                <li key={m.id}>
                  {direct ? (
                    <Link href={`/${lang}${m.href}`} onClick={close} className={cls}>
                      <Icon name={m.icon} size={22} className="text-ink/80" /> {m.label[lang]}
                    </Link>
                  ) : (
                    <button type="button" onMouseEnter={() => setActive(m.id)} onFocus={() => setActive(m.id)} onClick={() => setActive(m.id)} className={cls}>
                      <Icon name={m.icon} size={22} className="text-ink/80" /> {m.label[lang]}
                      <Icon name="chevron" size={18} className={`ml-auto transition-opacity ${on ? "opacity-100" : "opacity-0"}`} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <div key={active} className="anim-panel min-w-0 py-8 pl-14">
            <SectionPanel s={section} onPick={close} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Мобила: полноэкранное меню с уровнями и кнопкой «назад». */
function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
  const { lang } = useI18n();
  const [stack, setStack] = useState<string[]>([]);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  useEffect(() => { if (!open) setStack([]); }, [open]);

  const current = stack.length ? MENU.find((m) => m.id === stack[stack.length - 1]) : null;
  const go = (id: string) => { setDir("fwd"); setStack((s) => [...s, id]); };
  const back = () => { setDir("back"); setStack((s) => s.slice(0, -1)); };

  return (
    <div
      id="mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label={T.catalog[lang]}
      aria-hidden={!open}
      className={`fixed inset-0 z-[55] overflow-y-auto bg-white pb-[120px] pt-[76px] transition-[opacity,transform] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0"}`}
    >
      <div key={stack.join("/") || "root"} className={`px-4 ${dir === "fwd" ? "anim-slide-in" : "anim-slide-back"}`}>
        {current ? (
          <>
            <div className="flex items-center gap-3 py-3">
              <button type="button" onClick={back} aria-label={T.back[lang]} className="grid size-10 place-items-center rounded-full bg-surface active:scale-95"><Icon name="arrowL" size={20} /></button>
              <h2 className="text-[28px] font-bold leading-tight">{current.label[lang]}</h2>
            </div>
            {current.brands ? (
              <div className="pt-2"><BrandsPanel onPick={close} /></div>
            ) : (
              <>
                <Link href={`/${lang}${current.href}`} onClick={close} className="flex items-center justify-between border-b border-line py-4 text-[16px] font-semibold text-accent">
                  {T.all[lang]} <Icon name="chevron" size={18} />
                </Link>
                {current.columns?.map((c) => (
                  <div key={c.title.ru} className="mt-5">
                    <p className="text-[13px] font-semibold uppercase tracking-wide text-muted">{c.title[lang]}</p>
                    <ul className="mt-1">
                      {c.links.map((l, i) => (
                        <li key={l.href} className="menu-item-in" style={{ animationDelay: `${i * 30}ms` }}>
                          <Link href={`/${lang}${l.href}`} onClick={close} className="flex items-center gap-3 border-b border-line py-2.5 text-[16px]">
                            {l.img && (
                              <span className="grid size-11 place-items-center rounded-xl bg-surface">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={l.img} alt="" className="size-9 object-contain" />
                              </span>
                            )}
                            <span className="flex-1">{l.label[lang]}</span>
                            <Icon name="chevron" size={18} className="text-ink/40" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <>
            <h2 className="py-3 text-[28px] font-bold">{T.catalog[lang]}</h2>
            <ul>
              {MENU.map((m, i) => {
                const direct = !m.columns && !m.brands;
                const row = (
                  <>
                    <span className="grid size-10 place-items-center rounded-xl bg-surface"><Icon name={m.icon} size={20} /></span>
                    <span className="flex-1 text-[16px]">{m.label[lang]}</span>
                    <Icon name="chevron" size={18} className="text-ink/40" />
                  </>
                );
                return (
                  <li key={m.id} className="menu-item-in border-b border-line" style={{ animationDelay: `${i * 30}ms` }}>
                    {direct ? (
                      <Link href={`/${lang}${m.href}`} onClick={close} className="flex items-center gap-3 py-3">{row}</Link>
                    ) : (
                      <button type="button" onClick={() => go(m.id)} className="flex w-full items-center gap-3 py-3 text-left">{row}</button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
