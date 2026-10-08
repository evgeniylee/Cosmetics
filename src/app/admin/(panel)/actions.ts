"use server";
// Действия админки. Каждое проверяет доступ и после изменения сбрасывает кэш нужных страниц.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/admin-format";
import { assertAdmin } from "@/server/admin";
import { invalidateCatalog } from "@/server/catalog";
import { many, one } from "@/server/db";
import { saveUpload } from "@/server/uploads";
import { createPayout, onOrderStatus } from "@/server/creators";
import { normalizePhone } from "@/server/auth";
import { ProductInput, variantProblems } from "@/server/product-schema";
import { newProductId, upsertProduct } from "@/server/products";
import { RAIL_KEYS } from "@/lib/storefront";

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string; fields?: Record<string, string> };

// ---------- Заказы ----------

export async function setOrderStatus(orderId: string, status: string): Promise<ActionResult> {
  const me = await assertAdmin();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { ok: false, error: "Неизвестный статус" };
  const o = await one<{ status: string; customer_id: string | null; total: string }>(`SELECT status, customer_id, total FROM orders WHERE id = $1`, [orderId]);
  if (!o) return { ok: false, error: "Заказ не найден" };
  if (o.status === status) return { ok: true };
  await one(`UPDATE orders SET status = $2, updated_at = now() WHERE id = $1`, [orderId, status]);
  await one(`INSERT INTO order_status_log (order_id, from_status, to_status, by_phone) VALUES ($1, $2, $3, $4)`, [orderId, o.status, status, me.phone]);
  await onOrderStatus(orderId, o.status, status);
  // Статистика клиента не учитывает отменённые заказы.
  if (o.customer_id && (o.status === "cancelled") !== (status === "cancelled")) {
    const sign = status === "cancelled" ? -1 : 1;
    await one(`UPDATE customers SET orders_count = GREATEST(0, orders_count + $2), total_spent = GREATEST(0, total_spent + $3), updated_at = now() WHERE id = $1`, [o.customer_id, sign, sign * Number(o.total)]);
  }
  if (o.customer_id) await one(`INSERT INTO customer_events (customer_id, type, data) VALUES ($1, 'order_status', $2)`, [o.customer_id, JSON.stringify({ order_id: orderId, status })]);
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Статус обновлён" };
}

export async function setOrderPaid(orderId: string, paid: boolean): Promise<ActionResult> {
  await assertAdmin();
  await one(`UPDATE orders SET paid_at = ${paid ? "now()" : "NULL"}, updated_at = now() WHERE id = $1`, [orderId]);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: paid ? "Отмечено как оплачено" : "Отметка об оплате снята" };
}

export async function saveOrderNote(orderId: string, note: string): Promise<ActionResult> {
  await assertAdmin();
  await one(`UPDATE orders SET manager_note = $2, updated_at = now() WHERE id = $1`, [orderId, note.trim().slice(0, 2000) || null]);
  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: "Заметка сохранена" };
}

// ---------- Товары ----------

function fieldErrors(e: z.ZodError) {
  const f: Record<string, string> = {};
  for (const i of e.issues) f[i.path.join(".")] ??= i.message;
  return f;
}

export async function saveProduct(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = ProductInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте поля формы", fields: fieldErrors(parsed.error) };
  const p = parsed.data;
  if (p.oldPrice && p.oldPrice <= p.price && p.variantKind !== "volume") return { ok: false, error: "Старая цена должна быть больше текущей", fields: { oldPrice: "Больше текущей цены" } };
  const vp = variantProblems(p);
  if (Object.keys(vp).length) return { ok: false, error: "Проверьте варианты", fields: vp };
  const clash = await one<{ id: string }>(`SELECT id FROM products WHERE slug = $1 AND id <> $2`, [p.slug, p.id ?? ""]);
  if (clash) return { ok: false, error: "Такой адрес страницы уже занят", fields: { slug: "Уже используется" } };
  const id = p.id || newProductId();
  await upsertProduct(p, id);
  invalidateCatalog();
  revalidatePath("/admin/products");
  revalidatePath("/", "layout");
  return { ok: true, id, message: p.id ? "Товар сохранён" : "Товар создан" };
}

export async function toggleProduct(id: string, active: boolean): Promise<ActionResult> {
  await assertAdmin();
  await one(`UPDATE products SET active = $2, updated_at = now() WHERE id = $1`, [id, active]);
  invalidateCatalog();
  revalidatePath("/admin/products");
  return { ok: true, message: active ? "Товар показан на сайте" : "Товар скрыт с сайта" };
}

export async function setProductStock(id: string, stock: string): Promise<ActionResult> {
  await assertAdmin();
  if (!["in_stock", "on_order", "out"].includes(stock)) return { ok: false, error: "Неизвестный статус" };
  await one(`UPDATE products SET stock = $2, updated_at = now() WHERE id = $1`, [id, stock]);
  invalidateCatalog();
  revalidatePath("/admin/products");
  return { ok: true, message: "Наличие обновлено" };
}

export async function uploadProductImage(form: FormData): Promise<ActionResult & { url?: string }> {
  await assertAdmin();
  const file = form.get("file");
  if (!(file instanceof File)) return { ok: false, error: "Файл не получен" };
  const folder = form.get("folder");
  try {
    const url = await saveUpload(file, folder === "videos" || folder === "creators" ? folder : "products");
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Не удалось сохранить файл" };
  }
}

// ---------- Клиенты ----------

export async function saveCustomerNote(customerId: string, note: string): Promise<ActionResult> {
  await assertAdmin();
  await one(`UPDATE customers SET manager_note = $2, updated_at = now() WHERE id = $1`, [customerId, note.trim().slice(0, 2000) || null]);
  revalidatePath(`/admin/customers/${customerId}`);
  return { ok: true, message: "Заметка сохранена" };
}

// ---------- Промокоды ----------

const PromoInput = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{3,20}$/, "3–20 символов: латиница, цифры, _"),
  creatorName: z.string().trim().min(1, "Укажите имя").max(80),
  creatorHandle: z.string().trim().max(80).optional(),
  percent: z.coerce.number().int().min(1, "От 1%").max(50, "До 50%"),
  commission: z.coerce.number().int().min(0).max(50),
  active: z.boolean(),
  featured: z.boolean(),
  picks: z.array(z.string()).max(8),
  creatorPhone: z.string().trim().max(30).optional(),
  photo: z.string().regex(/^\/api\/files\/[\w./-]+$/).nullable().optional(),
  isNew: z.boolean(),
});

export async function savePromo(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = PromoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте поля", fields: fieldErrors(parsed.error) };
  const p = parsed.data;
  if (p.isNew && (await one(`SELECT code FROM promo_codes WHERE code = $1`, [p.code]))) return { ok: false, error: "Такой код уже есть", fields: { code: "Уже существует" } };
  const phone = p.creatorPhone ? normalizePhone(p.creatorPhone) : null;
  if (p.creatorPhone && !phone) return { ok: false, error: "Проверьте телефон", fields: { creatorPhone: "Формат +998 XX XXX XX XX" } };
  if (phone && (await one(`SELECT code FROM promo_codes WHERE creator_phone = $1 AND code <> $2`, [phone, p.code])))
    return { ok: false, error: "Этот номер уже привязан к другому креатору", fields: { creatorPhone: "Уже используется" } };
  // В блоке «Выбор креаторов» на главной — до 8 креаторов, листаются стрелками.
  if (p.featured && !(await one(`SELECT 1 FROM promo_codes WHERE code = $1 AND featured`, [p.code]))) {
    const n = await one<{ n: number }>(`SELECT count(*)::int AS n FROM promo_codes WHERE featured AND active`);
    if ((n?.n ?? 0) >= 8) return { ok: false, error: "На главной уже 8 креаторов — снимите кого-то", fields: { featured: "Не больше 8" } };
  }
  await one(
    `INSERT INTO promo_codes (code, creator_name, creator_handle, percent, commission, active, featured, picks, creator_phone, photo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (code) DO UPDATE SET creator_name=$2, creator_handle=$3, percent=$4, commission=$5, active=$6, featured=$7, picks=$8, creator_phone=$9, photo=$10`,
    [p.code, p.creatorName, p.creatorHandle || null, p.percent, p.commission, p.active, p.featured, p.picks, phone, p.photo ?? null]
  );
  invalidateCatalog();
  revalidatePath("/admin/promo", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: p.isNew ? "Промокод создан" : "Промокод сохранён" };
}

// ---------- Креаторы: выплаты и ручная привязка ----------

export async function payCreator(code: string, note: string): Promise<ActionResult> {
  const me = await assertAdmin();
  const r = await createPayout(code, me.phone, note.trim().slice(0, 200) || null);
  if (!r) return { ok: false, error: "Нечего выплачивать" };
  revalidatePath("/admin/promo", "layout");
  return { ok: true, message: `Выплата ${r.amount.toLocaleString("ru-RU")} сум записана` };
}

export async function reassignOrder(orderId: string, code: string | null, reason: string): Promise<ActionResult> {
  const me = await assertAdmin();
  if (reason.trim().length < 3) return { ok: false, error: "Укажите причину" };
  const o = await one<{ creator_code: string | null; commission_status: string | null; status: string; subtotal: string; discount: string }>(
    `SELECT creator_code, commission_status, status, subtotal, discount FROM orders WHERE id = $1`, [orderId]);
  if (!o) return { ok: false, error: "Заказ не найден" };
  if (o.commission_status === "paid" || o.commission_status === "clawed") return { ok: false, error: "Комиссия по заказу уже выплачена — привязку не меняем" };
  if ((o.creator_code ?? null) === code) return { ok: true };
  if (code) {
    const p = await one<{ commission: number }>(`SELECT commission FROM promo_codes WHERE code = $1`, [code]);
    if (!p) return { ok: false, error: "Креатор не найден" };
    await one(
      `UPDATE orders SET creator_code = $2, attribution = 'manual', link_id = NULL, new_customer = false, commission_rate = $3, commission = $4,
         commission_status = $5, commission_note = $6 WHERE id = $1`,
      [orderId, code, p.commission, Math.round(((Number(o.subtotal) - Number(o.discount)) * p.commission) / 100), o.status === "cancelled" ? "void" : "pending", o.status === "cancelled" ? "Заказ отменён" : null]
    );
  } else {
    await one(`UPDATE orders SET creator_code = NULL, attribution = NULL, link_id = NULL, new_customer = false, commission_rate = NULL, commission = 0, commission_status = NULL, commission_note = NULL WHERE id = $1`, [orderId]);
  }
  await one(`INSERT INTO attribution_log (order_id, from_code, to_code, reason, by_phone) VALUES ($1, $2, $3, $4, $5)`, [orderId, o.creator_code, code, reason.trim().slice(0, 300), me.phone]);
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/promo", "layout");
  return { ok: true, message: code ? `Заказ засчитан ${code}` : "Заказ отвязан от креатора" };
}

export async function productOptions() {
  await assertAdmin();
  return many<{ id: string; label: string }>(`SELECT id, brand || ' ' || name AS label FROM products ORDER BY brand, name`);
}

// ---------- Бренды ----------

const L10nIn = z.object({ ru: z.string().trim().max(6000), uz: z.string().trim().max(6000) });
const BrandInput = z.object({
  slug: z.string(),
  country: L10nIn,
  tagline: L10nIn,
  story: L10nIn,
  faq: z.array(z.object({ q: L10nIn, a: L10nIn })).max(20),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  heroImage: z.string().startsWith("/").nullable(),
  heroImageMobile: z.string().startsWith("/").nullable(),
  logo: z.string().startsWith("/").nullable(),
  active: z.boolean(),
  sort: z.coerce.number().int().min(0).max(100000),
});

export async function saveBrand(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const p = BrandInput.safeParse(input);
  if (!p.success) return { ok: false, error: "Проверьте поля", fields: fieldErrors(p.error) };
  const b = p.data;
  const l = (x: { ru: string; uz: string }) => (x.ru || x.uz ? JSON.stringify(x) : null);
  const r = await one<{ name: string }>(
    `UPDATE brands SET country = $2, tagline = $3, story = $4, faq = $5, color = $6, hero_image = $7, hero_image_mobile = $8, logo = $9, active = $10, sort = $11, updated_at = now()
     WHERE slug = $1 RETURNING name`,
    [b.slug, l(b.country), l(b.tagline), l(b.story), JSON.stringify(b.faq.filter((f) => f.q.ru || f.q.uz)), b.color, b.heroImage, b.heroImageMobile, b.logo, b.active, b.sort]
  );
  if (!r) return { ok: false, error: "Бренд не найден" };
  revalidatePath("/admin/brands", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: "Бренд сохранён" };
}

// ---------- Витрина: ленты главной и видео креаторов ----------

const RailInput = z.object({
  key: z.enum(RAIL_KEYS),
  title: z.object({ ru: z.string().trim().min(1, "Нужно название").max(40), uz: z.string().trim().max(40) }),
  active: z.boolean(),
  mode: z.enum(["auto", "manual"]),
  products: z.array(z.string()).max(24),
});

export async function saveRail(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = RailInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте поля", fields: fieldErrors(parsed.error) };
  const r = parsed.data;
  if (r.mode === "manual" && r.active && r.products.length < 2) return { ok: false, error: "Выберите хотя бы 2 товара или включите «авто»", fields: { products: "Минимум 2 товара" } };
  await one(`UPDATE home_rails SET title = $2, active = $3, mode = $4, products = $5 WHERE key = $1`, [r.key, JSON.stringify({ ru: r.title.ru, uz: r.title.uz || r.title.ru }), r.active, r.mode, r.products]);
  invalidateCatalog();
  revalidatePath("/admin/storefront");
  revalidatePath("/", "layout");
  return { ok: true, message: "Лента сохранена" };
}

const FileUrl = z.string().regex(/^\/api\/files\/[\w./-]+$/, "Файл не загружен");
const VideoInput = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/).nullable(),
  title: z.object({ ru: z.string().trim().min(1, "Нужен заголовок").max(90), uz: z.string().trim().max(90) }),
  description: z.object({ ru: z.string().trim().max(600), uz: z.string().trim().max(600) }),
  creatorCode: z.string().nullable(),
  src: FileUrl,
  poster: FileUrl.nullable(),
  products: z.array(z.string()).max(12, "Не больше 12 товаров"),
  active: z.boolean(),
});

export async function saveVideo(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = VideoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте поля", fields: fieldErrors(parsed.error) };
  const v = parsed.data;
  if (v.active && !v.products.length) return { ok: false, error: "Добавьте товары из видео", fields: { products: "Минимум 1 товар" } };
  if (v.creatorCode && !(await one(`SELECT 1 FROM promo_codes WHERE code = $1`, [v.creatorCode]))) return { ok: false, error: "Креатор не найден", fields: { creatorCode: "Нет такого" } };
  const title = JSON.stringify({ ru: v.title.ru, uz: v.title.uz || v.title.ru });
  const desc = JSON.stringify({ ru: v.description.ru, uz: v.description.uz || v.description.ru });
  let id = v.id;
  if (id) {
    const r = await one(`UPDATE videos SET title=$2, description=$3, creator_code=$4, src=$5, poster=$6, products=$7, active=$8, updated_at=now() WHERE id=$1 RETURNING id`, [id, title, desc, v.creatorCode, v.src, v.poster, v.products, v.active]);
    if (!r) return { ok: false, error: "Видео не найдено" };
  } else {
    id = `v${Date.now().toString(36)}`;
    await one(
      `INSERT INTO videos (id, title, description, creator_code, src, poster, products, active, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, (SELECT COALESCE(MIN(sort), 1) - 1 FROM videos))`,
      [id, title, desc, v.creatorCode, v.src, v.poster, v.products, v.active]
    );
  }
  invalidateCatalog();
  revalidatePath("/admin/storefront", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: v.id ? "Видео сохранено" : "Видео добавлено", id };
}

export async function moveVideo(id: string, dir: -1 | 1): Promise<ActionResult> {
  await assertAdmin();
  const list = await many<{ id: string }>(`SELECT id FROM videos ORDER BY sort, created_at DESC`);
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  [list[i], list[j]] = [list[j], list[i]];
  for (const [n, x] of list.entries()) await one(`UPDATE videos SET sort = $2 WHERE id = $1`, [x.id, n]);
  invalidateCatalog();
  revalidatePath("/admin/storefront", "layout");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deleteVideo(id: string): Promise<ActionResult> {
  await assertAdmin();
  await one(`DELETE FROM videos WHERE id = $1`, [id]);
  invalidateCatalog();
  revalidatePath("/admin/storefront", "layout");
  revalidatePath("/", "layout");
  return { ok: true, message: "Видео удалено" };
}
