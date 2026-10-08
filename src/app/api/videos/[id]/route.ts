import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { isBot } from "@/server/creators";

export const dynamic = "force-dynamic";

// Счётчики видео: просмотр, переход на товар, добавление в корзину. Без персональных данных.
const COL = { view: "views", click: "product_clicks", cart: "cart_adds" } as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { type } = (await req.json().catch(() => ({}))) as { type?: keyof typeof COL };
  if (!type || !(type in COL) || !/^[\w-]{1,40}$/.test(id) || isBot(req.headers.get("user-agent") || "")) return NextResponse.json({ ok: false }, { status: 400 });
  await one(`UPDATE videos SET ${COL[type]} = ${COL[type]} + 1 WHERE id = $1 AND active`, [id]);
  return NextResponse.json({ ok: true });
}
