import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer } from "@/server/auth";
import { AddressBody, listAddresses } from "@/server/addresses";

export const dynamic = "force-dynamic";

export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ addresses: await listAddresses(me.id) });
}

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = AddressBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", issues: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  const count = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM customer_addresses WHERE customer_id = $1`, [me.id]))!.n;
  if (count >= 10) return NextResponse.json({ error: "too_many" }, { status: 409 });
  const def = p.data.isDefault || count === 0;
  if (def) await one(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [me.id]);
  await one(`INSERT INTO customer_addresses (customer_id, label, city, address, comment, is_default) VALUES ($1, $2, $3, $4, $5, $6)`,
    [me.id, p.data.label || null, p.data.city, p.data.address, p.data.comment || null, def]);
  return NextResponse.json({ addresses: await listAddresses(me.id) });
}
