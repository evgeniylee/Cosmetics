import { NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/server/db";
import { createSession, customerById, publicCustomer } from "@/server/auth";
import { rememberRef } from "@/server/creators";
import { DEMO_CODE, checkCode } from "@/server/gateway";

const Body = z.object({ requestId: z.string().uuid(), code: z.string().regex(/^\d{4,8}$/) });
const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { requestId, code } = parsed.data;

  const otp = await one<{ id: string; phone: string; channel: string; gateway_request_id: string | null; status: string; attempts: number; fresh: boolean }>(
    `SELECT id, phone, channel, gateway_request_id, status, attempts, created_at > now() - interval '5 minutes' AS fresh FROM otp_requests WHERE id = $1`,
    [requestId]
  );
  if (!otp || otp.status !== "sent") return NextResponse.json({ error: "request_not_found" }, { status: 404 });
  if (!otp.fresh) {
    await one(`UPDATE otp_requests SET status = 'expired' WHERE id = $1`, [otp.id]);
    return NextResponse.json({ error: "expired" }, { status: 410 });
  }
  if (otp.attempts >= MAX_ATTEMPTS) return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  await one(`UPDATE otp_requests SET attempts = attempts + 1 WHERE id = $1`, [otp.id]);

  let valid = false;
  if (otp.channel === "demo") valid = code === DEMO_CODE;
  else if (otp.channel === "telegram" && otp.gateway_request_id) {
    const status = await checkCode(otp.gateway_request_id, code).catch(() => "code_invalid");
    if (status === "expired" || status === "code_max_attempts_exceeded") {
      await one(`UPDATE otp_requests SET status = 'failed' WHERE id = $1`, [otp.id]);
      return NextResponse.json({ error: status }, { status: 410 });
    }
    valid = status === "code_valid";
  }
  if (!valid) return NextResponse.json({ error: "code_invalid", attemptsLeft: MAX_ATTEMPTS - otp.attempts - 1 }, { status: 400 });

  await one(`UPDATE otp_requests SET status = 'verified', verified_at = now() WHERE id = $1`, [otp.id]);
  const row = await one<{ id: string; is_new: boolean }>(
    `INSERT INTO customers (phone, phone_verified_at) VALUES ($1, now())
     ON CONFLICT (phone) DO UPDATE SET phone_verified_at = now(), updated_at = now()
     RETURNING id, (xmax = 0) AS is_new`,
    [otp.phone]
  );
  await createSession(row!.id);
  await rememberRef(row!.id); // переход креатора теперь привязан к номеру, а не только к браузеру
  await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'login', $2)`, [row!.id, JSON.stringify({ channel: otp.channel })]);
  const c = await customerById(row!.id);
  return NextResponse.json({ customer: publicCustomer(c!), isNew: row!.is_new });
}
