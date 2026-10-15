// Вход из Telegram Mini App без кода: Telegram подписывает данные пользователя (initData).
// Знакомый Telegram-аккаунт (уже привязан к номеру) — входим сразу; новый — клиент поделится номером.
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { createSession, currentCustomer, customerById, publicCustomer } from "@/server/auth";
import { rememberRef } from "@/server/creators";
import { initDataUser, linkTelegram } from "@/server/telegram-webapp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { initData } = (await req.json().catch(() => ({}))) as { initData?: string };
  const tg = initDataUser(String(initData ?? ""));
  if (!tg) return NextResponse.json({ error: "bad_init_data" }, { status: 401 });
  const me = await currentCustomer();
  if (me) {
    // Уже вошёл (например, кодом внутри Telegram) — запоминаем Telegram-аккаунт, чтобы дальше входить без кода.
    await linkTelegram(me.id, tg.user.id);
    return NextResponse.json({ customer: publicCustomer((await customerById(me.id))!) });
  }
  const row = await one<{ id: string }>(`SELECT id FROM customers WHERE telegram_user_id = $1 AND deleted_at IS NULL`, [tg.user.id]);
  if (!row) return NextResponse.json({ needPhone: true, tgName: { first: tg.user.first_name ?? "", last: tg.user.last_name ?? "" } });
  await createSession(row.id);
  await rememberRef(row.id);
  await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'login', $2)`, [row.id, JSON.stringify({ channel: "telegram_app" })]);
  return NextResponse.json({ customer: publicCustomer((await customerById(row.id))!) });
}

