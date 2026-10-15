// Telegram Mini App: проверка подписанных данных от Telegram (initData и ответ на запрос номера).
// Подпись: HMAC-SHA256(data_check_string, HMAC-SHA256(bot_token, "WebAppData")), см. core.telegram.org/bots/webapps.
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { one } from "./db";

export type TgUser = { id: number; first_name?: string; last_name?: string; username?: string; language_code?: string };
export type TgContact = { user_id: number; phone_number: string; first_name?: string; last_name?: string };

const MAX_AGE = 24 * 3600; // initData живёт, пока открыто приложение; старше суток не принимаем

/** Проверяет подпись строки вида initData. Возвращает поля или null, если подпись неверна или данные устарели. */
export function verifyTelegramData(raw: string, maxAge = MAX_AGE): Record<string, string> | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !raw || raw.length > 8192) return null;
  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  const pairs: string[] = [];
  const out: Record<string, string> = {};
  for (const [k, v] of params) {
    if (k === "hash") continue;
    out[k] = v;
    pairs.push(`${k}=${v}`);
  }
  pairs.sort();
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const calc = createHmac("sha256", secret).update(pairs.join("\n")).digest();
  if (!timingSafeEqual(calc, Buffer.from(hash, "hex"))) return null;
  const age = Date.now() / 1000 - Number(out.auth_date);
  if (!Number.isFinite(age) || age > maxAge || age < -300) return null;
  return out;
}

export function initDataUser(raw: string): { user: TgUser; startParam: string | null } | null {
  const d = verifyTelegramData(raw);
  if (!d?.user) return null;
  try {
    const user = JSON.parse(d.user) as TgUser;
    if (!Number.isSafeInteger(user.id)) return null;
    return { user, startParam: d.start_param && /^[\w-]{1,64}$/.test(d.start_param) ? d.start_param : null };
  } catch {
    return null;
  }
}

/** Ответ Telegram на requestContact — подписан так же, как initData. */
export function verifiedContact(raw: string): TgContact | null {
  const d = verifyTelegramData(raw, 600);
  if (!d?.contact) return null;
  try {
    const c = JSON.parse(d.contact) as TgContact;
    return Number.isSafeInteger(c.user_id) && typeof c.phone_number === "string" ? c : null;
  } catch {
    return null;
  }
}

/** Ссылка на Mini App для креаторов и рассылок: https://t.me/<бот>/<приложение>?startapp=… (из NEXT_PUBLIC_TG_APP_URL). */
export const TG_APP_URL = process.env.NEXT_PUBLIC_TG_APP_URL || "";

/** Привязка Telegram-аккаунта к клиенту: дальше вход в Mini App — без кода. Один Telegram — один клиент. */
export async function linkTelegram(customerId: string, tgId: number) {
  await one(`UPDATE customers SET telegram_user_id = NULL WHERE telegram_user_id = $1 AND id <> $2`, [tgId, customerId]);
  await one(`UPDATE customers SET telegram_user_id = $2, updated_at = now() WHERE id = $1 AND telegram_user_id IS DISTINCT FROM $2`, [customerId, tgId]);
}
