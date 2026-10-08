// Витрина главной: продающие ленты (Хиты, Новинки, Скидки, Рекомендуем), видео креаторов и креаторы с подборками.
import "server-only";
import type { L10n, Product } from "@/data/catalog";
import { discountPct } from "@/lib/shop";
import { many } from "./db";
import { RAIL_KEYS, type FeaturedCreator, type HomeRail, type HomeVideo, type RailKey } from "@/lib/storefront";
export { RAIL_KEYS };

export const RAIL_LIMIT = 12;

type RailRow = { key: RailKey; title: L10n; active: boolean; mode: "auto" | "manual"; products: string[] };

export async function railRows() {
  const rows = await many<RailRow>(`SELECT key, title, active, mode, products FROM home_rails`);
  return RAIL_KEYS.map((k) => rows.find((r) => r.key === k)).filter(Boolean) as RailRow[];
}

/** Авто-подбор товаров для ленты. Нет в наличии — не показываем. */
export function autoRail(key: RailKey, products: Product[], ctx: { sold: Map<string, number>; created: Map<string, number> }) {
  const live = products.filter((p) => p.stock !== "out");
  const by = (f: (p: Product) => number) => [...live].sort((a, b) => f(b) - f(a));
  let list: Product[] = [];
  if (key === "hits") list = by((p) => (ctx.sold.get(p.id) ?? 0) * 1000 + p.reviews);
  if (key === "new") list = by((p) => (p.badge === "new" ? 1e15 : 0) + (ctx.created.get(p.id) ?? 0) / 1000);
  if (key === "sale") list = by((p) => discountPct(p)).filter((p) => discountPct(p) > 0);
  if (key === "recommended") list = by((p) => (p.badge === "choice" ? 100 : 0) + p.rating * Math.log10(p.reviews + 1));
  return list.slice(0, RAIL_LIMIT).map((p) => p.id);
}

export async function loadStorefront(products: Product[]) {
  const ids = new Set(products.map((p) => p.id));
  const [rails, soldRows, createdRows, videoRows, creatorRows] = await Promise.all([
    railRows(),
    many<{ product_id: string; n: string | number }>(
      `SELECT i.product_id, SUM(i.qty) AS n FROM order_items i JOIN orders o ON o.id = i.order_id
       WHERE o.status <> 'cancelled' AND o.created_at > now() - interval '90 days' GROUP BY i.product_id`
    ),
    many<{ id: string; t: string | Date }>(`SELECT id, created_at AS t FROM products WHERE active`),
    many<{ id: string; title: L10n; description: L10n; src: string; poster: string | null; products: string[] }>(
      `SELECT id, title, description, src, poster, products FROM videos WHERE active ORDER BY sort, created_at DESC LIMIT 30`
    ),
    many<{ code: string; creator_name: string; creator_handle: string | null; percent: number; picks: string[]; photo: string | null }>(
      `SELECT code, creator_name, creator_handle, percent, picks, photo FROM promo_codes WHERE active AND featured ORDER BY created_at LIMIT 8`
    ),
  ]);
  const ctx = {
    sold: new Map(soldRows.map((r) => [r.product_id, Number(r.n)])),
    created: new Map(createdRows.map((r) => [r.id, new Date(r.t).getTime()])),
  };
  const homeRails: HomeRail[] = rails
    .filter((r) => r.active)
    .map((r) => ({ key: r.key, title: r.title, ids: r.mode === "manual" ? (r.products ?? []).filter((id) => ids.has(id)).slice(0, 24) : autoRail(r.key, products, ctx) }))
    .filter((r) => r.ids.length > 0);
  const videos: HomeVideo[] = videoRows.map((v) => ({
    id: v.id, title: v.title, description: v.description ?? { ru: "", uz: "" }, src: v.src, poster: v.poster,
    products: (v.products ?? []).filter((id) => ids.has(id)),
  }));
  const creators: FeaturedCreator[] = creatorRows
    .map((c) => ({ code: c.code, name: c.creator_name, handle: c.creator_handle, percent: c.percent, photo: c.photo, picks: (c.picks ?? []).filter((id) => ids.has(id)) }))
    .filter((c) => c.picks.length > 0);
  return { rails: homeRails, videos, creators };
}

/** Товары для выбора в админке (лента, видео). */
export async function pickOptions() {
  const rows = await many<{ id: string; label: string; images: string[]; color: string; price: string | number; stock: string; active: boolean }>(
    `SELECT id, brand || ' ' || name AS label, images, color, price, stock, active FROM products ORDER BY active DESC, brand, name`
  );
  return rows.map((r) => ({ id: r.id, label: r.label, image: r.images?.[0] ?? null, color: r.color, price: Number(r.price), stock: r.stock, active: r.active }));
}

