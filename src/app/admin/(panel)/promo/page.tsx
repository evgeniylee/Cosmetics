import { many } from "@/server/db";
import { PageHead } from "../ui";
import { PromoList, type PromoRow } from "./editor";

export const metadata = { title: "Промокоды" };

export default async function PromoPage() {
  const rows = await many<PromoRow>(
    `SELECT p.code, p.creator_name AS "creatorName", coalesce(p.creator_handle, '') AS "creatorHandle", p.percent, p.commission, p.active, p.featured, p.picks,
       coalesce(s.orders, 0)::int AS orders, coalesce(s.rev, 0)::bigint AS rev, coalesce(s.orders30, 0)::int AS orders30, coalesce(s.rev30, 0)::bigint AS rev30,
       coalesce(s.customers, 0)::int AS customers
     FROM promo_codes p LEFT JOIN (
       SELECT promo_code, count(*) AS orders, sum(subtotal - discount) AS rev, count(DISTINCT customer_id) AS customers,
         count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS orders30,
         sum(subtotal - discount) FILTER (WHERE created_at >= now() - interval '30 days') AS rev30
       FROM orders WHERE status <> 'cancelled' AND promo_code IS NOT NULL GROUP BY promo_code
     ) s ON s.promo_code = p.code
     ORDER BY p.active DESC, s.rev DESC NULLS LAST, p.created_at`
  );
  const products = await many<{ id: string; label: string }>(`SELECT id, brand || ' ' || name AS label FROM products WHERE active ORDER BY brand, name`);
  return (
    <>
      <PageHead title="Промокоды" sub="Скидка покупателю и комиссия креатору. Выручка — после скидки, без доставки и отменённых заказов." />
      <PromoList rows={rows.map((r) => ({ ...r, rev: Number(r.rev), rev30: Number(r.rev30) }))} products={products} />
    </>
  );
}
