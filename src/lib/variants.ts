// Варианты товара в корзине и на витрине. Ключ корзины: "id товара" или "id товара~id варианта".
import type { Lang, Product, Variant } from "@/data/catalog";

export const VSEP = "~";
export const cartKey = (productId: string, variantId?: string | null) => (variantId ? `${productId}${VSEP}${variantId}` : productId);
export function parseKey(key: string) {
  const i = key.indexOf(VSEP);
  return i < 0 ? { pid: key, vid: null as string | null } : { pid: key.slice(0, i), vid: key.slice(i + 1) };
}

/** Вариант по умолчанию: первый в наличии, иначе первый. */
export const defaultVariant = (p: Product): Variant | undefined => p.variants?.find((v) => v.stock !== "out") ?? p.variants?.[0];

/** Товар «под вариант»: цена и объём (для объёмов), фото и наличие варианта. */
export function withVariant(p: Product, vid?: string | null): Product {
  if (!p.variants?.length) return p;
  const v = (vid && p.variants.find((x) => x.id === vid)) || defaultVariant(p)!;
  return {
    ...p,
    variant: v,
    price: v.price ?? p.price,
    oldPrice: v.price != null ? v.oldPrice : p.oldPrice,
    volume: v.volume ?? p.volume,
    images: v.images.length ? [...v.images, ...(p.images ?? []).filter((x) => !v.images.includes(x))] : p.images,
    stock: v.stock,
  };
}

export const variantLabel = (p: Product, lang: Lang) => (p.variant ? p.variant.name[lang] || p.variant.name.ru : null);

/** У объёмов цены разные: в карточке «от …». */
export const hasPriceRange = (p: Product) =>
  p.variantKind === "volume" && new Set((p.variants ?? []).filter((v) => v.stock !== "out").map((v) => v.price)).size > 1;
