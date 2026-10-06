"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type Customer = { id: string; phone: string; firstName: string; lastName: string; birthDate: string; marketing: boolean };
type Order = { id: string; total: number; items: { id: string; qty: number }[]; code: string | null; city: string; createdAt: string };

type ShopState = {
  cart: Record<string, number>;
  promo: string | null;
  samples: string[];
  city: string;
  favorites: string[];
  recent: string[];
  recentQueries: string[];
  customer: Customer | null;
  orders: Order[];
  add: (id: string, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clearCart: () => void;
  setPromo: (c: string | null) => void;
  toggleSample: (id: string) => void;
  setCity: (c: string) => void;
  toggleFav: (id: string) => void;
  viewed: (id: string) => void;
  searched: (q: string) => void;
  setCustomer: (c: Customer) => void;
  addOrder: (o: Order) => void;
};

export const useShop = create<ShopState>()(
  persist(
    (set) => ({
      cart: {},
      promo: null,
      samples: [],
      city: "tashkent",
      favorites: [],
      recent: [],
      recentQueries: [],
      customer: null,
      orders: [],
      add: (id, qty = 1) => set((s) => ({ cart: { ...s.cart, [id]: (s.cart[id] || 0) + qty } })),
      setQty: (id, qty) =>
        set((s) => {
          const cart = { ...s.cart };
          if (qty <= 0) delete cart[id];
          else cart[id] = qty;
          return { cart };
        }),
      remove: (id) => set((s) => { const cart = { ...s.cart }; delete cart[id]; return { cart }; }),
      clearCart: () => set({ cart: {}, promo: null, samples: [] }),
      setPromo: (promo) => set({ promo }),
      toggleSample: (id) =>
        set((s) => ({ samples: s.samples.includes(id) ? s.samples.filter((x) => x !== id) : s.samples.length >= 2 ? s.samples : [...s.samples, id] })),
      setCity: (city) => set({ city }),
      toggleFav: (id) => set((s) => ({ favorites: s.favorites.includes(id) ? s.favorites.filter((x) => x !== id) : [...s.favorites, id] })),
      viewed: (id) => set((s) => ({ recent: [id, ...s.recent.filter((x) => x !== id)].slice(0, 12) })),
      searched: (q) => set((s) => ({ recentQueries: [q, ...s.recentQueries.filter((x) => x !== q)].slice(0, 5) })),
      setCustomer: (customer) => set({ customer }),
      addOrder: (o) => set((s) => ({ orders: [o, ...s.orders] })),
    }),
    { name: "nabi-shop" }
  )
);

// UI-состояние без сохранения: шторка «Добавлено в корзину», поиск, меню, тон текущего слайда.
type UiState = {
  addedId: string | null;
  setAdded: (id: string | null) => void;
  searchOpen: boolean;
  setSearch: (v: boolean) => void;
  menuOpen: boolean;
  setMenu: (v: boolean) => void;
  heroTone: "light" | "dark";
  setHeroTone: (t: "light" | "dark") => void;
};
export const useUi = create<UiState>((set) => ({
  addedId: null,
  setAdded: (addedId) => set({ addedId }),
  searchOpen: false,
  setSearch: (searchOpen) => set({ searchOpen, menuOpen: false }),
  menuOpen: false,
  setMenu: (menuOpen) => set({ menuOpen }),
  heroTone: "light",
  setHeroTone: (heroTone) => set({ heroTone }),
}));

/** true после гидратации persist, чтобы не было расхождения SSR и клиента. */
import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
