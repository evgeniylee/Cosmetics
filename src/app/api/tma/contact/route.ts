// Новый клиент в Mini App нажал «Поделиться номером»: Telegram подписывает контакт — это и есть подтверждение номера.
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { createSession, customerById, normalizePhone, publicCustomer } from "@/server/auth";
import { rememberRef } from "@/server/creators";
import { initDataUser, linkTelegram, verifiedContact } from "@/server/telegram-webapp";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { initData, contact } = (await req.json().catch(() => ({}))) as { initData?: string; contact?: string };
  const tg = initDataUser(String(initData ?? ""));
  const c = verifiedContact(String(contact ?? ""));
  if (!tg || !c) return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  // Номер должен принадлежать тому же Telegram-аккаунту, что открыл приложение.
  if (c.user_id !== tg.user.id) return NextResponse.json({ error: "foreign_contact" }, { status: 403 });
  const phone = normalizePhone(c.phone_number);
  if (!phone) return NextResponse.json({ error: "not_uz_phone" }, { status: 422 });
  const row = await one<{ id: string; is_new: boolean }>(
    `INSERT INTO customers (phone, phone_verified_at) VALUES ($1, now())
     ON CONFLICT (phone) DO UPDATE SET phone_verified_at = now(), updated_at = now()
     RETURNING id, (xmax = 0) AS is_new`,
    [phone]
  );
  await linkTelegram(row!.id, tg.user.id);
  await createSession(row!.id);
  await rememberRef(row!.id);
  await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'login', $2)`, [row!.id, JSON.stringify({ channel: "telegram_contact" })]);
  return NextResponse.json({ customer: publicCustomer((await customerById(row!.id))!), isNew: row!.is_new });
}
