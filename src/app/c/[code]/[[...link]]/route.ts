// Короткая ссылка креатора: /c/madina или /c/madina/k7f2ab.
// Записывает переход (кроме ботов-превью), запоминает креатора в куке на 30 дней и ведёт на нужную страницу с промокодом.
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { one } from "@/server/db";
import { currentCustomer } from "@/server/auth";
import { CLICK_WINDOW_DAYS, REF_COOKIE, VISITOR_COOKIE, isBot } from "@/server/creators";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string; link?: string[] }> }) {
  const { code: raw, link } = await params;
  const url = new URL(req.url);
  const lang = (req.headers.get("accept-language") || "").toLowerCase().startsWith("uz") ? "uz" : "ru";
  const home = new URL(`/${lang}`, url);

  const promo = await one<{ code: string }>(`SELECT code FROM promo_codes WHERE code = $1 AND active`, [raw.toUpperCase()]);
  if (!promo) return NextResponse.redirect(home, 302);
  const l = link?.[0]
    ? await one<{ id: string; target_type: string; target: string | null }>(`SELECT id, target_type, target FROM creator_links WHERE id = $1 AND creator_code = $2 AND NOT archived`, [link[0], promo.code])
    : null;

  let path = `/${lang}`;
  if (l?.target_type === "picks") path = `/${lang}/catalog?creator=${promo.code}`;
  else if (l?.target_type === "category" && l.target) path = `/${lang}/catalog?cat=${encodeURIComponent(l.target)}`;
  else if (l?.target_type === "product" && l.target) {
    const p = await one<{ slug: string }>(`SELECT slug FROM products WHERE slug = $1 AND active`, [l.target]);
    if (p) path = `/${lang}/p/${p.slug}`;
  }
  const dest = new URL(path, url);
  dest.searchParams.set("promo", promo.code);
  dest.searchParams.set("utm_source", "creator");
  dest.searchParams.set("utm_campaign", promo.code.toLowerCase());
  if (l) dest.searchParams.set("utm_content", l.id);

  const res = NextResponse.redirect(dest, 302);
  res.headers.set("Cache-Control", "no-store");
  if (isBot(req.headers.get("user-agent") || "")) return res;

  const cookieHeader = req.headers.get("cookie") || "";
  let vid = /(?:^|;\s*)nabi_vid=([\w-]+)/.exec(cookieHeader)?.[1];
  if (!vid) {
    vid = randomBytes(9).toString("base64url");
    res.cookies.set(VISITOR_COOKIE, vid, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 400 * 86400, secure: process.env.NODE_ENV === "production" });
  }
  const now = Date.now();
  await one(`INSERT INTO link_clicks (creator_code, link_id, visitor_id) VALUES ($1, $2, $3)`, [promo.code, l?.id ?? null, vid]);
  res.cookies.set(REF_COOKIE, JSON.stringify({ c: promo.code, l: l?.id ?? null, t: now }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: CLICK_WINDOW_DAYS * 86400, secure: process.env.NODE_ENV === "production",
  });
  // Уже вошедший клиент: закрепляем переход за номером сразу.
  const me = await currentCustomer().catch(() => null);
  if (me) await one(`UPDATE customers SET ref_code = $2, ref_link = $3, ref_at = now() WHERE id = $1`, [me.id, promo.code, l?.id ?? null]);
  return res;
}
