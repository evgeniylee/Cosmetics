"use client";
import { createContext, useContext, useMemo } from "react";
import type { Product } from "@/data/catalog";
import { parseKey, withVariant } from "@/lib/variants";

import type { FeaturedCreator, HomeRail, HomeVideo } from "@/lib/storefront";

export type { FeaturedCreator };
type CatalogData = { products: Product[]; brands: string[]; creator: FeaturedCreator | null; creators: FeaturedCreator[]; rails: HomeRail[]; videos: HomeVideo[] };

const Ctx = createContext<CatalogData>({ products: [], brands: [], creator: null, creators: [], rails: [], videos: [] });

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
