// Бот магазина: на /start (и любое сообщение) отвечает приветствием и кнопкой «Открыть магазин» (Mini App).
// Ссылка вида t.me/<бот>?start=c_MADINA — переход креатора: магазин откроется через /c/MADINA.
// Защита: Telegram присылает секрет из TELEGRAM_WEBHOOK_SECRET в заголовке X-Telegram-Bot-Api-Secret-Token.
import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Update = { message?: { chat: { id: number; type: string }; text?: string; from?: { language_code?: string } } };

function secretOk(req: Request) {
  const want = process.env.TELEGRAM_WEBHOOK_SECRET || "";
  const got = req.headers.get("x-telegram-bot-api-secret-token") || "";
  return !!want && want.length === got.length && timingSafeEqual(Buffer.from(want), Buffer.from(got));
}

export async function POST(req: Request) {
  if (!secretOk(req)) return NextResponse.json({ ok: false }, { status: 401 });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const u = (await req.json().catch(() => ({}))) as Update;
  const m = u.message;
  if (!token || !site || !m || m.chat.type !== "private") return NextResponse.json({ ok: true });

  const uz = (m.from?.language_code || "").startsWith("uz");
  const lang = uz ? "uz" : "ru";
  const payload = /^\/start\s+([\w-]{1,64})/.exec(m.text || "")?.[1] ?? "";
  let path = `/${lang}`;
  const creator = /^c_([A-Za-z0-9]{3,20})(?:_([\w-]{1,20}))?$/.exec(payload);
  const product = /^p_([a-z0-9-]{1,60})$/.exec(payload);
  if (creator) path = `/c/${creator[1].toUpperCase()}${creator[2] ? `/${creator[2]}` : ""}`;
  else if (product) path = `/${lang}/p/${product[1]}`;

  const text = uz
    ? "Assalomu alaykum! Bu NABI — original koreys kosmetikasi.\nDo'konni shu yerda, Telegramdan chiqmasdan oching 👇"
    : "Здравствуйте! Это NABI — оригинальная корейская косметика.\nОткройте магазин прямо здесь, не выходя из Telegram 👇";
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: m.chat.id,
      text,
      reply_markup: { inline_keyboard: [[{ text: uz ? "Do'konni ochish" : "Открыть магазин", web_app: { url: site + path } }]] },
    }),
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}
