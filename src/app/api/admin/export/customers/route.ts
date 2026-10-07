import { many } from "@/server/db";
import { CITIES } from "@/lib/shop";
import { adminOnly, buildSheet, tz, xlsxResponse, type Col } from "@/server/xlsx";

export const dynamic = "force-dynamic";

type R = {
  phone: string; first_name: string | null; last_name: string | null; birth_date: string | null; lang: string; city: string | null;
  marketing_opt_in: boolean; orders_count: number; total_spent: string; last_order_at: string | null; created_at: string;
  first_creator_code: string | null; first_utm: Record<string, string> | null; manager_note: string | null;
};

export async function GET() {
  return adminOnly(async () => {
    const rows = await many<R>(
      `SELECT phone, first_name, last_name, to_char(birth_date, 'DD.MM.YYYY') AS birth_date, lang, city, marketing_opt_in, orders_count, total_spent,
         last_order_at, created_at, first_creator_code, first_utm, manager_note
       FROM customers WHERE first_name IS NOT NULL OR orders_count > 0 ORDER BY created_at DESC`
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
      { header: "Заметка", key: "note", width: 30, value: (r) => r.manager_note },
    ];
    return xlsxResponse(await buildSheet("Клиенты", cols, rows), "nabi-customers");
  });
}
