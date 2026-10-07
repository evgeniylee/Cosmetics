"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { POPULAR_QUERIES, catName, concernName, search } from "@/lib/search";
import { money } from "@/lib/shop";
import { track } from "@/lib/analytics";
import { useHydrated, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductImage } from "./ProductVisual";
import { useCatalog } from "./CatalogProvider";

export function SearchOverlay() {
  const { lang, t } = useI18n();
  const open = useUi((s) => s.searchOpen);
  const setOpen = useUi((s) => s.setSearch);
  const recentQueries = useShop((s) => s.recentQueries);
  const searched = useShop((s) => s.searched);
  const hydrated = useHydrated();
  const router = useRouter();
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const { products } = useCatalog();
  const res = useMemo(() => search(q, products), [q, products]);

  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, setOpen]);

  // Логируем запрос после паузы в наборе, отдельно — запросы без результатов.
  useEffect(() => {
    if (q.trim().length < 2) return;
    const id = setTimeout(() => {
      track(res.products.length ? "search" : "search_no_results", { query: q.trim(), results_count: res.products.length, lang });
    }, 800);
    return () => clearTimeout(id);
  }, [q, res.products.length, lang]);

  if (!open) return null;

  const go = (query: string) => {
    if (!query.trim()) return;
    searched(query.trim());
    setOpen(false);
    router.push(`/${lang}/catalog?q=${encodeURIComponent(query.trim())}`);
  };
  const close = () => { setOpen(false); setQ(""); };

  return (
    <div className="fixed inset-0 z-[80] anim-fade" role="dialog" aria-modal="true" aria-label={t.searchPh}>
      <div className="absolute inset-0 bg-ink/30" onClick={close} />
      <div className="relative mx-auto max-h-[100dvh] max-w-[860px] overflow-y-auto bg-white pb-6 md:mt-4 md:rounded-panel md:shadow-float">
        <form
          onSubmit={(e) => { e.preventDefault(); go(q); }}
          className="sticky top-0 z-10 flex items-center gap-2 border-b border-line bg-white p-3 pt-[calc(12px+env(safe-area-inset-top,0px))] md:p-4"
        >
          <div className="flex h-12 flex-1 items-center gap-2 rounded-full bg-surface px-4">
            <Icon name="search" size={20} />
            <input
              ref={input}
              id="site-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPh}
              className="h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted focus-visible:outline-none"
              autoComplete="off"
              enterKeyHint="search"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t.reset} className="text-muted">
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
          <button type="button" onClick={close} className="px-2 text-[14px] font-medium text-accent">✕</button>
        </form>

        <div className="space-y-6 p-4 md:p-6">
          {q.trim().length < 2 ? (
            <>
              {hydrated && recentQueries.length > 0 && (
                <Chips title={t.searchRecent} items={recentQueries} onPick={(x) => { setQ(x); }} />
              )}
              <Chips title={t.searchPopular} items={POPULAR_QUERIES[lang]} onPick={(x) => setQ(x)} />
            </>
          ) : res.products.length === 0 ? (
            <div className="rounded-card bg-surface p-5">
              <p className="font-semibold">{t.searchNone} «{q}»</p>
              <p className="mt-1 text-[14px] text-ink/70">{t.searchNoneHint}</p>
              <a href="https://t.me/" target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 items-center gap-2 rounded-full bg-accent px-4 text-[14px] font-medium text-white">
                <Icon name="telegram" size={18} /> {t.askTg}
              </a>
            </div>
          ) : (
            <>
              {(res.categories.length > 0 || res.concerns.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {res.categories.map((c) => (
                    <Link key={c} onClick={close} href={`/${lang}/catalog?cat=${c}`} className="rounded-full bg-accent-soft px-3.5 py-1.5 text-[14px] text-accent">{catName(c, lang)}</Link>
                  ))}
                  {res.concerns.map((c) => (
                    <Link key={c} onClick={close} href={`/${lang}/catalog?concern=${c}`} className="rounded-full bg-accent-soft px-3.5 py-1.5 text-[14px] text-accent">{concernName(c, lang)}</Link>
                  ))}
                </div>
              )}
              <div>
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{t.searchProducts}</p>
                <ul className="divide-y divide-line">
                  {res.products.slice(0, 6).map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/${lang}/p/${p.slug}`}
                        onClick={() => { searched(q.trim()); track("select_item", { item_id: p.id, source: "search_suggest" }); close(); }}
                        className="flex items-center gap-3 py-2.5"
                      >
                        <span className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface"><ProductImage p={p} brand={false} /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">{p.brand} {p.name}</span>
                          <span className="text-[13px] text-muted">{p.type[lang]}</span>
                        </span>
                        <span className="shrink-0 font-bold tabular">{money(p.price, lang)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
              <button type="button" onClick={() => go(q)} className="h-12 w-full rounded-card bg-ink font-semibold text-white">
                {t.searchAll} ({res.products.length})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Chips({ title, items, onPick }: { title: string; items: string[]; onPick: (x: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <button key={x} type="button" onClick={() => onPick(x)} className="rounded-full bg-surface px-3.5 py-1.5 text-[14px] hover:bg-line">{x}</button>
        ))}
      </div>
    </div>
  );
}
