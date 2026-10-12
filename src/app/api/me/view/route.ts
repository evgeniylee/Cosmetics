// Просмотр товара вошедшим клиентом — для карточки клиента в CRM (что присматривает).
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ ok: false });
  const { pid } = (await req.json().catch(() => ({}))) as { pid?: string };
  if (typeof pid !== "string" || !/^[\w-]{1,40}$/.test(pid)) return NextResponse.json({ ok: false }, { status: 400 });
  await one(
    `INSERT INTO customer_product_views (customer_id, product_id)
     SELECT $1, id FROM products WHERE id = $2
     ON CONFLICT (customer_id, product_id) DO UPDATE SET views = customer_product_views.views + 1, last_at = now()`,
    [me.id, pid]
  );
  return NextResponse.json({ ok: true });
}
