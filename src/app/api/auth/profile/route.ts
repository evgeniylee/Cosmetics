import { NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/server/db";
import { currentCustomer, customerById, publicCustomer } from "@/server/auth";

const CONSENT_VERSION = "2026-10";

const Body = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  consent: z.literal(true),
  marketing: z.boolean().default(false),
  lang: z.enum(["ru", "uz"]).optional(),
  utm: z.record(z.string(), z.string()).optional(),
});

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_profile", issues: parsed.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const p = parsed.data;

  if (p.birthDate) {
    const d = new Date(p.birthDate + "T00:00:00Z");
    const age = (Date.now() - d.getTime()) / (365.25 * 86400000);
    if (Number.isNaN(age) || age < 14 || age > 100) return NextResponse.json({ error: "invalid_profile", issues: ["birthDate"] }, { status: 400 });
  }

  await one(
    `UPDATE customers SET first_name = $2, last_name = $3, birth_date = $4, marketing_opt_in = $5,
       consent_version = $6, consent_at = now(), lang = COALESCE($7, lang),
       first_utm = COALESCE(first_utm, $8::jsonb), first_creator_code = COALESCE(first_creator_code, $9),
       updated_at = now()
     WHERE id = $1`,
    [me.id, p.firstName, p.lastName, p.birthDate ?? null, p.marketing, CONSENT_VERSION, p.lang ?? null, p.utm ? JSON.stringify(p.utm) : null, p.utm?.ref?.toUpperCase() ?? null]
  );
  await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'signup_completed', $2)`, [me.id, JSON.stringify({ marketing: p.marketing })]);
  return NextResponse.json({ customer: publicCustomer((await customerById(me.id))!) });
}
