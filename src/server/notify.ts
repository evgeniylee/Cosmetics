// Уведомления менеджеру в Telegram через бота.
// Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_ADMIN_CHAT_ID (id чата или группы, куда бот добавлен).
// Без них сообщение просто пишется в лог сервера.

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export async function notifyAdmin(html: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (!token || !chat) {
    console.log("[notify] (бот не настроен)\n" + html.replace(/<[^>]+>/g, ""));
    return;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chat, text: html, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) console.error("[notify] telegram error", res.status, await res.text());
  } catch (e) {
    console.error("[notify] failed", e);
  }
}

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сум";

export function orderMessage(o: {
  number: string;
  status: string;
  name: string;
  phone: string;
  city: string;
  address: string;
  comment?: string | null;
  payment: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  discountSource: string | null;
  delivery: number;
  total: number;
  samples: string[];
  isNewCustomer: boolean;
}) {
  const pay = { click: "Click", payme: "Payme", cash: "Наличными курьеру" }[o.payment] ?? o.payment;
  const lines = [
    `${o.status === "needs_call" ? "📞 <b>Требует звонка</b> · " : "🆕 "}<b>Заказ ${esc(o.number)}</b>${o.isNewCustomer ? " · новый клиент" : ""}`,
    "",
    `👤 ${esc(o.name)}, <code>${esc(o.phone)}</code>`,
    `📍 ${esc(o.city)}, ${esc(o.address)}`,
    o.comment ? `💬 ${esc(o.comment)}` : null,
    "",
    ...o.items.map((i) => `• ${esc(i.name)} × ${i.qty} — ${fmt(i.price * i.qty)}`),
    o.samples.length ? `🎁 Пробники: ${esc(o.samples.join(", "))}` : null,
    "",
    `Товары: ${fmt(o.subtotal)}`,
    o.discount ? `Скидка ${esc(o.discountSource || "")}: −${fmt(o.discount)}` : null,
    `Доставка: ${o.delivery ? fmt(o.delivery) : "бесплатно"}`,
    `<b>Итого: ${fmt(o.total)}</b> · ${pay}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
