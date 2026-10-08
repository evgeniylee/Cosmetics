// Адрес страницы бренда из его названия: «Beauty of Joseon» → beauty-of-joseon, «SKIN1004» → skin1004.
export const brandSlug = (name: string) =>
  name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "brand";
