// Настройка бота магазина после выкладки сайта (запускать один раз и после смены адреса сайта):
//   node --env-file=.env.local scripts/telegram-setup.mjs
// Делает: кнопку меню «Магазин» (открывает Mini App), команды, описание, вебхук для ответа на /start.
const token = process.env.TELEGRAM_BOT_TOKEN;
const site = (process.env.SITE_URL || "").replace(/\/$/, "");
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
if (!token || !site || !secret) {
  console.error("Нужны TELEGRAM_BOT_TOKEN, SITE_URL (https://…) и TELEGRAM_WEBHOOK_SECRET в .env.local");
  process.exit(1);
}
if (!site.startsWith("https://")) {
  console.error("SITE_URL должен начинаться с https:// — Telegram открывает Mini App только по https");
  process.exit(1);
}
const call = async (method, body) => {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json();
  console.log(j.ok ? "✓" : "✗", method, j.ok ? "" : j.description);
  return j;
};
await call("setChatMenuButton", { menu_button: { type: "web_app", text: "Магазин", web_app: { url: `${site}/` } } });
await call("setMyCommands", { commands: [{ command: "start", description: "Открыть магазин NABI" }] });
await call("setMyCommands", { commands: [{ command: "start", description: "NABI do'konini ochish" }], language_code: "uz" });
await call("setMyShortDescription", { short_description: "Оригинальная корейская косметика с доставкой по Узбекистану" });
await call("setMyDescription", { description: "NABI — оригинальная корейская косметика. Каталог, подбор ухода, заказ и доставка — прямо в Telegram." });
await call("setWebhook", { url: `${site}/api/telegram/webhook`, secret_token: secret, allowed_updates: ["message"], drop_pending_updates: true });
const me = await call("getMe", {});
if (me.ok) console.log(`\nГотово. Бот: https://t.me/${me.result.username}\nСсылка на Mini App для креаторов: создайте приложение в @BotFather (/newapp, адрес ${site}/),\nзатем укажите NEXT_PUBLIC_TG_APP_URL=https://t.me/${me.result.username}/<имя приложения>`);
