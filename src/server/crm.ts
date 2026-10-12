// CRM: сегменты клиентов (одни и те же для списка, счётчиков и выгрузки) и данные для карточки клиента.
import "server-only";
import { many } from "./db";

/** Порог VIP: 10% лучших покупателей по сумме, но не меньше 1 млн сум. */
const VIP_SQL = `c.orders_count > 0 AND c.total_spent >= (SELECT GREATEST(1000000, COALESCE(percentile_cont(0.9) WITHIN GROUP (ORDER BY total_spent), 0)) FROM customers WHERE orders_count > 0)`;

/** Корзина лежит дольше суток (но не дольше 30 дней), и после её изменения заказа не было. */
const ABANDONED_SQL = `EXISTS (SELECT 1 FROM customer_cart cc WHERE cc.customer_id = c.id
  GROUP BY cc.customer_id HAVING max(cc.updated_at) < now() - interval '24 hours' AND max(cc.updated_at) > now() - interval '30 days'
    AND (c.last_order_at IS NULL OR c.last_order_at < max(cc.updated_at)))`;

/** Купленный товар заканчивается: запас (дней × количество) кончается в ближайшие 10 дней или кончился до 30 дней назад, и его не перезаказывали. */
export const REPLENISH_JOIN = `FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id
  WHERE o.status NOT IN ('cancelled', 'new', 'needs_call') AND p.days_supply > 0
    AND o.created_at + make_interval(days => p.days_supply * i.qty) BETWEEN now() - interval '30 days' AND now() + interval '10 days'
    AND NOT EXISTS (SELECT 1 FROM orders o2 JOIN order_items i2 ON i2.order_id = o2.id
      WHERE o2.customer_id = o.customer_id AND i2.product_id = i.product_id AND o2.created_at > o.created_at AND o2.status <> 'cancelled')`;
const REPLENISH_SQL = `EXISTS (SELECT 1 ${REPLENISH_JOIN} AND o.customer_id = c.id)`;

export type Segment = { l: string; hint: string; sql: string; group: "base" | "action" | "people" };

// Порядок = порядок вкладок. «Действия» — сегменты, по которым менеджеру есть что сделать.
export const SEGMENTS: Record<string, Segment> = {
  all: { l: "Все", hint: "", sql: "TRUE", group: "base" },
  abandoned: { l: "Брошенная корзина", hint: "Товары в корзине больше суток, заказа после этого не было", sql: ABANDONED_SQL, group: "action" },
  replenish: { l: "Пора пополнить", hint: "Купленное средство заканчивается в ближайшие 10 дней или уже закончилось (по сроку «хватает на N дней»)", sql: REPLENISH_SQL, group: "action" },
  sleeping: { l: "Засыпают", hint: "Последний заказ 90–180 дней назад", sql: "c.orders_count > 0 AND c.last_order_at < now() - interval '90 days' AND c.last_order_at >= now() - interval '180 days'", group: "action" },
  birthday: { l: "ДР в этом месяце", hint: "", sql: "extract(month FROM c.birth_date) = extract(month FROM now() AT TIME ZONE 'Asia/Tashkent')", group: "action" },
  nobuy: { l: "Без заказов", hint: "Зарегистрировались, но ничего не купили", sql: "c.orders_count = 0", group: "action" },
  first: { l: "Один заказ", hint: "Купили один раз — главная задача довести до второго", sql: "c.orders_count = 1", group: "people" },
  repeat: { l: "Постоянные", hint: "2 заказа и больше", sql: "c.orders_count >= 2", group: "people" },
  vip: { l: "VIP", hint: "10% лучших покупателей по сумме (не меньше 1 млн сум)", sql: VIP_SQL, group: "people" },
  lost: { l: "Ушли", hint: "Не заказывали больше 180 дней", sql: "c.orders_count > 0 AND c.last_order_at < now() - interval '180 days'", group: "people" },
  active: { l: "Заходили за 7 дней", hint: "", sql: "c.last_seen_at >= now() - interval '7 days'", group: "people" },
  fresh: { l: "Новые за 7 дней", hint: "", sql: "c.created_at >= now() - interval '7 days'", group: "people" },
  optin: { l: "Согласны на рассылку", hint: "", sql: "c.marketing_opt_in", group: "people" },
};

/** Только завершившие регистрацию или оформившие заказ, без удалённых. */
export const CUSTOMER_BASE = `(c.first_name IS NOT NULL OR c.orders_count > 0) AND c.deleted_at IS NULL`;

/** Метки клиента — выбираются из списка, чтобы по ним можно было фильтровать. */
export const TAGS = ["аллергик", "чувствительная кожа", "оптовик", "жалоба", "блогер", "подарки", "сложная доставка", "постоянный звонок"] as const;

/** Условия фильтра списка клиентов: сегмент, метка, поиск. Используется и в выгрузке. */
export function customerWhere(sp: { seg?: string; tag?: string; q?: string }) {
  const seg = SEGMENTS[sp.seg ?? ""] ? sp.seg! : "all";
  const params: unknown[] = [];
  const where = [CUSTOMER_BASE, SEGMENTS[seg].sql];
  if (sp.tag) { params.push(sp.tag); where.push(`$${params.length} = ANY(c.tags)`); }
  const q = (sp.q ?? "").trim();
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const parts = [`lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) LIKE $${params.length}`];
    const d = q.replace(/\D/g, "");
    if (d.length >= 3) { params.push(`%${d}%`); parts.push(`c.phone LIKE $${params.length}`); }
    where.push(`(${parts.join(" OR ")})`);
  }
  return { seg, sql: `WHERE ${where.join(" AND ")}`, params };
}

/** В каких сегментах «действий» и «людей» состоит клиент — для значков в карточке. */
export async function segmentsOf(id: string) {
  const keys = Object.keys(SEGMENTS).filter((k) => k !== "all");
  const row = (await many<Record<string, boolean>>(
    `SELECT ${keys.map((k) => `(${SEGMENTS[k].sql}) AS "${k}"`).join(", ")} FROM customers c WHERE c.id = $1`, [id]
  ))[0];
  return keys.filter((k) => row?.[k]);
}

/** Что у клиента заканчивается: товар, когда кончится. */
export async function replenishFor(id: string) {
  return many<{ product_id: string; name: string; ends_at: string; slug: string }>(
    `SELECT DISTINCT ON (i.product_id) i.product_id, i.name, p.slug, o.created_at + make_interval(days => p.days_supply * i.qty) AS ends_at
     ${REPLENISH_JOIN} AND o.customer_id = $1 ORDER BY i.product_id, o.created_at DESC`, [id]
  );
}

/** Источник визита/клиента человеческими словами. */
export function sourceLabel(src: string | null | undefined) {
  if (!src || src === "direct") return "напрямую";
  if (src.startsWith("creator:")) return `креатор ${src.slice(8)}`;
  if (src === "utm:creator") return "ссылка креатора без кода";
  if (src.startsWith("utm:")) return `реклама: ${src.slice(4)}`;
  return src;
}

// ---------- Аналитика клиентов ----------
// Везде без отменённых заказов. «Первый заказ» — самый ранний неотменённый заказ клиента.

const LIVE_ORDERS = `SELECT o.id, o.customer_id, o.total, o.created_at FROM orders o WHERE o.status <> 'cancelled' AND o.customer_id IS NOT NULL`;
const RANKED = `WITH lo AS (${LIVE_ORDERS}), r AS (SELECT lo.*, row_number() OVER (PARTITION BY customer_id ORDER BY created_at) AS n FROM lo)`;

export async function customerStats() {
  const [kpi, weeks, sources, cohorts, abandoned] = await Promise.all([
    many<{ buyers: number; repeaters: number; new30: number; aov30: string | null; ltv: string | null; second90: number | null; eligible90: number; median_days: number | null }>(
      `${RANKED},
       firsts AS (SELECT customer_id, created_at FROM r WHERE n = 1),
       seconds AS (SELECT customer_id, created_at FROM r WHERE n = 2)
       SELECT
         (SELECT count(*)::int FROM firsts) AS buyers,
         (SELECT count(*)::int FROM seconds) AS repeaters,
         (SELECT count(*)::int FROM firsts WHERE created_at > now() - interval '30 days') AS new30,
         (SELECT avg(total) FROM r WHERE created_at > now() - interval '30 days') AS aov30,
         (SELECT avg(s) FROM (SELECT sum(total) AS s FROM r GROUP BY customer_id) x) AS ltv,
         (SELECT count(*)::int FROM firsts f JOIN seconds s USING (customer_id) WHERE f.created_at < now() - interval '90 days' AND s.created_at <= f.created_at + interval '90 days') AS second90,
         (SELECT count(*)::int FROM firsts WHERE created_at < now() - interval '90 days') AS eligible90,
         (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM s.created_at - f.created_at) / 86400)::int FROM firsts f JOIN seconds s USING (customer_id)) AS median_days`
    ),
    many<{ week: string; new_buyers: number; returning: number }>(
      `${RANKED}
       SELECT to_char(w, 'DD.MM') AS week,
         count(DISTINCT r.customer_id) FILTER (WHERE r.n = 1)::int AS new_buyers,
         count(DISTINCT r.customer_id) FILTER (WHERE r.n > 1 AND NOT EXISTS (SELECT 1 FROM r r1 WHERE r1.customer_id = r.customer_id AND r1.n = 1 AND date_trunc('week', r1.created_at AT TIME ZONE 'Asia/Tashkent') = w))::int AS returning
       FROM generate_series(date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent') - interval '11 weeks', date_trunc('week', now() AT TIME ZONE 'Asia/Tashkent'), interval '1 week') w
       LEFT JOIN r ON date_trunc('week', r.created_at AT TIME ZONE 'Asia/Tashkent') = w
       GROUP BY w ORDER BY w`
    ),
    many<{ src: string; customers: number; buyers: number; repeaters: number; revenue: string }>(
      `${RANKED}, per AS (SELECT customer_id, count(*) AS orders, sum(total) AS revenue FROM r GROUP BY customer_id)
       SELECT CASE WHEN c.first_creator_code IS NOT NULL THEN 'creator:' || c.first_creator_code
                   WHEN c.first_utm->>'utm_source' IS NOT NULL THEN 'utm:' || (c.first_utm->>'utm_source') ELSE 'direct' END AS src,
         count(*)::int AS customers, count(per.customer_id)::int AS buyers, count(*) FILTER (WHERE per.orders >= 2)::int AS repeaters,
         coalesce(sum(per.revenue), 0) AS revenue
       FROM customers c LEFT JOIN per ON per.customer_id = c.id
       WHERE ${CUSTOMER_BASE} GROUP BY 1 ORDER BY revenue DESC LIMIT 15`
    ),
    many<{ cohort: string; size: number; m1: number; m2: number; m3: number; m4: number; m5: number; age: number }>(
      `${RANKED}, f AS (SELECT customer_id, date_trunc('month', created_at AT TIME ZONE 'Asia/Tashkent') AS cm FROM r WHERE n = 1),
       act AS (SELECT DISTINCT r.customer_id, (extract(year FROM age(date_trunc('month', r.created_at AT TIME ZONE 'Asia/Tashkent'), f.cm)) * 12
                 + extract(month FROM age(date_trunc('month', r.created_at AT TIME ZONE 'Asia/Tashkent'), f.cm)))::int AS k
               FROM r JOIN f USING (customer_id))
       SELECT to_char(f.cm, 'MM.YYYY') AS cohort, count(DISTINCT f.customer_id)::int AS size,
         ${[1, 2, 3, 4, 5].map((k) => `count(DISTINCT act.customer_id) FILTER (WHERE act.k = ${k})::int AS m${k}`).join(", ")},
         (extract(year FROM age(date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent'), f.cm)) * 12 + extract(month FROM age(date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent'), f.cm)))::int AS age
       FROM f LEFT JOIN act USING (customer_id)
       WHERE f.cm >= date_trunc('month', now() AT TIME ZONE 'Asia/Tashkent') - interval '5 months'
       GROUP BY f.cm ORDER BY f.cm`
    ),
    many<{ n: number; sum: string | null }>(
      `SELECT count(DISTINCT c.id)::int AS n, sum(p.price * cc.qty) AS sum FROM customers c
       JOIN customer_cart cc ON cc.customer_id = c.id JOIN products p ON p.id = split_part(cc.product_id, '~', 1)
       WHERE ${CUSTOMER_BASE} AND ${SEGMENTS.abandoned.sql}`
    ),
  ]);
  return { kpi: kpi[0], weeks, sources, cohorts, abandoned: abandoned[0] };
}
