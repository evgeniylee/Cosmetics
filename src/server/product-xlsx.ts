// Товары ⇄ Excel. Один формат для выгрузки и загрузки: выгрузил, поправил цены, загрузил обратно.
// Строки сопоставляются по slug: есть в базе — обновляется, нет — создаётся.
import "server-only";
import ExcelJS from "exceljs";
import { ProductInput, type ProductInputT } from "./product-schema";
import type { ProductRow } from "./catalog";
import { many } from "./db";

type Def = { key: string; header: string; width?: number; hint?: string };
export const PRODUCT_COLUMNS: Def[] = [
  { key: "slug", header: "slug", width: 30, hint: "адрес страницы: латиница, цифры, дефис; по нему ищется товар" },
  { key: "brand", header: "brand", width: 16 },
  { key: "name", header: "name", width: 34 },
  { key: "category", header: "category", width: 10, hint: "clean, toner, essence, serum, spf, cream, mask" },
  { key: "skin", header: "skin", width: 18, hint: "через запятую: dry, oily, combo, sens, normal" },
  { key: "concerns", header: "concerns", width: 22, hint: "через запятую: acne, dryness, pigment, redness, aging, pores, dullness" },
  { key: "volume", header: "volume", width: 8 },
  { key: "unit", header: "unit", width: 6, hint: "ml, g, pcs" },
  { key: "price", header: "price", width: 11 },
  { key: "old_price", header: "old_price", width: 11 },
  { key: "cost_price", header: "cost_price", width: 11, hint: "себестоимость с доставкой до склада" },
  { key: "stock", header: "stock", width: 10, hint: "in_stock, on_order, out" },
  { key: "active", header: "active", width: 7, hint: "1 — на сайте, 0 — скрыт" },
  { key: "badge", header: "badge", width: 8, hint: "hit, choice, new или пусто" },
  { key: "rating", header: "rating", width: 7 },
  { key: "reviews", header: "reviews", width: 8 },
  { key: "days_supply", header: "days_supply", width: 10, hint: "на сколько дней хватает" },
  { key: "color", header: "color", width: 9, hint: "#RRGGBB — цвет упаковки-заглушки" },
  { key: "pack", header: "pack", width: 9, hint: "bottle, tube, jar, pump, dropper" },
  { key: "sort", header: "sort", width: 7, hint: "меньше — выше в списке" },
  { key: "type_ru", header: "type_ru", width: 20 },
  { key: "type_uz", header: "type_uz", width: 20 },
  { key: "desc_ru", header: "desc_ru", width: 40 },
  { key: "desc_uz", header: "desc_uz", width: 40 },
  { key: "why_ru", header: "why_ru", width: 30 },
  { key: "why_uz", header: "why_uz", width: 30 },
  { key: "howto_ru", header: "howto_ru", width: 30 },
  { key: "howto_uz", header: "howto_uz", width: 30 },
  { key: "ingredients_ru", header: "ingredients_ru", width: 30, hint: "через точку с запятой" },
  { key: "ingredients_uz", header: "ingredients_uz", width: 30, hint: "через точку с запятой" },
  { key: "rank_ru", header: "rank_ru", width: 20 },
  { key: "rank_uz", header: "rank_uz", width: 20 },
  { key: "review_ru", header: "review_ru", width: 30 },
  { key: "review_uz", header: "review_uz", width: 30 },
  { key: "images", header: "images", width: 30, hint: "пути к фото через запятую; пусто — оставить как есть" },
  { key: "fbt", header: "fbt", width: 30, hint: "slug до 3 товаров «берут вместе» через запятую" },
];

const list = (a?: string[] | null) => (a ?? []).join(", ");

export function productToCells(r: ProductRow, slugById: Map<string, string>): Record<string, string | number | null> {
  const c = r.content ?? {};
  return {
    slug: r.slug, brand: r.brand, name: r.name, category: r.category, skin: list(r.skin), concerns: list(r.concerns),
    volume: Number(r.volume), unit: r.unit, price: Number(r.price), old_price: r.old_price ? Number(r.old_price) : null,
    cost_price: r.cost_price != null ? Number(r.cost_price) : null, stock: r.stock, active: r.active ? 1 : 0, badge: r.badge ?? "",
    rating: Number(r.rating), reviews: r.reviews, days_supply: r.days_supply, color: r.color, pack: r.pack, sort: r.sort,
    type_ru: c.type?.ru ?? "", type_uz: c.type?.uz ?? "", desc_ru: c.desc?.ru ?? "", desc_uz: c.desc?.uz ?? "",
    why_ru: c.why?.ru ?? "", why_uz: c.why?.uz ?? "", howto_ru: c.howTo?.ru ?? "", howto_uz: c.howTo?.uz ?? "",
    ingredients_ru: (c.ingredients ?? []).map((i) => i.ru).join("; "), ingredients_uz: (c.ingredients ?? []).map((i) => i.uz).join("; "),
    rank_ru: c.rank?.ru ?? "", rank_uz: c.rank?.uz ?? "", review_ru: c.reviewSummary?.ru ?? "", review_uz: c.reviewSummary?.uz ?? "",
    images: list(r.images), fbt: (r.fbt ?? []).map((id) => slugById.get(id) ?? "").filter(Boolean).join(", "),
  };
}

export async function productsWorkbook(rows: ProductRow[]) {
  const slugById = new Map(rows.map((r) => [r.id, r.slug]));
  const wb = new ExcelJS.Workbook();
  wb.creator = "NABI";
  const ws = wb.addWorksheet("Товары", { views: [{ state: "frozen", ySplit: 1, xSplit: 1 }] });
  ws.columns = PRODUCT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 14 }));
  for (const r of rows) ws.addRow(productToCells(r, slugById));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EFEA" } };
  // Подсказки — на втором листе, не в примечаниях: примечания ломают чтение файлов, пересохранённых в других программах.
  const help = wb.addWorksheet("Как заполнять");
  help.columns = [{ header: "Колонка", key: "k", width: 16 }, { header: "Что писать", key: "h", width: 80 }];
  help.getRow(1).font = { bold: true };
  help.addRow({ k: "Общее", h: "Первая строка — названия колонок, не меняйте их. Товар ищется по slug: найден — обновится, нет — создастся. Удалить товар через файл нельзя: поставьте active = 0." });
  help.addRow({ k: "Цены", h: "В сумах целым числом, без пробелов и «сум». old_price — зачёркнутая цена, должна быть больше price." });
  for (const c of PRODUCT_COLUMNS) if (c.hint) help.addRow({ k: c.header, h: c.hint });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- Разбор файла ----------

export type ImportRow = { row: number; slug: string; action: "create" | "update"; data: ProductInputT };
export type ImportResult = { rows: ImportRow[]; errors: { row: number; message: string }[]; total: number };

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v instanceof Date) return v.toISOString();
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("result" in v) return v.result == null ? "" : String(v.result);
    return "";
  }
  return String(v).trim();
}
const split = (s: string, sep = ",") => s.split(sep).map((x) => x.trim()).filter(Boolean);
const num = (s: string) => (s === "" ? null : Number(s.replace(/[\s ]/g, "").replace(",", ".")));
const pair = (ru: string, uz: string) => ({ ru, uz: uz || ru });

export async function parseProductsFile(buf: ArrayBuffer): Promise<ImportResult> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buf);
  } catch {
    return { rows: [], errors: [{ row: 0, message: "Не удалось открыть файл. Нужен .xlsx (Excel или Google Таблицы → Скачать → .xlsx)" }], total: 0 };
  }
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], errors: [{ row: 0, message: "В файле нет листов" }], total: 0 };

  const idx = new Map<string, number>();
  ws.getRow(1).eachCell((cell, col) => idx.set(cellText(cell.value).toLowerCase(), col));
  const missing = ["slug", "brand", "name", "category", "price"].filter((k) => !idx.has(k));
  if (missing.length) return { rows: [], errors: [{ row: 1, message: `Нет обязательных колонок: ${missing.join(", ")}` }], total: 0 };

  const existing = await many<ProductRow>(`SELECT * FROM products`);
  const bySlug = new Map(existing.map((p) => [p.slug, p]));
  const idBySlug = new Map(existing.map((p) => [p.slug, p.id]));

  const raw: { row: number; get: (k: string) => string; has: (k: string) => boolean }[] = [];
  ws.eachRow((r, n) => {
    if (n === 1) return;
    const get = (k: string) => (idx.has(k) ? cellText(r.getCell(idx.get(k)!).value) : "");
    if (PRODUCT_COLUMNS.every((c) => get(c.key) === "")) return;
    raw.push({ row: n, get, has: (k) => idx.has(k) });
  });

  // Новые товары из этого же файла тоже можно указать в fbt.
  for (const r of raw) {
    const s = r.get("slug").toLowerCase();
    if (s && !idBySlug.has(s)) idBySlug.set(s, `new:${s}`);
  }

  const rows: ImportRow[] = [];
  const errors: ImportResult["errors"] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const slug = r.get("slug").toLowerCase();
    const prev = bySlug.get(slug);
    const pc = prev?.content ?? {};
    // Пустая ячейка у существующего товара = не менять; отсутствующая колонка — тоже.
    const g = (k: string, fallback: string) => (r.has(k) && r.get(k) !== "" ? r.get(k) : fallback);
    const L = (k: string, cur?: { ru: string; uz: string } | null) => pair(g(`${k}_ru`, cur?.ru ?? ""), g(`${k}_uz`, cur?.uz ?? ""));
    const ingRu = r.get("ingredients_ru") ? split(r.get("ingredients_ru"), ";") : (pc.ingredients ?? []).map((i) => i.ru);
    const ingUz = r.get("ingredients_uz") ? split(r.get("ingredients_uz"), ";") : (pc.ingredients ?? []).map((i) => i.uz);
    const fbtSlugs = r.has("fbt") && r.get("fbt") !== "" ? split(r.get("fbt").toLowerCase()) : null;
    const badFbt = fbtSlugs?.filter((s) => !idBySlug.has(s)) ?? [];
    const rank = L("rank", pc.rank);
    const review = L("review", pc.reviewSummary);
    const activeRaw = g("active", prev ? (prev.active ? "1" : "0") : "1").toLowerCase();

    const input = {
      id: prev?.id,
      slug,
      brand: g("brand", prev?.brand ?? ""),
      name: g("name", prev?.name ?? ""),
      category: g("category", prev?.category ?? "").toLowerCase(),
      skin: r.get("skin") ? split(r.get("skin").toLowerCase()) : prev?.skin ?? [],
      concerns: r.get("concerns") ? split(r.get("concerns").toLowerCase()) : prev?.concerns ?? [],
      volume: num(g("volume", String(prev?.volume ?? "0"))),
      unit: g("unit", prev?.unit ?? "ml").toLowerCase(),
      price: num(g("price", String(prev?.price ?? ""))),
      oldPrice: num(g("old_price", prev?.old_price != null ? String(prev.old_price) : "")),
      costPrice: num(g("cost_price", prev?.cost_price != null ? String(prev.cost_price) : "")),
      stock: g("stock", prev?.stock ?? "in_stock").toLowerCase(),
      active: ["1", "да", "yes", "true", "ha"].includes(activeRaw),
      badge: g("badge", prev?.badge ?? "").toLowerCase(),
      rating: num(g("rating", String(prev?.rating ?? "0"))),
      reviews: num(g("reviews", String(prev?.reviews ?? "0"))),
      daysSupply: num(g("days_supply", String(prev?.days_supply ?? "60"))),
      color: g("color", prev?.color ?? "#EADFD3"),
      pack: g("pack", prev?.pack ?? "bottle").toLowerCase(),
      sort: num(g("sort", String(prev?.sort ?? 1000))),
      images: r.get("images") ? split(r.get("images")) : prev?.images ?? [],
      fbt: fbtSlugs ? fbtSlugs.map((s) => idBySlug.get(s) ?? "") : prev?.fbt ?? [],
      content: {
        type: L("type", pc.type), desc: L("desc", pc.desc), why: L("why", pc.why), howTo: L("howto", pc.howTo),
        ingredients: ingRu.map((ru, i) => pair(ru, ingUz[i] ?? "")),
        rank: rank.ru ? rank : null,
        reviewSummary: review.ru ? review : null,
      },
    };

    const problems: string[] = [];
    if (!slug) problems.push("пустой slug");
    else if (seen.has(slug)) problems.push(`slug «${slug}» повторяется в файле`);
    seen.add(slug);
    if (badFbt.length) problems.push(`fbt: нет товаров ${badFbt.join(", ")}`);
    const numCols = { volume: "volume", price: "price", oldPrice: "old_price", costPrice: "cost_price", rating: "rating", reviews: "reviews", daysSupply: "days_supply", sort: "sort" } as const;
    for (const [k, col] of Object.entries(numCols)) if (Number.isNaN(input[k as keyof typeof numCols])) problems.push(`${col}: нужно число без букв и пробелов`);
    const parsed = ProductInput.safeParse(input);
    if (!parsed.success) {
      for (const i of parsed.error.issues) if (!/NaN/.test(i.message)) problems.push(`${i.path.join(".") || "строка"}: ${i.message}`);
    } else if (parsed.data.oldPrice && parsed.data.oldPrice <= parsed.data.price) problems.push("old_price должна быть больше price");
    if (problems.length) errors.push({ row: r.row, message: problems.slice(0, 4).join("; ") });
    else if (parsed.success) rows.push({ row: r.row, slug, action: prev ? "update" : "create", data: parsed.data });
  }
  return { rows, errors, total: raw.length };
}
