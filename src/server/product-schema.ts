// Схема товара: общая для формы в админке и импорта из Excel.
import { z } from "zod";
import { CATEGORIES, CONCERNS, PACKS, SKIN_TYPES } from "@/data/catalog";

const L10n = z.object({ ru: z.string().trim().max(4000), uz: z.string().trim().max(4000) });
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const ProductInput = z.object({
  id: z.string().optional(),
  slug: z.string().trim().toLowerCase().regex(slugRe, "Только латиница, цифры и дефис").max(120),
  brand: z.string().trim().min(1, "Укажите бренд").max(80),
  name: z.string().trim().min(1, "Укажите название").max(200),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], { message: "Выберите категорию" }),
  skin: z.array(z.enum(SKIN_TYPES.map((c) => c.id) as [string, ...string[]])).default([]),
  concerns: z.array(z.enum(CONCERNS.map((c) => c.id) as [string, ...string[]])).default([]),
  volume: z.coerce.number().min(0).max(100000),
  unit: z.enum(["ml", "pcs", "g"]),
  price: z.coerce.number().int("Цена в сумах без копеек").min(1000, "Цена от 1 000 сум"),
  oldPrice: z.coerce.number().int().min(0).nullable().optional(),
  costPrice: z.coerce.number().int().min(0).nullable().optional(),
  stock: z.enum(["in_stock", "on_order", "out"]),
  active: z.boolean(),
  badge: z.enum(["", "hit", "choice", "new"]).optional(),
  rating: z.coerce.number().min(0).max(5),
  reviews: z.coerce.number().int().min(0),
  daysSupply: z.coerce.number().int().min(1).max(730),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет в формате #RRGGBB"),
  pack: z.enum(PACKS as [string, ...string[]]),
  images: z.array(z.string().startsWith("/")).max(10),
  fbt: z.array(z.string()).max(3),
  sort: z.coerce.number().int().min(0).max(100000),
  content: z.object({
    type: L10n,
    desc: L10n,
    why: L10n,
    howTo: L10n,
    ingredients: z.array(L10n).max(20),
    rank: L10n.nullable(),
    reviewSummary: L10n.nullable(),
  }),
});
export type ProductInputT = z.infer<typeof ProductInput>;

