// Удаление аккаунта по просьбе клиента: личные данные стираются, заказы остаются обезличенными для учёта.
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer, destroyAllSessions } from "@/server/auth";

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") return NextResponse.json({ error: "confirm_required" }, { status: 400 });
  // Пока заказ в пути, данные нужны курьеру — удаляем после доставки.
  const active = await one<{ n: number }>(`SELECT count(*)::int AS n FROM orders WHERE customer_id = $1 AND status IN ('new','needs_call','confirmed','shipped')`, [me.id]);
  if (active?.n) return NextResponse.json({ error: "active_orders" }, { status: 409 });
  await one(`UPDATE orders SET phone = 'deleted', first_name = NULL, last_name = NULL, address = '—', comment = NULL WHERE customer_id = $1`, [me.id]);
  await one(`DELETE FROM customer_addresses WHERE customer_id = $1`, [me.id]);
  await one(`DELETE FROM customer_answers WHERE customer_id = $1`, [me.id]);
  await one(`DELETE FROM customer_cart WHERE customer_id = $1`, [me.id]);
  await one(`DELETE FROM customer_favorites WHERE customer_id = $1`, [me.id]);
  // Телефон заменяем, чтобы номер можно было зарегистрировать заново с нуля.
  await one(
    `UPDATE customers SET phone = 'deleted:' || id, first_name = NULL, last_name = NULL, birth_date = NULL, telegram_user_id = NULL, marketing_opt_in = false,
       manager_note = NULL, ref_code = NULL, ref_link = NULL, referred_until = NULL, deleted_at = now(), updated_at = now() WHERE id = $1`, [me.id]);
  await one(`INSERT INTO customer_events (customer_id, type) VALUES ($1, 'account_deleted')`, [me.id]);
  await destroyAllSessions(me.id);
  return NextResponse.json({ ok: true });
}
