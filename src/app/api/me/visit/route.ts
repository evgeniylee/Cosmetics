// Визит вошедшего клиента: «последний раз на сайте» и не больше одного события «визит» в день (по Ташкенту).
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false });
  const { src } = (await req.json().catch(() => ({}))) as { src?: string };
  const source = typeof src === "string" && /^[\w.:-]{1,60}$/.test(src) ? src : "direct";
  await one(
    `UPDATE customers SET
       visits_count = visits_count + CASE WHEN last_seen_at IS NULL OR (last_seen_at AT TIME ZONE 'Asia/Tashkent')::date < (now() AT TIME ZONE 'Asia/Tashkent')::date THEN 1 ELSE 0 END,
       last_seen_at = now()
     WHERE id = $1`,
    [me.id]
  );
  // Событие «визит» — один раз за день; источник берём первого визита дня.
  await one(
    `INSERT INTO customer_events (customer_id, type, data)
     SELECT $1, 'visit', $2 WHERE NOT EXISTS (
       SELECT 1 FROM customer_events WHERE customer_id = $1 AND type = 'visit'
         AND created_at >= date_trunc('day', now() AT TIME ZONE 'Asia/Tashkent') AT TIME ZONE 'Asia/Tashkent')`,
    [me.id, JSON.stringify({ src: source })]
  );
  return NextResponse.json({ ok: true });
}
