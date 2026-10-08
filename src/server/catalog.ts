// Каталог из базы. Витрина получает его один раз на запрос через getPublicCatalog() (кэш в памяти
// процесса, сбрасывается при любом изменении в админке).
import "server-only";
import type { CategoryId, Concern, L10n, Pack, Product, SkinType, Variant, VariantKind } from "@/data/catalog";
import { parseKey, withVariant } from "@/lib/variants";
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
  variant_kind?: string | null;
};

export type VariantRow = {
  id: string; product_id: string; name: L10n; hex: string | null; volume: string | number | null; price: string | number | null; old_price: string | number | null;
  cost_price: string | number | null; images: string[]; stock: string; sku: string | null; sort: number;
};

export const rowToVariant = (v: VariantRow): Variant => ({
  id: v.id, name: v.name, hex: v.hex ?? undefined, volume: v.volume != null ? Number(v.volume) : undefined,
  price: v.price != null ? Number(v.price) : undefined, oldPrice: v.old_price ? Number(v.old_price) : undefined,
  images: v.images ?? [], stock: v.stock as Variant["stock"],
});

export async function variantsFor(productIds: string[]) {
  const rows = productIds.length ? await many<VariantRow>(`SELECT * FROM product_variants WHERE product_id = ANY($1) ORDER BY sort, id`, [productIds]) : [];
  const m = new Map<string, VariantRow[]>();
  for (const r of rows) m.set(r.product_id, [...(m.get(r.product_id) ?? []), r]);
  return m;
}

/** Товар с вариантами: цена в каталоге — минимальная из объёмов, наличие — есть ли хоть один вариант. */
function attachVariants(p: Product, kind: string | null | undefined, rows: VariantRow[] | undefined): Product {
  if (!kind || !rows?.length) return p;
  const variants = rows.map(rowToVariant);
  const live = variants.filter((v) => v.stock !== "out");
  const pool = live.length ? live : variants;
  const out: Product = { ...p, variantKind: kind as VariantKind, variants, stock: live.length ? (live.some((v) => v.stock === "in_stock") ? "in_stock" : "on_order") : "out" };
  if (kind === "volume") {
    const cheapest = pool.filter((v) => v.price != null).sort((a, b) => a.price! - b.price!)[0];
    if (cheapest) { out.price = cheapest.price!; out.oldPrice = cheapest.oldPrice; out.volume = cheapest.volume ?? p.volume; }
  }
  return out;
}

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
  const vmap = await variantsFor(rows.filter((r) => r.variant_kind).map((r) => r.id));
  const products = rows.map((r) => attachVariants(rowToProduct(r), r.variant_kind, vmap.get(r.id)));
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

/** Позиции заказа на сервере по ключам корзины ("товар" или "товар~вариант"): цена, себестоимость и наличие из базы. */
export async function productsForOrder(keys: string[]) {
  const ids = [...new Set(keys.map((k) => parseKey(k).pid))];
  const rows = await many<ProductRow>(`SELECT * FROM products WHERE id = ANY($1) AND active`, [ids]);
  const vmap = await variantsFor(rows.filter((r) => r.variant_kind).map((r) => r.id));
  const out = new Map<string, Product & { cost: number | null }>();
  for (const k of keys) {
    const { pid, vid } = parseKey(k);
    const r = rows.find((x) => x.id === pid);
    if (!r) continue;
    const base = attachVariants(rowToProduct(r), r.variant_kind, vmap.get(r.id));
    if (base.variants?.length && vid && !base.variants.some((v) => v.id === vid)) continue; // вариант удалён
    const p = withVariant(base, vid);
    const vr = p.variant ? vmap.get(r.id)?.find((v) => v.id === p.variant!.id) : undefined;
    const cost = vr?.cost_price != null ? Number(vr.cost_price) : r.cost_price != null ? Number(r.cost_price) : null;
    out.set(k, { ...p, cost });
  }
  return out;
}

export async function promoByCode(code: string | null | undefined) {
  if (!code) return null;
  const rows = await many<{ code: string; percent: number; creator_name: string }>(
    `SELECT code, percent, creator_name FROM promo_codes WHERE code = $1 AND active`,
    [code.trim().toUpperCase()]
  );
  return rows[0] ?? null;
}
