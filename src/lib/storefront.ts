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
export type VideoCreator = { code: string; name: string; handle: string | null; percent: number; photo: string | null };
export type HomeVideo = { id: string; title: L10n; description: L10n; src: string; poster: string | null; products: string[]; creator: VideoCreator | null };
export type FeaturedCreator = { code: string; name: string; handle: string | null; percent: number; picks: string[]; photo: string | null };
