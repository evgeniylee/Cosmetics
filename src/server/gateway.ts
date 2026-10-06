// Клиент Telegram Gateway: https://core.telegram.org/gateway/api
// Без TELEGRAM_GATEWAY_TOKEN работает демо-режим (код 111111), но только вне продакшена
// или при явном ALLOW_DEMO_OTP=1.

const BASE = "https://gatewayapi.telegram.org/";
export const DEMO_CODE = "111111";

type GatewayResult = {
  request_id: string;
  phone_number: string;
  request_cost: number;
  remaining_balance?: number;
  verification_status?: { status: "code_valid" | "code_invalid" | "code_max_attempts_exceeded" | "expired" };
};

async function call(method: string, body: Record<string, unknown>): Promise<GatewayResult> {
  const res = await fetch(BASE + method, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.TELEGRAM_GATEWAY_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({ ok: false, error: `HTTP_${res.status}` }))) as { ok: boolean; result?: GatewayResult; error?: string };
  if (!json.ok || !json.result) throw new GatewayError(json.error || "UNKNOWN");
  return json.result;
}

export class GatewayError extends Error {}

export function otpMode(): "telegram" | "demo" | "off" {
  if (process.env.TELEGRAM_GATEWAY_TOKEN) return "telegram";
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_OTP === "1") return "demo";
  return "off";
}

/** Отправляет код. Возвращает request_id или null, если у номера нет Telegram. */
export async function sendCode(phone: string): Promise<{ requestId: string; cost: number } | null> {
  // checkSendAbility бесплатен, если отправить нельзя; его request_id делает отправку без двойной оплаты.
  let ability: GatewayResult;
  try {
    ability = await call("checkSendAbility", { phone_number: phone });
  } catch (e) {
    if (e instanceof GatewayError && /PHONE_NUMBER|NOT_FOUND|CANT_SEND|USER/i.test(e.message)) return null;
    throw e;
  }
  const sent = await call("sendVerificationMessage", {
    phone_number: phone,
    request_id: ability.request_id,
    code_length: 6,
    ttl: 300,
  });
  return { requestId: sent.request_id, cost: sent.request_cost };
}

export async function checkCode(requestId: string, code: string) {
  const r = await call("checkVerificationStatus", { request_id: requestId, code });
  return r.verification_status?.status ?? "code_invalid";
}
