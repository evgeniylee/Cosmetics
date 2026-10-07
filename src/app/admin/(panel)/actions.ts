"use server";
// Действия админки. Каждое проверяет доступ и после изменения сбрасывает кэш нужных страниц.
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ORDER_STATUSES } from "@/lib/admin-format";
import { assertAdmin } from "@/server/admin";
import { invalidateCatalog } from "@/server/catalog";
import { many, one } from "@/server/db";
import { saveUpload } from "@/server/uploads";
import { ProductInput } from "@/server/product-schema";
import { newProductId, upsertProduct } from "@/server/products";

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
  if (p.oldPrice && p.oldPrice <= p.price) return { ok: false, error: "Старая цена должна быть больше текущей", fields: { oldPrice: "Больше текущей цены" } };
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
  try {
    const url = await saveUpload(file, "products");
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
  isNew: z.boolean(),
});

export async function savePromo(input: unknown): Promise<ActionResult> {
  await assertAdmin();
  const parsed = PromoInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Проверьте поля", fields: fieldErrors(parsed.error) };
  const p = parsed.data;
  if (p.isNew && (await one(`SELECT code FROM promo_codes WHERE code = $1`, [p.code]))) return { ok: false, error: "Такой код уже есть", fields: { code: "Уже существует" } };
  // В блоке «Выбор креаторов» на главной показываем одного креатора.
  if (p.featured) await one(`UPDATE promo_codes SET featured = false WHERE code <> $1`, [p.code]);
  await one(
    `INSERT INTO promo_codes (code, creator_name, creator_handle, percent, commission, active, featured, picks)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (code) DO UPDATE SET creator_name=$2, creator_handle=$3, percent=$4, commission=$5, active=$6, featured=$7, picks=$8`,
    [p.code, p.creatorName, p.creatorHandle || null, p.percent, p.commission, p.active, p.featured, p.picks]
  );
  invalidateCatalog();
  revalidatePath("/admin/promo");
  revalidatePath("/", "layout");
  return { ok: true, message: p.isNew ? "Промокод создан" : "Промокод сохранён" };
}

export async function productOptions() {
  await assertAdmin();
  return many<{ id: string; label: string }>(`SELECT id, brand || ' ' || name AS label FROM products ORDER BY brand, name`);
}
