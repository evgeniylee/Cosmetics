import { many } from "@/server/db";
import { CITIES } from "@/lib/shop";
import { adminOnly, buildSheet, tz, xlsxResponse, type Col } from "@/server/xlsx";
import { SEGMENTS, customerWhere } from "@/server/crm";

export const dynamic = "force-dynamic";

type R = {
  phone: string; first_name: string | null; last_name: string | null; birth_date: string | null; lang: string; city: string | null;
  marketing_opt_in: boolean; orders_count: number; total_spent: string; last_order_at: string | null; created_at: string;
  first_creator_code: string | null; first_utm: Record<string, string> | null; manager_note: string | null;
  last_seen_at: string | null; visits_count: number; tags: string[];
};

// Выгрузка учитывает текущий фильтр списка: ?seg=abandoned&tag=оптовик&q=…
export async function GET(req: Request) {
  return adminOnly(async () => {
    const sp = Object.fromEntries(new URL(req.url).searchParams);
    const { seg, sql, params } = customerWhere(sp);
    const rows = await many<R>(
      `SELECT c.phone, c.first_name, c.last_name, to_char(c.birth_date, 'DD.MM.YYYY') AS birth_date, c.lang, c.city, c.marketing_opt_in, c.orders_count, c.total_spent,
         c.last_order_at, c.created_at, c.first_creator_code, c.first_utm, c.manager_note, c.last_seen_at, c.visits_count, c.tags
       FROM customers c ${sql} ORDER BY c.created_at DESC`, params
    );
    const cols: Col<R>[] = [
      { header: "Имя", key: "fn", width: 16, value: (r) => r.first_name },
      { header: "Фамилия", key: "ln", width: 18, value: (r) => r.last_name },
      { header: "Телефон", key: "phone", width: 15, value: (r) => r.phone },
      { header: "Дата рождения", key: "bd", width: 13, value: (r) => r.birth_date },
      { header: "Язык", key: "lang", width: 6, value: (r) => r.lang },
      { header: "Город", key: "city", width: 14, value: (r) => (r.city ? CITIES.find((c) => c.id === r.city)?.ru ?? r.city : null) },
      { header: "Заказов", key: "oc", width: 9, value: (r) => r.orders_count },
      { header: "Сумма покупок", key: "ts", money: true, value: (r) => Number(r.total_spent) },
      { header: "Последний заказ", key: "lo", width: 17, date: true, value: (r) => tz(r.last_order_at) },
      { header: "Регистрация", key: "ca", width: 17, date: true, value: (r) => tz(r.created_at) },
      { header: "Согласие на рассылку", key: "mk", width: 12, value: (r) => (r.marketing_opt_in ? "да" : "нет") },
      { header: "Первый промокод", key: "cc", width: 14, value: (r) => r.first_creator_code },
      { header: "utm_source", key: "src", value: (r) => r.first_utm?.utm_source },
      { header: "Последний визит", key: "ls", width: 17, date: true, value: (r) => tz(r.last_seen_at) },
      { header: "Визитов", key: "vc", width: 9, value: (r) => r.visits_count },
      { header: "Метки", key: "tags", width: 20, value: (r) => (r.tags ?? []).join(", ") },
      { header: "Заметка", key: "note", width: 30, value: (r) => r.manager_note },
    ];
    return xlsxResponse(await buildSheet(seg === "all" ? "Клиенты" : SEGMENTS[seg].l.slice(0, 30), cols, rows), `nabi-customers${seg === "all" ? "" : `-${seg}`}`);
  });
}
