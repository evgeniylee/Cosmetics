"use client";
import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/data/catalog";
import { parseKey, withVariant } from "@/lib/variants";

export type FeaturedCreator = { code: string; name: string; handle: string | null; percent: number; picks: string[] };
type CatalogData = { products: Product[]; brands: string[]; creator: FeaturedCreator | null };

const Ctx = createContext<CatalogData>({ products: [], brands: [], creator: null });

export function CatalogProvider({ value, children }: { value: CatalogData; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Каталог из базы, загруженный сервером для текущей страницы. */
export function useCatalog() {
  const c = useContext(Ctx);
  return useMemo(() => {
    const byIdMap = new Map(c.products.map((p) => [p.id, p]));
    return {
      ...c,
      byId: (id: string) => byIdMap.get(id),
      /** Товар по ключу корзины ("товар" или "товар~вариант"), развёрнутый под вариант. */
      byKey: (key: string) => {
        const { pid, vid } = parseKey(key);
        const p = byIdMap.get(pid);
        return p ? withVariant(p, vid) : undefined;
      },
      bySlug: (slug: string) => c.products.find((p) => p.slug === slug),
    };
  }, [c]);
}
