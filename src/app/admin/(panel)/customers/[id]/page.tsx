import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import { STATUS_META, fmtDate, fmtPhone, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { CITIES } from "@/lib/shop";
import { Card, PageHead } from "../../ui";
import { CustomerNote } from "./note";

export const metadata = { title: "Клиент" };

type C = {
  id: string; phone: string; first_name: string | null; last_name: string | null; birth_date: string | null; age: number | null; lang: string; city: string | null;
  marketing_opt_in: boolean; consent_at: string | null; first_utm: Record<string, string> | null; first_creator_code: string | null; orders_count: number;
  total_spent: string; last_order_at: string | null; manager_note: string | null; created_at: string; phone_verified_at: string | null;
};

const EVENT_LABEL: Record<string, string> = { login: "Вход по коду", signup_completed: "Заполнил анкету", order_placed: "Оформил заказ", order_status: "Статус заказа" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await one<C>(
    `SELECT *, to_char(birth_date, 'DD.MM.YYYY') AS birth_date, date_part('year', age(birth_date))::int AS age FROM customers WHERE id = $1`,
    [id]
  );
  if (!c) notFound();
  const [orders, answers, events, addresses, fav] = await Promise.all([
    many<{ id: string; number: string; status: OrderStatus; total: string; created_at: string; promo_code: string | null }>(
      `SELECT id, number, status, total, created_at, promo_code FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`, [id]),
    many<{ label: string; type: string; options: { value: string; ru: string }[] | null; value: unknown; answered_at: string }>(
      `SELECT q.label_ru AS label, q.type, q.options, a.value, a.answered_at FROM customer_answers a JOIN profile_questions q ON q.key = a.question_key
       WHERE a.customer_id = $1 ORDER BY q.sort`, [id]),
    many<{ type: string; data: Record<string, unknown> | null; created_at: string }>(
      `SELECT type, data, created_at FROM customer_events WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 30`, [id]),
    many<{ city: string; address: string }>(`SELECT city, address FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`, [id]),
    many<{ name: string; qty: number }>(
      `SELECT oi.name, sum(oi.qty)::int AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = $1 AND o.status <> 'cancelled' GROUP BY oi.name ORDER BY qty DESC LIMIT 5`, [id]),
  ]);

  const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "Без имени";
  const tel = c.phone.replace(/[^\d+]/g, "");
  const avg = c.orders_count ? Number(c.total_spent) / c.orders_count : 0;
  const answerText = (a: (typeof answers)[number]) => {
    const vals = Array.isArray(a.value) ? a.value : [a.value];
    return vals.map((v) => a.options?.find((o) => o.value === v)?.ru ?? String(v)).join(", ");
  };

  return (
    <>
      <PageHead title={name} sub={`Клиент с ${fmtDate(c.created_at, false)} · ${c.lang === "uz" ? "узбекский" : "русский"}`}>
        <Link href="/admin/customers" className="text-[14px] text-muted">← Все клиенты</Link>
      </PageHead>
      <div className="grid gap-4 px-4 md:px-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-3">
              <p className="min-w-0 flex-1 text-[17px] tabular"><span className="select-all">{fmtPhone(c.phone)}</span></p>
              <a href={`tel:${tel}`} className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold leading-10 text-white">Позвонить</a>
              <a href={`https://t.me/${tel}`} target="_blank" rel="noreferrer" className="h-10 rounded-full bg-surface px-4 text-[14px] leading-10">Telegram</a>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
              {[
                ["Заказов", String(c.orders_count)],
                ["Сумма", fmtSum(c.total_spent)],
                ["Средний чек", c.orders_count ? fmtSum(avg) : "—"],
                ["Последний", c.last_order_at ? fmtDate(c.last_order_at, false) : "—"],
              ].map(([l, v]) => (
                <div key={l}><p className="text-[12px] text-muted">{l}</p><p className="font-semibold tabular">{v}</p></div>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Заказы</h2>
            <ul className="mt-2 divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-[14px] hover:text-accent">
                    <span className="w-14 font-semibold tabular">{o.number}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[12px] ${STATUS_META[o.status].cls}`}>{STATUS_META[o.status].label}</span>
                    <span className="min-w-0 flex-1 truncate text-muted tabular">{fmtDate(o.created_at)}{o.promo_code ? ` · ${o.promo_code}` : ""}</span>
                    <span className="font-semibold tabular">{fmtSum(o.total)}</span>
                  </Link>
                </li>
              ))}
              {!orders.length && <li className="py-4 text-[14px] text-muted">Заказов пока нет</li>}
            </ul>
            {fav.length > 0 && <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">Чаще всего берёт: {fav.map((f) => `${f.name} (${f.qty})`).join(", ")}</p>}
          </Card>

          <Card>
            <h2 className="font-bold">Анкета</h2>
            {answers.length ? (
              <dl className="mt-2 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-[200px_1fr]">
                {answers.map((a) => (<Fragment key={a.label}><dt className="text-muted">{a.label}</dt><dd>{answerText(a)}</dd></Fragment>))}
              </dl>
            ) : <p className="mt-2 text-[14px] text-muted">Клиент ещё не отвечал на вопросы о коже. Спросите при звонке — ответы помогут с подборками.</p>}
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <h2 className="font-bold">Данные</h2>
            <dl className="mt-2 space-y-1.5 text-[14px]">
              <div className="flex justify-between gap-3"><dt className="text-muted">Дата рождения</dt><dd className="tabular">{c.birth_date ? `${c.birth_date}${c.age != null ? ` · ${c.age}` : ""}` : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Город</dt><dd>{c.city ? CITIES.find((x) => x.id === c.city)?.ru ?? c.city : "—"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Рассылка</dt><dd>{c.marketing_opt_in ? "согласен" : "нет согласия"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Пришёл</dt><dd className="text-right">{c.first_creator_code ?? c.first_utm?.utm_source ?? "напрямую"}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted">Номер</dt><dd>{c.phone_verified_at ? "подтверждён" : "не подтверждён"}</dd></div>
            </dl>
            {addresses.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
                {addresses.map((a, i) => <li key={i}>{CITIES.find((x) => x.id === a.city)?.ru ?? a.city}, {a.address}</li>)}
              </ul>
            )}
          </Card>
          <CustomerNote id={c.id} note={c.manager_note ?? ""} />
          <Card>
            <h2 className="font-bold">События</h2>
            <ol className="mt-2 space-y-1.5 text-[13px]">
              {events.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-24 shrink-0 text-muted tabular">{fmtDate(e.created_at)}</span>
                  <span>{EVENT_LABEL[e.type] ?? e.type}{e.type === "order_placed" && e.data?.number ? ` ${e.data.number}` : ""}{e.type === "order_status" && e.data?.status ? `: ${STATUS_META[e.data.status as OrderStatus]?.label.toLowerCase() ?? e.data.status}` : ""}</span>
                </li>
              ))}
              {!events.length && <li className="text-muted">Пусто</li>}
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
