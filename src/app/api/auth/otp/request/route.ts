import { NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/server/db";
import { clientIp, normalizePhone } from "@/server/auth";
import { DEMO_CODE, GatewayError, otpMode, sendCode } from "@/server/gateway";

const Body = z.object({ phone: z.string() });

// Лимиты: 3 кода на номер за 15 минут, 5 разных номеров с одного IP за час.
const PER_PHONE = 3;
const PER_IP_PHONES = 5;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  const phone = normalizePhone(parsed.success ? parsed.data.phone : null);
  if (!phone) return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
  const ip = await clientIp();

  const byPhone = await one<{ n: number }>(`SELECT count(*)::int AS n FROM otp_requests WHERE phone = $1 AND created_at > now() - interval '15 minutes'`, [phone]);
  if ((byPhone?.n ?? 0) >= PER_PHONE) return NextResponse.json({ error: "too_many_requests", retryAfter: 900 }, { status: 429 });
  const byIp = await one<{ n: number }>(`SELECT count(DISTINCT phone)::int AS n FROM otp_requests WHERE ip = $1 AND created_at > now() - interval '1 hour'`, [ip]);
  if ((byIp?.n ?? 0) >= PER_IP_PHONES) return NextResponse.json({ error: "too_many_requests", retryAfter: 3600 }, { status: 429 });

  const mode = otpMode();
  if (mode === "off") {
    return NextResponse.json({ channel: "none" });
  }

  if (mode === "demo") {
    const r = await one<{ id: string }>(`INSERT INTO otp_requests (phone, ip, channel) VALUES ($1, $2, 'demo') RETURNING id`, [phone, ip]);
    return NextResponse.json({ requestId: r!.id, channel: "demo", demoCode: DEMO_CODE });
  }

  try {
    const sent = await sendCode(phone);
    if (!sent) {
      await one(`INSERT INTO otp_requests (phone, ip, channel, status) VALUES ($1, $2, 'none', 'failed')`, [phone, ip]);
      return NextResponse.json({ channel: "none" });
    }
    const r = await one<{ id: string }>(
      `INSERT INTO otp_requests (phone, ip, channel, gateway_request_id, cost) VALUES ($1, $2, 'telegram', $3, $4) RETURNING id`,
      [phone, ip, sent.requestId, sent.cost]
    );
    return NextResponse.json({ requestId: r!.id, channel: "telegram" });
  } catch (e) {
    console.error("[otp] gateway error", e instanceof GatewayError ? e.message : e);
    return NextResponse.json({ error: "gateway_unavailable" }, { status: 502 });
  }
}
