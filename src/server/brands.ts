import "server-only";
import type { L10n } from "@/data/catalog";
import { many, one } from "./db";

export type BrandRow = {
  slug: string; name: string; country: L10n | null; tagline: L10n | null; story: L10n | null; faq: { q: L10n; a: L10n }[];
  color: string; hero_image: string | null; hero_image_mobile: string | null; logo: string | null; active: boolean; sort: number;
};

export async function brandBySlug(slug: string) {
  return (await one<BrandRow>(`SELECT * FROM brands WHERE slug = $1`, [slug])) ?? null;
}

/** Бренды, у которых есть товары на сайте, со счётчиками для витрины и меню. */
export async function publicBrands() {
  return many<BrandRow & { products: number; rating: string | null }>(
    `SELECT b.*, count(p.id)::int AS products, round(avg(p.rating) FILTER (WHERE p.reviews >= 3), 1) AS rating
     FROM brands b JOIN products p ON p.brand = b.name AND p.active
     WHERE b.active GROUP BY b.slug ORDER BY b.sort, lower(b.name)`
  );
}
