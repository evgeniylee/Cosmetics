import { NextResponse } from "next/server";
import { promoByCode } from "@/server/catalog";

export const dynamic = "force-dynamic";

/** Проверка промокода для корзины. Возвращает только процент, без данных креатора. */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code");
  if (!code || code.length > 32) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const p = await promoByCode(code);
  if (!p) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ code: p.code, percent: p.percent });
}
