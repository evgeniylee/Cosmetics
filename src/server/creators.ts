// Партнёрка креаторов: правила атрибуции заказа и жизненный цикл комиссии.
//
// Кому засчитывается заказ (по порядку):
//   1. введённый промокод — явный выбор покупателя важнее любой ссылки;
//   2. последний переход по ссылке не старше 30 дней (кука браузера);
//   3. последний переход, закреплённый за клиентом при входе (покупка с другого устройства);
//   4. окно 60 дней: новый клиент, пришедший от креатора, приносит ему комиссию со всех заказов 60 дней.
// Окно открывается только если это первый заказ клиента. Постоянный покупатель по ссылке — комиссия за один заказ.
// Покупка на телефон самого креатора — без комиссии.
import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { many, one } from "./db";

export const CLICK_WINDOW_DAYS = 30;
export const REPEAT_WINDOW_DAYS = 60;
export const HOLD_DAYS = 7;
export const REF_COOKIE = "nabi_ref";
export const VISITOR_COOKIE = "nabi_vid";

export type Attribution = { code: string; type: "code" | "link" | "repeat"; linkId: string | null; rate: number; opensWindow: boolean; selfPurchase: boolean };

type Ref = { c: string; l: string | null; t: number };

export async function readRefCookie(): Promise<Ref | null> {
  try {
    const raw = (await cookies()).get(REF_COOKIE)?.value;
    if (!raw) return null;
    const r = JSON.parse(raw) as Ref;
    if (!r.c || Date.now() - r.t > CLICK_WINDOW_DAYS * 86400_000) return null;
    return r;
  } catch {
    return null;
  }
}

export function newLinkId() {
  // 6 символов без похожих букв: удобно продиктовать и не спутать.
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(randomBytes(6), (b) => abc[b % abc.length]).join("");
}

export const isBot = (ua: string) =>
  !ua || /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|vkshare|skype|headless|curl|wget|python|okhttp/i.test(ua);

/** Креатор для нового заказа. customer — вошедший клиент или null (гость). */
export async function attributeOrder(opts: { customerId: string | null; ordersBefore: number; phone: string; promoCode: string | null }): Promise<Attribution | null> {
  let code: string | null = null;
  let type: Attribution["type"] = "code";
  let linkId: string | null = null;

  const ref = await readRefCookie();
  if (opts.promoCode) {
    code = opts.promoCode;
    // Промокод подставился сам после перехода по ссылке того же креатора — это заказ по ссылке.
    if (ref && ref.c === code) { linkId = ref.l; type = "link"; }
  } else if (ref) { code = ref.c; linkId = ref.l; type = "link"; }
  const cust = opts.customerId
    ? await one<{ ref_code: string | null; ref_link: string | null; ref_at: string | null; referred_by: string | null; referred_until: string | null }>(
        `SELECT ref_code, ref_link, ref_at, referred_by, referred_until FROM customers WHERE id = $1`, [opts.customerId])
    : null;
  const custRef = cust?.ref_code && cust.ref_at && Date.now() - new Date(cust.ref_at).getTime() < CLICK_WINDOW_DAYS * 86400_000;
  if (custRef && (!code || (type === "code" && code === cust!.ref_code))) {
    code = cust!.ref_code; linkId = cust!.ref_link; type = "link";
  }
  if (!code && cust?.referred_by && cust.referred_until && new Date(cust.referred_until) > new Date()) {
    code = cust.referred_by; type = "repeat";
  }
  if (!code) return null;

  const promo = await one<{ code: string; commission: number; active: boolean; creator_phone: string | null }>(
    `SELECT code, commission, active, creator_phone FROM promo_codes WHERE code = $1`, [code]);
  // Выключенный креатор комиссию не получает, кроме уже открытого окна 60 дней.
  if (!promo || (!promo.active && type !== "repeat")) return null;
  if (linkId && !(await one(`SELECT id FROM creator_links WHERE id = $1 AND creator_code = $2`, [linkId, promo.code]))) linkId = null;

  return {
    code: promo.code,
    type,
    linkId,
    rate: promo.commission,
    opensWindow: type !== "repeat" && !!opts.customerId && opts.ordersBefore === 0,
    selfPurchase: !!promo.creator_phone && promo.creator_phone === opts.phone,
  };
}

/** Сохраняет атрибуцию в заказе; для нового клиента открывает окно 60 дней. */
export async function applyAttribution(orderId: string, customerId: string | null, base: number, a: Attribution) {
  const commission = a.selfPurchase ? 0 : Math.round((base * a.rate) / 100);
  await one(
    `UPDATE orders SET creator_code = $2, attribution = $3, link_id = $4, commission_rate = $5, commission = $6, commission_status = $7, commission_note = $8, new_customer = $9 WHERE id = $1`,
    [orderId, a.code, a.type, a.linkId, a.rate, commission, a.selfPurchase ? "void" : "pending", a.selfPurchase ? "Покупка на номер креатора" : null, a.opensWindow && !a.selfPurchase]
  );
  if (a.opensWindow && customerId && !a.selfPurchase)
    await one(`UPDATE customers SET referred_by = $2, referred_until = now() + interval '${REPEAT_WINDOW_DAYS} days', first_creator_code = coalesce(first_creator_code, $2) WHERE id = $1`, [customerId, a.code]);
}

/** Закрепляет последний переход за клиентом (вызывается при входе и при оформлении). */
export async function rememberRef(customerId: string) {
  const ref = await readRefCookie();
  if (!ref) return;
  await one(`UPDATE customers SET ref_code = $2, ref_link = $3, ref_at = to_timestamp($4 / 1000.0) WHERE id = $1 AND (ref_at IS NULL OR ref_at < to_timestamp($4 / 1000.0))`, [customerId, ref.c, ref.l, ref.t]);
}

/** Смена статуса заказа двигает комиссию: доставлен → через 7 дней к выплате; отменён → сгорает. */
export async function onOrderStatus(orderId: string, from: string, to: string) {
  if (to === "delivered")
    await one(`UPDATE orders SET delivered_at = now(), commission_available_at = now() + interval '${HOLD_DAYS} days' WHERE id = $1`, [orderId]);
  else if (from === "delivered")
    await one(`UPDATE orders SET delivered_at = NULL, commission_available_at = NULL WHERE id = $1 AND commission_status = 'pending'`, [orderId]);

  if (to === "cancelled") {
    await one(`UPDATE orders SET commission_status = CASE commission_status WHEN 'paid' THEN 'clawback' WHEN 'pending' THEN 'void' ELSE commission_status END,
      commission_note = CASE WHEN commission_status IN ('paid','pending') THEN 'Заказ отменён' ELSE commission_note END WHERE id = $1 AND creator_code IS NOT NULL`, [orderId]);
  } else if (from === "cancelled") {
    await one(`UPDATE orders SET commission_status = CASE commission_status WHEN 'clawback' THEN 'paid' WHEN 'void' THEN 'pending' ELSE commission_status END, commission_note = NULL
      WHERE id = $1 AND creator_code IS NOT NULL AND coalesce(commission_note, '') = 'Заказ отменён'`, [orderId]);
  }
}

// ---------- Деньги и статистика ----------

/** SQL-выражение «состояние комиссии» для показа: ждёт доставки / ждёт 7 дней / к выплате / выплачено / … */
export const COMMISSION_STATE = `CASE
  WHEN o.commission_status = 'pending' AND o.commission_available_at IS NULL THEN 'waiting_delivery'
  WHEN o.commission_status = 'pending' AND o.commission_available_at > now() THEN 'hold'
  WHEN o.commission_status = 'pending' THEN 'ready'
  ELSE o.commission_status END`;

export const STATE_LABEL: Record<string, string> = {
  waiting_delivery: "ждёт доставки",
  hold: "подтвердится",
  ready: "к выплате",
  paid: "выплачено",
  void: "не начислено",
  clawback: "вычет",
  clawed: "вычтено",
};

/** Ближайшая дата выплаты: 1, 11 и 21 числа (по Ташкенту). */
export function nextPayoutDate(from = new Date()) {
  const t = new Date(from.getTime() + 5 * 3600_000);
  const y = t.getUTCFullYear(), m = t.getUTCMonth(), d = t.getUTCDate();
  const day = [1, 11, 21].find((x) => x > d);
  return day ? new Date(Date.UTC(y, m, day)) : new Date(Date.UTC(y, m + 1, 1));
}

export type Balance = { ready: number; hold: number; waiting: number; clawback: number; paid: number; readyOrders: number };

export async function balances(code?: string): Promise<Map<string, Balance>> {
  const rows = await many<{ code: string; ready: string; hold: string; waiting: string; clawback: string; paid: string; ready_orders: number }>(
    `SELECT o.creator_code AS code,
       coalesce(sum(o.commission) FILTER (WHERE ${COMMISSION_STATE} = 'ready'), 0) AS ready,
       coalesce(sum(o.commission) FILTER (WHERE ${COMMISSION_STATE} = 'hold'), 0) AS hold,
       coalesce(sum(o.commission) FILTER (WHERE ${COMMISSION_STATE} = 'waiting_delivery'), 0) AS waiting,
       coalesce(sum(o.commission) FILTER (WHERE o.commission_status = 'clawback'), 0) AS clawback,
       coalesce(sum(o.commission) FILTER (WHERE o.commission_status = 'paid'), 0) AS paid,
       count(*) FILTER (WHERE ${COMMISSION_STATE} = 'ready')::int AS ready_orders
     FROM orders o WHERE o.creator_code IS NOT NULL ${code ? "AND o.creator_code = $1" : ""} GROUP BY o.creator_code`,
    code ? [code] : []
  );
  // «Выплачено» — по документам выплат, а не по статусам заказов (вычеты не уменьшают уже переведённые деньги).
  const paid = await many<{ code: string; s: string }>(`SELECT creator_code AS code, sum(amount) AS s FROM creator_payouts ${code ? "WHERE creator_code = $1" : ""} GROUP BY creator_code`, code ? [code] : []);
  const paidBy = new Map(paid.map((r) => [r.code, Number(r.s)]));
  return new Map(rows.map((r) => [r.code, { ready: Number(r.ready), hold: Number(r.hold), waiting: Number(r.waiting), clawback: Number(r.clawback), paid: paidBy.get(r.code) ?? 0, readyOrders: r.ready_orders }]));
}

export type Funnel = { clicks: number; visitors: number; orders: number; linkOrders: number; revenue: number; commission: number; newCustomers: number };

/** Воронка креатора (или по ссылкам, если byLink) за N дней. Заказы — без отменённых. */
export async function funnel(days: number, code?: string): Promise<Map<string, Funnel>> {
  const p: unknown[] = [String(days)];
  if (code) p.push(code);
  const filt = code ? `AND creator_code = $2` : "";
  const clicks = await many<{ code: string; clicks: number; visitors: number }>(
    `SELECT creator_code AS code, count(*)::int AS clicks, count(DISTINCT visitor_id)::int AS visitors FROM link_clicks
     WHERE created_at >= now() - ($1 || ' days')::interval ${filt} GROUP BY creator_code`, p);
  const orders = await many<{ code: string; orders: number; link_orders: number; revenue: string; commission: string; new_customers: number }>(
    `SELECT creator_code AS code, count(*)::int AS orders, count(*) FILTER (WHERE attribution = 'link')::int AS link_orders, coalesce(sum(subtotal - discount), 0) AS revenue,
       coalesce(sum(commission) FILTER (WHERE commission_status <> 'void'), 0) AS commission,
       count(*) FILTER (WHERE new_customer)::int AS new_customers
     FROM orders WHERE status <> 'cancelled' AND creator_code IS NOT NULL AND created_at >= now() - ($1 || ' days')::interval ${filt} GROUP BY creator_code`, p);
  const m = new Map<string, Funnel>();
  const get = (c: string) => m.get(c) ?? (m.set(c, { clicks: 0, visitors: 0, orders: 0, linkOrders: 0, revenue: 0, commission: 0, newCustomers: 0 }), m.get(c)!);
  for (const c of clicks) Object.assign(get(c.code), { clicks: c.clicks, visitors: c.visitors });
  for (const o of orders) Object.assign(get(o.code), { orders: o.orders, linkOrders: o.link_orders, revenue: Number(o.revenue), commission: Number(o.commission), newCustomers: o.new_customers });
  return m;
}

export async function linkStats(code: string, days = 3650) {
  return many<{ id: string; label: string; target_type: string; target: string | null; archived: boolean; created_at: string; clicks: number; visitors: number; orders: number; revenue: string; commission: string }>(
    `SELECT l.id, l.label, l.target_type, l.target, l.archived, l.created_at,
       (SELECT count(*)::int FROM link_clicks c WHERE c.link_id = l.id AND c.created_at >= now() - ($2 || ' days')::interval) AS clicks,
       (SELECT count(DISTINCT visitor_id)::int FROM link_clicks c WHERE c.link_id = l.id AND c.created_at >= now() - ($2 || ' days')::interval) AS visitors,
       (SELECT count(*)::int FROM orders o WHERE o.link_id = l.id AND o.status <> 'cancelled' AND o.created_at >= now() - ($2 || ' days')::interval) AS orders,
       (SELECT coalesce(sum(subtotal - discount), 0) FROM orders o WHERE o.link_id = l.id AND o.status <> 'cancelled' AND o.created_at >= now() - ($2 || ' days')::interval) AS revenue,
       (SELECT coalesce(sum(commission), 0) FROM orders o WHERE o.link_id = l.id AND o.commission_status NOT IN ('void') AND o.status <> 'cancelled' AND o.created_at >= now() - ($2 || ' days')::interval) AS commission
     FROM creator_links l WHERE l.creator_code = $1 ORDER BY l.archived, l.created_at DESC`,
    [code, String(days)]
  );
}

/** Выплата: все «к выплате» минус вычеты одним документом. */
export async function createPayout(code: string, byPhone: string, note: string | null) {
  const b = (await balances(code)).get(code);
  const amount = (b?.ready ?? 0) - (b?.clawback ?? 0);
  if (!b || amount <= 0) return null;
  const pay = await one<{ id: string }>(
    `INSERT INTO creator_payouts (creator_code, amount, orders_count, note, paid_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [code, amount, b.readyOrders, note, byPhone]
  );
  await one(`UPDATE orders o SET commission_status = 'paid', payout_id = $2 WHERE o.creator_code = $1 AND ${COMMISSION_STATE} = 'ready'`, [code, pay!.id]);
  await one(`UPDATE orders SET commission_status = 'clawed', payout_id = $2 WHERE creator_code = $1 AND commission_status = 'clawback'`, [code, pay!.id]);
  return { id: pay!.id, amount };
}

export const linkPath = (code: string, id?: string | null) => `/c/${code.toLowerCase()}${id ? `/${id}` : ""}`;

// ---------- Кабинет креатора ----------

export type CreatorRow = { code: string; creator_name: string; creator_handle: string | null; percent: number; commission: number; active: boolean; creator_phone: string | null; picks: string[] };

export async function creatorByPhone(phone: string) {
  return (await one<CreatorRow>(`SELECT code, creator_name, creator_handle, percent, commission, active, creator_phone, picks FROM promo_codes WHERE creator_phone = $1`, [phone])) ?? null;
}

/** Адрес сайта для готовых ссылок: SITE_URL или текущий хост. */
export async function siteOrigin() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
