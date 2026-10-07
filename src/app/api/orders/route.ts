import { NextResponse } from "next/server";
import { z } from "zod";
import { SAMPLES } from "@/data/catalog";
import { productsForOrder, promoByCode } from "@/server/catalog";
import { CITIES, SAMPLES_FROM, bestDiscount, deliveryCost } from "@/lib/shop";
import { many, one } from "@/server/db";
import { currentCustomer, normalizePhone } from "@/server/auth";
import { notifyAdmin, orderMessage } from "@/server/notify";

export const dynamic = "force-dynamic";

const Body = z.object({
  items: z.array(z.object({ id: z.string(), qty: z.number().int().min(1).max(20) })).min(1).max(50),
  promo: z.string().trim().toUpperCase().max(32).nullable().optional(),
  city: z.string(),
  address: z.string().trim().min(3).max(300),
  comment: z.string().trim().max(500).optional(),
  payment: z.enum(["click", "payme", "cash"]),
  samples: z.array(z.string()).max(2).optional(),
  lang: z.enum(["ru", "uz"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
  // Заказ без подтверждённого номера (нет Telegram): менеджер подтверждает звонком.
  guest: z.object({ phone: z.string(), firstName: z.string().trim().min(1).max(60) }).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_order", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const b = parsed.data;

  const me = await currentCustomer();
  let phone: string, firstName: string | null, lastName: string | null, status: "new" | "needs_call";
  if (me) {
    if (!me.first_name) return NextResponse.json({ error: "profile_required" }, { status: 409 });
    phone = me.phone; firstName = me.first_name; lastName = me.last_name; status = "new";
  } else {
    const gp = b.guest && normalizePhone(b.guest.phone);
    if (!b.guest || !gp) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    phone = gp; firstName = b.guest.firstName; lastName = null; status = "needs_call";
  }

  const city = CITIES.find((c) => c.id === b.city);
  if (!city) return NextResponse.json({ error: "invalid_city" }, { status: 400 });
  if (b.payment === "cash" && city.id !== "tashkent") return NextResponse.json({ error: "cash_only_tashkent" }, { status: 400 });

  // Цены и скидки считаются только на сервере, данные из браузера не используются.
  const catalog = await productsForOrder(b.items.map((i) => i.id));
  const lines = b.items.map((i) => ({ p: catalog.get(i.id), qty: i.qty }));
  if (lines.some((l) => !l.p)) return NextResponse.json({ error: "unknown_product" }, { status: 400 });
  if (lines.some((l) => l.p!.stock === "out")) return NextResponse.json({ error: "out_of_stock" }, { status: 409 });
  const items = lines.map((l) => ({ id: l.p!.id, name: `${l.p!.brand} ${l.p!.name}`, price: l.p!.price, cost: l.p!.cost, qty: l.qty }));
  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const promo = await promoByCode(b.promo);
  const disc = bestDiscount(subtotal, promo);
  const discount = disc?.amount ?? 0;
  const delivery = deliveryCost(city.id, subtotal - discount);
  const total = subtotal - discount + delivery;
  const samples = subtotal - discount >= SAMPLES_FROM ? (b.samples ?? []).filter((s) => SAMPLES.some((x) => x.id === s)) : [];

  const order = await one<{ id: string; number: string }>(
    `INSERT INTO orders (number, customer_id, status, phone, first_name, last_name, city, address, comment, payment,
       subtotal, discount, discount_source, delivery, total, promo_code, samples, utm, lang)
     VALUES ('N-' || nextval('order_number_seq'), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING id, number`,
    [me?.id ?? null, status, phone, firstName, lastName, city.id, b.address, b.comment || null, b.payment,
      subtotal, discount, disc?.source ?? null, delivery, total, disc ? promo!.code : null, JSON.stringify(samples), b.utm ? JSON.stringify(b.utm) : null, b.lang ?? "ru"]
  );
  for (const i of items) {
    await one(`INSERT INTO order_items (order_id, product_id, name, price, cost, qty) VALUES ($1, $2, $3, $4, $5, $6)`, [order!.id, i.id, i.name, i.price, i.cost, i.qty]);
  }

  let isNewCustomer = false;
  if (me) {
    isNewCustomer = Number(me.orders_count) === 0;
    await one(
      `UPDATE customers SET orders_count = orders_count + 1, total_spent = total_spent + $2, last_order_at = now(), city = $3, updated_at = now() WHERE id = $1`,
      [me.id, total, city.id]
    );
    const same = await one(`SELECT id FROM customer_addresses WHERE customer_id = $1 AND city = $2 AND address = $3`, [me.id, city.id, b.address]);
    if (!same) {
      await one(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [me.id]);
      await one(`INSERT INTO customer_addresses (customer_id, city, address, comment) VALUES ($1, $2, $3, $4)`, [me.id, city.id, b.address, b.comment || null]);
    }
    await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'order_placed', $2)`, [me.id, JSON.stringify({ number: order!.number, total })]);
  }

  await notifyAdmin(
    orderMessage({
      id: order!.id,
      number: order!.number,
      status,
      name: [firstName, lastName].filter(Boolean).join(" "),
      phone,
      city: city.ru,
      address: b.address,
      comment: b.comment,
      payment: b.payment,
      items,
      subtotal,
      discount,
      discountSource: disc?.source ?? null,
      delivery,
      total,
      samples: samples.map((s) => SAMPLES.find((x) => x.id === s)!.name.ru),
      isNewCustomer,
    })
  );

  return NextResponse.json({ number: order!.number, status, total, discount, delivery, creatorCode: disc ? promo!.code : null });
}

export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const orders = await many<{ id: string; number: string; status: string; total: string; created_at: string; items: { id: string; name: string; qty: number }[] }>(
    `SELECT o.id, o.number, o.status, o.total, o.created_at,
       COALESCE(json_agg(json_build_object('id', i.product_id, 'name', i.name, 'qty', i.qty)) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
     FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
     WHERE o.customer_id = $1 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`,
    [me.id]
  );
  return NextResponse.json({ orders: orders.map((o) => ({ ...o, total: Number(o.total) })) });
}
