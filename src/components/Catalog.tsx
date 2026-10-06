"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { BRANDS, CATEGORIES, CONCERNS, PRODUCTS, SKIN_TYPES, type Product } from "@/data/catalog";
import { search } from "@/lib/search";
import { track } from "@/lib/analytics";
import { useHydrated, useShop } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { ProductCard } from "./ProductCard";

type Params = { cat?: string; skin?: string; concern?: string; brand?: string; q?: string; sort?: string; fav?: string; creator?: string };
const PAGE = 8;

function apply(params: Params, favorites: string[]): Product[] {
  let list = params.q ? search(params.q).products : [...PRODUCTS];
  if (params.cat) list = list.filter((p) => p.cat === params.cat);
  if (params.skin) list = list.filter((p) => p.skin.includes(params.skin as never));
  if (params.concern) list = list.filter((p) => p.concerns.includes(params.concern as never));
  if (params.brand) list = list.filter((p) => p.brand === params.brand);
  if (params.fav) list = list.filter((p) => favorites.includes(p.id));
  if (params.creator) list = list.filter((p) => ["1", "2", "5", "13"].includes(p.id));
  const s = params.sort || (params.q ? "relevance" : "popular");
  if (s === "popular") list.sort((a, b) => b.reviews - a.reviews);
  if (s === "cheap") list.sort((a, b) => a.price - b.price);
  if (s === "expensive") list.sort((a, b) => b.price - a.price);
  if (s === "rating") list.sort((a, b) => b.rating - a.rating);
  if (s === "new") list.sort((a, b) => Number(b.badge === "new") - Number(a.badge === "new"));
  return list;
}

export function Catalog({ params }: { params: Params }) {
  const { lang, t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useHydrated();
  const favorites = useShop((s) => s.favorites);
  const [limit, setLimit] = useState(PAGE);
  const [sheet, setSheet] = useState(false);
  const [draft, setDraft] = useState<Params>(params);

  const list = useMemo(() => apply(params, hydrated ? favorites : []), [params, favorites, hydrated]);
  const draftCount = useMemo(() => apply(draft, hydrated ? favorites : []).length, [draft, favorites, hydrated]);

  const set = (next: Params) => {
    const q = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && q.set(k, v));
    router.push(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
    setLimit(PAGE);
  };
  const toggle = (key: keyof Params, value: string) => {
    const next = { ...params, [key]: params[key] === value ? undefined : value };
    track("filter_apply", { filter: key, value, results_count: apply(next, favorites).length });
    set(next);
  };

  const category = CATEGORIES.find((c) => c.id === params.cat);
  const title = params.q ? `«${params.q}»` : params.fav ? t.favorites : category ? category.name[lang] : t.catalog;
  const groups = [
    { key: "skin" as const, label: t.skinType, opts: SKIN_TYPES.map((s) => ({ v: s.id, l: s.name[lang] })) },
    { key: "concern" as const, label: t.concern, opts: CONCERNS.map((s) => ({ v: s.id, l: s.name[lang] })) },
    { key: "brand" as const, label: t.brand, opts: BRANDS.map((b) => ({ v: b, l: b })) },
  ];
  const activeChips = (["cat", "skin", "concern", "brand", "q", "fav"] as const).filter((k) => params[k]);
  const sorts = [["popular", t.sortPopular], ["new", t.sortNew], ["cheap", t.sortCheap], ["expensive", t.sortExpensive], ["rating", t.sortRating]] as const;
  const label = (k: keyof Params, v: string) => {
    if (k === "cat") return CATEGORIES.find((c) => c.id === v)?.name[lang];
    if (k === "skin") return SKIN_TYPES.find((c) => c.id === v)?.name[lang];
    if (k === "concern") return CONCERNS.find((c) => c.id === v)?.name[lang];
    if (k === "fav") return t.favorites;
    return v;
  };

  return (
    <div>
      <div className="-mt-[76px] rounded-b-[32px] bg-surface pb-8 pt-[100px] md:-mt-[92px] md:rounded-b-block md:pb-12 md:pt-[130px]">
        <div className="wrap">
          <nav className="text-[13px] text-muted"><Link href={`/${lang}`}>{t.home}</Link> / <span>{t.catalog}</span></nav>
          <h1 className="h-section mt-3">{title}</h1>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
            <Link href={`/${lang}/catalog`} className={`shrink-0 rounded-full px-4 py-2 text-[14px] ${!params.cat ? "bg-ink text-white" : "bg-white"}`}>{t.all}</Link>
            {CATEGORIES.map((c) => (
              <button key={c.id} type="button" onClick={() => toggle("cat", c.id)} className={`shrink-0 rounded-full px-4 py-2 text-[14px] ${params.cat === c.id ? "bg-ink text-white" : "bg-white hover:bg-line"}`}>{c.name[lang]}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap mt-6">
        {/* Десктоп: фильтры таблетками-дропдаунами */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {groups.map((g) => (
            <details key={g.key} className="group relative">
              <summary className={`flex h-11 cursor-pointer list-none items-center gap-2 rounded-full px-4 text-[15px] ${params[g.key] ? "bg-accent-soft text-accent" : "bg-surface"}`}>
                {g.label} <Icon name="down" size={18} className="transition group-open:rotate-180" />
              </summary>
              <div className="absolute left-0 top-12 z-20 max-h-80 w-64 overflow-auto rounded-card border border-line bg-white p-2 shadow-float">
                {g.opts.map((o) => (
                  <button key={o.v} type="button" onClick={() => toggle(g.key, o.v)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[14px] hover:bg-surface ${params[g.key] === o.v ? "font-semibold text-accent" : ""}`}>
                    {o.l} {params[g.key] === o.v && <Icon name="check" size={16} />}
                  </button>
                ))}
              </div>
            </details>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button type="button" onClick={() => { setDraft(params); setSheet(true); }} className="flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-[14px] md:hidden">
            <Icon name="filter" size={18} /> {t.filters}
            {activeChips.length > 0 && <span className="grid size-5 place-items-center rounded-full bg-accent text-[11px] font-bold text-white">{activeChips.length}</span>}
          </button>
          <span className="whitespace-nowrap text-[14px] text-muted">{t.products(list.length)}</span>
          <label className="ml-auto flex min-w-0 items-center gap-1 text-[14px]">
            <span className="sr-only">{t.sort}</span>
            <select id="sort" value={params.sort || "popular"} onChange={(e) => set({ ...params, sort: e.target.value })} className="h-10 min-w-0 max-w-[150px] rounded-full bg-surface px-3 text-[14px] outline-none md:max-w-none">
              {sorts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
        </div>

        {activeChips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {activeChips.map((k) => (
              <button key={k} type="button" onClick={() => set({ ...params, [k]: undefined })} className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] text-accent">
                {label(k, params[k]!)} <Icon name="close" size={14} />
              </button>
            ))}
            <button type="button" onClick={() => set({})} className="px-2 text-[13px] text-muted underline">{t.reset}</button>
          </div>
        )}

        {list.length === 0 ? (
          <div className="mt-8 rounded-panel bg-surface p-6">
            <p className="font-semibold">{params.q ? `${t.searchNone} «${params.q}»` : t.searchNone}</p>
            <p className="mt-1 text-[14px] text-ink/70">{t.searchNoneHint}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-[30px]">
              {PRODUCTS.slice(0, 4).map((p) => <ProductCard key={p.id} p={p} source="no_results" />)}
            </div>
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-[30px] md:gap-y-12 lg:grid-cols-4">
              {list.slice(0, limit).map((p) => <ProductCard key={p.id} p={p} source={params.q ? "search" : "catalog"} />)}
            </div>
            {limit < list.length && (
              <button type="button" onClick={() => setLimit((l) => l + PAGE)} className="mx-auto mt-10 block h-12 rounded-full bg-surface px-8 font-semibold hover:bg-line">{t.showMore}</button>
            )}
          </>
        )}
      </div>

      {/* Мобильные фильтры: bottom-sheet с живым счётчиком */}
      {sheet && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label={t.filters}>
          <div className="absolute inset-0 bg-ink/30 anim-fade" onClick={() => setSheet(false)} />
          <div className="anim-sheet absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-panel bg-white">
            <div className="flex items-center justify-between border-b border-line p-4">
              <p className="text-[18px] font-bold">{t.filters}</p>
              <button type="button" onClick={() => setDraft({ q: params.q })} className="text-[14px] text-muted">{t.reset}</button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              {groups.map((g) => (
                <div key={g.key}>
                  <p className="mb-2 font-semibold">{g.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {g.opts.map((o) => (
                      <button key={o.v} type="button" onClick={() => setDraft((d) => ({ ...d, [g.key]: d[g.key] === o.v ? undefined : o.v }))} className={`rounded-full px-3.5 py-2 text-[14px] ${draft[g.key] === o.v ? "bg-ink text-white" : "bg-surface"}`}>
                        {o.l}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-line p-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))]">
              <button type="button" onClick={() => { setSheet(false); set(draft); track("filter_apply", { filter: "sheet", results_count: draftCount }); }} className="h-12 w-full rounded-card bg-accent font-semibold text-white">
                {t.show(draftCount)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
