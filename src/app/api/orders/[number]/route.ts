// Детали заказа для его владельца: состав с картинками, адрес, оплата, этапы.
import { NextResponse } from "next/server";
import { many, one } from "@/server/db";
import { currentCustomer } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ number: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { number } = await params;
  const o = await one<{ id: string; number: string; status: string; created_at: string; city: string; address: string; comment: string | null; payment: string; paid_at: string | null;
    subtotal: string; discount: string; discount_source: string | null; delivery: string; total: string; samples: string[] | null; delivered_at: string | null }>(
    `SELECT id, number, status, created_at, city, address, comment, payment, paid_at, subtotal, discount, discount_source, delivery, total, samples, delivered_at
     FROM orders WHERE number = $1 AND customer_id = $2`, [decodeURIComponent(number).toUpperCase(), me.id]);
  if (!o) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const items = await many<{ product_id: string; variant_id: string | null; name: string; price: string; qty: number; slug: string | null; images: string[] | null; pack: string | null; color: string | null; brand: string | null; active: boolean | null }>(
    `SELECT oi.product_id, oi.variant_id, oi.name, oi.price, oi.qty, p.slug,
       CASE WHEN jsonb_array_length(coalesce(v.images, '[]')) > 0 THEN v.images ELSE p.images END AS images, p.pack, p.color, p.brand, p.active
     FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN product_variants v ON v.id = oi.variant_id
     WHERE oi.order_id = $1`, [o.id]);
  const log = await many<{ to_status: string; created_at: string }>(`SELECT to_status, created_at FROM order_status_log WHERE order_id = $1 ORDER BY created_at`, [o.id]);
  const { id: _id, ...pub } = o;
  void _id;
  return NextResponse.json({
    order: { ...pub, subtotal: Number(o.subtotal), discount: Number(o.discount), delivery: Number(o.delivery), total: Number(o.total) },
    items: items.map((i) => ({ ...i, price: Number(i.price) })),
    log,
  });
}
