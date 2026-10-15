// Общие типы витрины главной (сервер + клиент).
import type { L10n } from "@/data/catalog";

export const RAIL_KEYS = ["hits", "new", "sale", "recommended"] as const;
export type RailKey = (typeof RAIL_KEYS)[number];

/** Правила авто-режима лент — показываем и в админке. */
export const RAIL_RULES: Record<RailKey, string> = {
  hits: "Больше всего продаж за 90 дней, при равенстве — больше отзывов",
  new: "Товары с меткой «Новинка», затем недавно добавленные",
  sale: "Товары со старой ценой, по размеру скидки",
  recommended: "Метка «Выбор», затем высокий рейтинг при большом числе отзывов",
};
/** Куда ведёт «Все» у ленты. */
export const RAIL_ALL: Partial<Record<RailKey, string>> = { hits: "/catalog?sort=popular", new: "/catalog?sort=new", sale: "/catalog?sale=1" };

export type HomeRail = { key: RailKey; title: L10n; ids: string[] };
export type HomeVideo = { id: string; title: L10n; description: L10n; src: string; poster: string | null; products: string[] };
/** Баннер карусели на главной. href — путь без языка: /quiz, /catalog?cat=spf. */
export type HeroBanner = {
  id: string; tone: "light" | "dark"; bg: string;
  image?: { desktop: string; mobile: string };
  art: string[]; eyebrow: L10n; title: L10n; text: L10n; cta: L10n; href: string;
};
/** Иконки категорий, которые можно поставить на баннер без картинки. */
export const BANNER_ICONS = ["clean", "toner", "essence", "serum", "cream", "spf", "mask"] as const;

export type FeaturedCreator = { code: string; name: string; handle: string | null; percent: number; picks: string[]; photo: string | null };
