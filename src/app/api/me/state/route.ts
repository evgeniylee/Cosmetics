// Корзина и избранное вошедшего клиента.
// PUT {mode:"merge"} — при входе: объединяем то, что лежит в браузере, с сохранённым в аккаунте.
// PUT {mode:"replace"} — дальнейшие изменения с устройства.
import { NextResponse } from "next/server";
import { z } from "zod";
import { many, one } from "@/server/db";
import { currentCustomer } from "@/server/auth";
import { parseKey } from "@/lib/variants";

export const dynamic = "force-dynamic";

const Body = z.object({
  mode: z.enum(["merge", "replace"]),
  cart: z.record(z.string().max(90), z.number().int().min(1).max(50)).refine((c) => Object.keys(c).length <= 60),
  favorites: z.array(z.string().max(40)).max(300),
});

async function load(id: string) {
  const cart = await many<{ product_id: string; qty: number }>(`SELECT product_id, qty FROM customer_cart WHERE customer_id = $1`, [id]);
  const fav = await many<{ product_id: string }>(`SELECT product_id FROM customer_favorites WHERE customer_id = $1 ORDER BY created_at`, [id]);
  return { cart: Object.fromEntries(cart.map((r) => [r.product_id, r.qty])), favorites: fav.map((r) => r.product_id) };
}

export async function GET() {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await load(me.id));
}

export async function PUT(req: Request) {
  const me = await currentCustomer();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const known = new Set((await many<{ id: string }>(`SELECT id FROM products`)).map((r) => r.id));
  let { cart, favorites } = p.data;
  // Ключ корзины может быть "товар~вариант": проверяем товар.
  cart = Object.fromEntries(Object.entries(cart).filter(([k]) => known.has(parseKey(k).pid)));
  favorites = favorites.filter((id) => known.has(id));

  if (p.data.mode === "merge") {
    // В корзине — больше из двух количеств (а не сумма: иначе каждый вход удваивал бы товары), избранное — объединение.
    const saved = await load(me.id);
    for (const [id, q] of Object.entries(saved.cart)) cart[id] = Math.max(cart[id] ?? 0, q);
    favorites = [...new Set([...saved.favorites, ...favorites])];
  }
  await one(`DELETE FROM customer_cart WHERE customer_id = $1`, [me.id]);
  for (const [id, q] of Object.entries(cart)) await one(`INSERT INTO customer_cart (customer_id, product_id, qty) VALUES ($1, $2, $3)`, [me.id, id, Math.min(q, 50)]);
  await one(`DELETE FROM customer_favorites WHERE customer_id = $1 AND NOT (product_id = ANY($2::text[]))`, [me.id, favorites]);
  for (const id of favorites) await one(`INSERT INTO customer_favorites (customer_id, product_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [me.id, id]);
  return NextResponse.json({ cart, favorites });
}
