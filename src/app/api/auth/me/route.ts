import { NextResponse } from "next/server";
import { many } from "@/server/db";
import { currentCustomer, publicCustomer } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ customer: null });
  const address = await many<{ city: string; address: string; comment: string | null }>(
    `SELECT city, address, comment FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC LIMIT 1`,
    [me.id]
  );
  const answered = await many<{ n: number; total: number }>(
    `SELECT (SELECT count(*)::int FROM customer_answers WHERE customer_id = $1) AS n, (SELECT count(*)::int FROM profile_questions WHERE active) AS total`,
    [me.id]
  );
  // Заполненность профиля: имя, фамилия, дата рождения + ответы анкеты.
  const base = [me.first_name, me.last_name, me.birth_date].filter(Boolean).length;
  const { n, total } = answered[0];
  const completion = Math.round(((base + n) / (3 + total)) * 100);
  return NextResponse.json({ customer: publicCustomer(me), address: address[0] ?? null, completion });
}
