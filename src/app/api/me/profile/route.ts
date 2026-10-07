// Изменение личных данных из профиля.
import { NextResponse } from "next/server";
import { z } from "zod";
import { one } from "@/server/db";
import { currentCustomer, customerById, publicCustomer } from "@/server/auth";

const Body = z.object({
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().min(1).max(60),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  lang: z.enum(["ru", "uz"]),
  marketing: z.boolean(),
});

export async function PUT(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", issues: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const b = p.data;
  if (b.birthDate) {
    const age = (Date.now() - new Date(b.birthDate + "T00:00:00Z").getTime()) / (365.25 * 86400000);
    if (Number.isNaN(age) || age < 14 || age > 100) return NextResponse.json({ error: "invalid", issues: ["birthDate"] }, { status: 400 });
  }
  await one(
    `UPDATE customers SET first_name = $2, last_name = $3, birth_date = $4, lang = $5, marketing_opt_in = $6, updated_at = now() WHERE id = $1`,
    [me.id, b.firstName, b.lastName, b.birthDate, b.lang, b.marketing]
  );
  if (b.marketing !== me.marketing_opt_in)
    await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'marketing_changed', $2)`, [me.id, JSON.stringify({ marketing: b.marketing })]);
  return NextResponse.json({ customer: publicCustomer((await customerById(me.id))!) });
}
