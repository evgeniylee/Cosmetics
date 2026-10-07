import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer } from "@/server/auth";
import { AddressBody, listAddresses } from "@/server/addresses";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const p = AddressBody.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid", issues: p.error.issues.map((i) => i.path.join(".")) }, { status: 400 });
  if (p.data.isDefault) await one(`UPDATE customer_addresses SET is_default = false WHERE customer_id = $1`, [me.id]);
  await one(`UPDATE customer_addresses SET label = $3, city = $4, address = $5, comment = $6, is_default = is_default OR $7 WHERE id = $1 AND customer_id = $2`,
    [id, me.id, p.data.label || null, p.data.city, p.data.address, p.data.comment || null, !!p.data.isDefault]);
  return NextResponse.json({ addresses: await listAddresses(me.id) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const del = await one<{ is_default: boolean }>(`DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2 RETURNING is_default`, [id, me.id]);
  // Удалили основной — основным становится самый свежий из оставшихся.
  if (del?.is_default)
    await one(`UPDATE customer_addresses SET is_default = true WHERE id = (SELECT id FROM customer_addresses WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 1)`, [me.id]);
  return NextResponse.json({ addresses: await listAddresses(me.id) });
}
