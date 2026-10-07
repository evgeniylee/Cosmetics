import { many } from "@/server/db";
import { COMMISSION_STATE } from "@/server/creators";
import { adminOnly, buildSheet, tz, xlsxResponse, type Col } from "@/server/xlsx";

export const dynamic = "force-dynamic";

// Ведомость: каждый заказ, который войдёт в ближайшую выплату (и вычеты), с итогом по креатору в фильтре Excel.
type R = { code: string; name: string; phone: string | null; number: string; created_at: string; delivered_at: string | null; base: string; rate: number; commission: string; kind: string };

export async function GET() {
  return adminOnly(async () => {
    const rows = await many<R>(
      `SELECT o.creator_code AS code, p.creator_name AS name, p.creator_phone AS phone, o.number, o.created_at, o.delivered_at,
         (o.subtotal - o.discount) AS base, o.commission_rate AS rate,
         CASE WHEN o.commission_status = 'clawback' THEN -o.commission ELSE o.commission END AS commission,
         CASE WHEN o.commission_status = 'clawback' THEN 'вычет (отмена после выплаты)' ELSE 'к выплате' END AS kind
       FROM orders o JOIN promo_codes p ON p.code = o.creator_code
       WHERE ${COMMISSION_STATE} = 'ready' OR o.commission_status = 'clawback' ORDER BY p.creator_name, o.created_at`
    );
    const cols: Col<R>[] = [
      { header: "Креатор", key: "name", width: 18, value: (r) => r.name },
      { header: "Код", key: "code", width: 12, value: (r) => r.code },
      { header: "Телефон", key: "phone", width: 15, value: (r) => r.phone },
      { header: "Заказ", key: "number", width: 10, value: (r) => r.number },
      { header: "Создан", key: "created", width: 17, date: true, value: (r) => tz(r.created_at) },
      { header: "Доставлен", key: "delivered", width: 17, date: true, value: (r) => tz(r.delivered_at) },
      { header: "Сумма заказа", key: "base", money: true, value: (r) => Number(r.base) },
      { header: "Ставка, %", key: "rate", width: 9, value: (r) => r.rate },
      { header: "Комиссия", key: "commission", money: true, value: (r) => Number(r.commission) },
      { header: "Тип", key: "kind", width: 26, value: (r) => r.kind },
    ];
    return xlsxResponse(await buildSheet("К выплате", cols, rows), "nabi-payouts");
  });
}
