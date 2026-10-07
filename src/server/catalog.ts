// Каталог из базы. Витрина получает его один раз на запрос через getPublicCatalog() (кэш в памяти
// процесса, сбрасывается при любом изменении в админке).
import "server-only";
import type { CategoryId, Concern, L10n, Pack, Product, SkinType } from "@/data/catalog";
import { many } from "./db";

export type ProductRow = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  category: string;
  skin: string[];
  concerns: string[];
  volume: string | number;
  unit: string;
  price: string | number;
  old_price: string | number | null;
  cost_price: string | number | null;
  stock: string;
  active: boolean;
  badge: string | null;
  rating: string | number;
  reviews: number;
  days_supply: number;
  color: string;
  pack: string;
  images: string[];
  fbt: string[];
  content: {
    type?: L10n;
    desc?: L10n;
    why?: L10n;
    howTo?: L10n;
    ingredients?: L10n[];
    reviewSummary?: L10n | null;
    rank?: L10n | null;
  };
  sort: number;
  updated_at?: string;
};

const E: L10n = { ru: "", uz: "" };

export function rowToProduct(r: ProductRow): Product {
  const c = r.content || {};
  return {
    id: r.id,
    slug: r.slug,
    brand: r.brand,
    name: r.name,
    type: c.type ?? E,
    cat: r.category as CategoryId,
    skin: (r.skin ?? []) as SkinType[],
    concerns: (r.concerns ?? []) as Concern[],
    volume: Number(r.volume),
    unit: r.unit as Product["unit"],
    price: Number(r.price),
    oldPrice: r.old_price ? Number(r.old_price) : undefined,
    rating: Number(r.rating),
    reviews: Number(r.reviews),
    color: r.color,
    pack: r.pack as Pack,
    badge: (r.badge as Product["badge"]) || undefined,
    rank: c.rank ?? undefined,
    daysSupply: r.days_supply,
    desc: c.desc ?? E,
    why: c.why ?? E,
    howTo: c.howTo ?? E,
    ingredients: c.ingredients ?? [],
    reviewSummary: c.reviewSummary ?? undefined,
    fbt: r.fbt ?? [],
    images: r.images ?? [],
    stock: r.stock as Product["stock"],
  };
}

export type FeaturedCreator = { code: string; name: string; handle: string | null; percent: number; picks: string[] };
export type PublicCatalog = { products: Product[]; brands: string[]; creator: FeaturedCreator | null };

declare global {
  var __nabiCatalog: Promise<PublicCatalog> | undefined;
}

async function load(): Promise<PublicCatalog> {
  const rows = await many<ProductRow>(`SELECT * FROM products WHERE active ORDER BY sort, created_at`);
  const products = rows.map(rowToProduct);
  const brands = Array.from(new Set(products.map((p) => p.brand))).sort((a, b) => a.localeCompare(b));
  const cr = await many<{ code: string; creator_name: string; creator_handle: string | null; percent: number; picks: string[] }>(
    `SELECT code, creator_name, creator_handle, percent, picks FROM promo_codes WHERE active AND featured ORDER BY created_at LIMIT 1`
  );
  const creator = cr[0]
    ? { code: cr[0].code, name: cr[0].creator_name, handle: cr[0].creator_handle, percent: cr[0].percent, picks: (cr[0].picks ?? []).filter((id) => products.some((p) => p.id === id)) }
    : null;
  return { products, brands, creator };
}

export function getPublicCatalog(): Promise<PublicCatalog> {
  if (!globalThis.__nabiCatalog) {
    globalThis.__nabiCatalog = load().catch((e) => {
      globalThis.__nabiCatalog = undefined;
      throw e;
    });
  }
  return globalThis.__nabiCatalog;
}

export function invalidateCatalog() {
  globalThis.__nabiCatalog = undefined;
}

/** Товары для расчёта заказа на сервере: цена и себестоимость из базы, только активные. */
export async function productsForOrder(ids: string[]) {
  const rows = await many<ProductRow>(`SELECT * FROM products WHERE id = ANY($1) AND active`, [ids]);
  return new Map(rows.map((r) => [r.id, { ...rowToProduct(r), cost: r.cost_price != null ? Number(r.cost_price) : null }]));
}

export async function promoByCode(code: string | null | undefined) {
  if (!code) return null;
  const rows = await many<{ code: string; percent: number; creator_name: string }>(
    `SELECT code, percent, creator_name FROM promo_codes WHERE code = $1 AND active`,
    [code.trim().toUpperCase()]
  );
  return rows[0] ?? null;
}
