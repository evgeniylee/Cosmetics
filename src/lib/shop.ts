import type { Lang, Product } from "@/data/catalog";

// ---- Форматирование ----
export function money(n: number, lang: Lang) {
  const s = Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${s} ${lang === "uz" ? "so'm" : "сум"}`;
}

export function unitPrice(p: Product, lang: Lang) {
  const per = Math.round(p.price / p.volume / 10) * 10;
  const unit = p.unit === "ml" ? (lang === "uz" ? "ml" : "мл") : lang === "uz" ? "dona" : "шт";
  return `${money(per, lang)} / ${unit}`;
}

export function volumeLabel(p: Product, lang: Lang) {
  const unit = p.unit === "ml" ? (lang === "uz" ? "ml" : "мл") : lang === "uz" ? "dona" : "шт";
  return `${p.volume} ${unit}`;
}

export const discountPct = (p: Product) => (p.oldPrice ? Math.round((1 - p.price / p.oldPrice) * 100) : 0);

// ---- Доставка ----
export const CITIES: { id: string; ru: string; uz: string }[] = [
  { id: "tashkent", ru: "Ташкент", uz: "Toshkent" },
  { id: "samarkand", ru: "Самарканд", uz: "Samarqand" },
  { id: "bukhara", ru: "Бухара", uz: "Buxoro" },
  { id: "fergana", ru: "Фергана", uz: "Farg'ona" },
  { id: "andijan", ru: "Андижан", uz: "Andijon" },
  { id: "namangan", ru: "Наманган", uz: "Namangan" },
  { id: "nukus", ru: "Нукус", uz: "Nukus" },
  { id: "karshi", ru: "Карши", uz: "Qarshi" },
  { id: "termez", ru: "Термез", uz: "Termiz" },
  { id: "navoi", ru: "Навои", uz: "Navoiy" },
  { id: "jizzakh", ru: "Джизак", uz: "Jizzax" },
  { id: "urgench", ru: "Ургенч", uz: "Urganch" },
];

export const FREE_FROM = 400_000;
export const SAMPLES_FROM = 300_000;
export const DELIVERY_TASHKENT = 25_000;
export const DELIVERY_REGIONS = 35_000;
export const CUTOFF_HOUR = 18; // по Ташкенту

export function deliveryCost(city: string, afterDiscount: number) {
  if (afterDiscount <= 0) return 0;
  if (city === "tashkent") return afterDiscount >= FREE_FROM ? 0 : DELIVERY_TASHKENT;
  return DELIVERY_REGIONS;
}

/** Миллисекунды до отсечки 18:00 по Ташкенту (UTC+5), либо 0 если уже позже. */
export function msToCutoff(now = new Date()) {
  const tashNow = new Date(now.getTime() + (now.getTimezoneOffset() + 300) * 60000);
  const cut = new Date(tashNow);
  cut.setHours(CUTOFF_HOUR, 0, 0, 0);
  return Math.max(0, cut.getTime() - tashNow.getTime());
}

export function fmtCountdown(ms: number, lang: Lang) {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return lang === "uz" ? `${h} soat ${m} daq` : `${h} ч ${m} мин`;
}

// ---- Промокоды: проверяются на сервере (/api/promo), здесь только расчёт ----
export type Promo = { code: string; percent: number };

/** Скидки не суммируются: выбираем максимальную из доступных. Процент кода приходит из базы. */
export function bestDiscount(subtotal: number, promo: Promo | null) {
  const options: { source: string; amount: number }[] = [];
  if (promo) options.push({ source: promo.code, amount: Math.round((subtotal * promo.percent) / 100 / 1000) * 1000 });
  return options.sort((a, b) => b.amount - a.amount)[0] ?? null;
}
