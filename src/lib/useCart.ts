"use client";
import { getById, type Product } from "@/data/catalog";
import { bestDiscount, deliveryCost } from "@/lib/shop";
import { useHydrated, useShop } from "@/store/shop";

export type CartLine = { p: Product; qty: number };

export function useCartTotals() {
  const hydrated = useHydrated();
  const rawCart = useShop((s) => s.cart);
  const promo = useShop((s) => s.promo);
  const city = useShop((s) => s.city);
  const cart = hydrated ? rawCart : {};
  const lines: CartLine[] = Object.entries(cart)
    .map(([id, qty]) => ({ p: getById(id)!, qty }))
    .filter((l) => l.p);
  const subtotal = lines.reduce((a, l) => a + l.p.price * l.qty, 0);
  const disc = bestDiscount(subtotal, hydrated ? promo : null);
  const discount = disc?.amount ?? 0;
  const afterDiscount = subtotal - discount;
  const delivery = deliveryCost(hydrated ? city : "tashkent", afterDiscount);
  return { hydrated, cart, lines, count: lines.reduce((a, l) => a + l.qty, 0), subtotal, discount, discountSource: disc?.source ?? null, afterDiscount, delivery, total: afterDiscount + delivery, city: hydrated ? city : "tashkent" };
}
