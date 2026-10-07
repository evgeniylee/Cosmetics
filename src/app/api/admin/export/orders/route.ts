import { many } from "@/server/db";
import { PAYMENT_LABEL, STATUS_META, type OrderStatus } from "@/lib/admin-format";
import { CITIES } from "@/lib/shop";
import { adminOnly, buildSheet, tz, xlsxResponse, type Col } from "@/server/xlsx";

export const dynamic = "force-dynamic";

type R = {
  number: string; status: OrderStatus; created_at: string; first_name: string | null; last_name: string | null; phone: string; city: string; address: string;
  comment: string | null; payment: string; paid_at: string | null; subtotal: string; discount: string; discount_source: string | null; delivery: string; total: string;
  promo_code: string | null; items: string | null; cost: string | null; uncosted: boolean; utm: Record<string, string> | null; manager_note: string | null;
};

export async function GET(req: Request) {
  return adminOnly(async () => {
    const days = Math.min(3650, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 365));
    const rows = await many<R>(
      `SELECT o.number, o.status, o.created_at, o.first_name, o.last_name, o.phone, o.city, o.address, o.comment, o.payment, o.paid_at,
         o.subtotal, o.discount, o.discount_source, o.delivery, o.total, o.promo_code, o.utm, o.manager_note,
         (SELECT string_agg(name || ' × ' || qty, '; ') FROM order_items WHERE order_id = o.id) AS items,
         (SELECT sum(cost * qty) FROM order_items WHERE order_id = o.id) AS cost,
         (SELECT bool_or(cost IS NULL) FROM order_items WHERE order_id = o.id) AS uncosted
       FROM orders o WHERE o.created_at >= now() - ($1 || ' days')::interval ORDER BY o.created_at DESC`,
      [String(days)]
    );
    const n = (v: string | null) => (v == null ? null : Number(v));
    const cols: Col<R>[] = [
      { header: "Номер", key: "number", width: 10, value: (r) => r.number },
      { header: "Дата", key: "date", width: 17, date: true, value: (r) => tz(r.created_at) },
      { header: "Статус", key: "status", width: 15, value: (r) => STATUS_META[r.status]?.label ?? r.status },
      { header: "Имя", key: "name", width: 22, value: (r) => [r.first_name, r.last_name].filter(Boolean).join(" ") },
      { header: "Телефон", key: "phone", width: 15, value: (r) => r.phone },
      { header: "Город", key: "city", width: 14, value: (r) => CITIES.find((c) => c.id === r.city)?.ru ?? r.city },
      { header: "Адрес", key: "address", width: 34, value: (r) => r.address },
      { header: "Комментарий", key: "comment", width: 24, value: (r) => r.comment },
      { header: "Состав", key: "items", width: 48, value: (r) => r.items },
      { header: "Товары", key: "subtotal", money: true, value: (r) => n(r.subtotal) },
      { header: "Скидка", key: "discount", money: true, value: (r) => n(r.discount) },
      { header: "Источник скидки", key: "dsrc", value: (r) => r.discount_source },
      { header: "Доставка", key: "delivery", money: true, value: (r) => n(r.delivery) },
      { header: "Итого", key: "total", money: true, value: (r) => n(r.total) },
      { header: "Себестоимость", key: "cost", money: true, value: (r) => (r.uncosted ? null : n(r.cost)) },
      { header: "Прибыль с товаров", key: "profit", money: true, value: (r) => (r.uncosted || r.cost == null ? null : Number(r.subtotal) - Number(r.discount) - Number(r.cost)) },
      { header: "Оплата", key: "payment", width: 12, value: (r) => PAYMENT_LABEL[r.payment] ?? r.payment },
      { header: "Оплачено", key: "paid", width: 17, date: true, value: (r) => tz(r.paid_at) },
      { header: "Промокод", key: "promo", width: 12, value: (r) => r.promo_code },
      { header: "utm_source", key: "src", value: (r) => r.utm?.utm_source },
      { header: "utm_campaign", key: "camp", value: (r) => r.utm?.utm_campaign },
      { header: "Заметка менеджера", key: "note", width: 30, value: (r) => r.manager_note },
    ];
    return xlsxResponse(await buildSheet("Заказы", cols, rows), "nabi-orders");
  });
}
