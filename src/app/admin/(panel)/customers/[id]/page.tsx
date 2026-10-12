import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import { STATUS_META, ago, fmtDate, fmtPhone, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { CITIES } from "@/lib/shop";
import { SEGMENTS, TAGS, replenishFor, segmentsOf, sourceLabel } from "@/server/crm";
import { Card, PageHead } from "../../ui";
import { CustomerTags, CustomerTasks } from "../tasks";
import { CustomerNote } from "./note";

export const metadata = { title: "Клиент" };

type C = {
  id: string; phone: string; first_name: string | null; last_name: string | null; birth_date: string | null; age: number | null; lang: string; city: string | null;
  marketing_opt_in: boolean; consent_at: string | null; first_utm: Record<string, string> | null; first_creator_code: string | null; orders_count: number;
  total_spent: string; last_order_at: string | null; manager_note: string | null; created_at: string; phone_verified_at: string | null;
  last_seen_at: string | null; visits_count: number; tags: string[];
};

const EVENT_LABEL: Record<string, string> = {
  login: "Вход по коду", signup_completed: "Заполнил анкету", order_placed: "Оформил заказ", order_status: "Статус заказа", visit: "Зашёл на сайт",
  task_added: "Задача", task_done: "Задача выполнена", marketing_changed: "Рассылка", account_deleted: "Удалил аккаунт",
};
const EVENT_FILTERS: Record<string, { l: string; types: string[] | null }> = {
  all: { l: "Все", types: null },
  orders: { l: "Заказы", types: ["order_placed", "order_status"] },
  visits: { l: "Визиты", types: ["visit", "login"] },
  work: { l: "Работа менеджера", types: ["task_added", "task_done"] },
};
const daysAgo = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ev?: string }> }) {
  const { id } = await params;
  const ev = EVENT_FILTERS[(await searchParams).ev ?? ""] ? (await searchParams).ev! : "all";
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const c = await one<C>(
    `SELECT *, to_char(birth_date, 'DD.MM.YYYY') AS birth_date, date_part('year', age(birth_date))::int AS age FROM customers WHERE id = $1`,
    [id]
  );
  if (!c) notFound();
  const evTypes = EVENT_FILTERS[ev].types;
  const [orders, answers, events, addresses, fav, cart, favorites, viewed, replenish, tasks, segs, sources] = await Promise.all([
    many<{ id: string; number: string; status: OrderStatus; total: string; created_at: string; promo_code: string | null }>(
      `SELECT id, number, status, total, created_at, promo_code FROM orders WHERE customer_id = $1 ORDER BY created_at DESC`, [id]),
    many<{ label: string; type: string; options: { value: string; ru: string }[] | null; value: unknown; answered_at: string }>(
      `SELECT q.label_ru AS label, q.type, q.options, a.value, a.answered_at FROM customer_answers a JOIN profile_questions q ON q.key = a.question_key
       WHERE a.customer_id = $1 ORDER BY q.sort`, [id]),
    many<{ type: string; data: Record<string, unknown> | null; created_at: string }>(
      `SELECT type, data, created_at FROM customer_events WHERE customer_id = $1 ${evTypes ? "AND type = ANY($2::text[])" : ""} ORDER BY created_at DESC LIMIT 40`,
      evTypes ? [id, evTypes] : [id]),
    many<{ city: string; address: string }>(`SELECT city, address FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`, [id]),
    many<{ name: string; qty: number }>(
      `SELECT oi.name, sum(oi.qty)::int AS qty FROM order_items oi JOIN orders o ON o.id = oi.order_id
       WHERE o.customer_id = $1 AND o.status <> 'cancelled' GROUP BY oi.name ORDER BY qty DESC LIMIT 5`, [id]),
    many<{ key: string; name: string; price: string; qty: number; updated_at: string }>(
      `SELECT cc.product_id AS key, p.brand || ' ' || p.name AS name, p.price, cc.qty, cc.updated_at
       FROM customer_cart cc JOIN products p ON p.id = split_part(cc.product_id, '~', 1) WHERE cc.customer_id = $1 ORDER BY cc.updated_at DESC`, [id]),
    many<{ name: string; slug: string }>(
      `SELECT p.brand || ' ' || p.name AS name, p.slug FROM customer_favorites f JOIN products p ON p.id = f.product_id WHERE f.customer_id = $1 ORDER BY f.created_at DESC LIMIT 12`, [id]),
    many<{ name: string; slug: string; views: number; last_at: string; bought: boolean }>(
      `SELECT p.brand || ' ' || p.name AS name, p.slug, v.views, v.last_at,
         EXISTS (SELECT 1 FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.customer_id = v.customer_id AND i.product_id = v.product_id AND o.status <> 'cancelled') AS bought
       FROM customer_product_views v JOIN products p ON p.id = v.product_id WHERE v.customer_id = $1 ORDER BY v.last_at DESC LIMIT 12`, [id]),
    replenishFor(id),
    many<{ id: string; due: string; due_iso: string; text: string; done: boolean; overdue: boolean }>(
      `SELECT id, to_char(due, 'DD.MM') AS due, to_char(due, 'YYYY-MM-DD') AS due_iso, text, done_at IS NOT NULL AS done,
         done_at IS NULL AND due < (now() AT TIME ZONE 'Asia/Tashkent')::date AS overdue
       FROM crm_tasks WHERE customer_id = $1 ORDER BY done_at IS NOT NULL, due, created_at DESC LIMIT 20`, [id]),
    segmentsOf(id),
    many<{ src: string; n: number }>(
      `SELECT coalesce(data->>'src', 'direct') AS src, count(*)::int AS n FROM customer_events
       WHERE customer_id = $1 AND type = 'visit' AND created_at > now() - interval '90 days' GROUP BY 1 ORDER BY n DESC LIMIT 5`, [id]),
  ]);
  const live = orders.filter((o) => o.status !== "cancelled");
  // Средний интервал между заказами — «как часто покупает».
  const interval = live.length >= 2
    ? Math.round((new Date(live[0].created_at).getTime() - new Date(live[live.length - 1].created_at).getTime()) / 86400000 / (live.length - 1))
    : null;
  const cancelled = orders.length - live.length;
  const cartTotal = cart.reduce((a, r) => a + Number(r.price) * r.qty, 0);
  const cartSince = cart.length ? cart.reduce((m, r) => (r.updated_at > m ? r.updated_at : m), cart[0].updated_at) : null;

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
                ["Заказов", `${c.orders_count}${cancelled ? ` · ${cancelled} отм.` : ""}`],
                ["Сумма покупок", fmtSum(c.total_spent)],
                ["Средний чек", c.orders_count ? fmtSum(avg) : "—"],
                ["Последний заказ", c.last_order_at ? `${daysAgo(c.last_order_at)} дн. назад` : "—"],
                ["Покупает раз в", interval ? `${interval} дн.` : "—"],
                ["Визитов", String(c.visits_count)],
                ["Был на сайте", ago(c.last_seen_at) ?? "—"],
                ["Пришёл", c.first_creator_code ? `креатор ${c.first_creator_code}` : c.first_utm?.utm_source ? `реклама: ${c.first_utm.utm_source}` : "напрямую"],
              ].map(([l, v]) => (
                <div key={l}><p className="text-[12px] text-muted">{l}</p><p className="font-semibold tabular">{v}</p></div>
              ))}
            </div>
            {segs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3">
                {segs.map((k) => (
                  <Link key={k} href={`/admin/customers?seg=${k}`} title={SEGMENTS[k].hint} className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${SEGMENTS[k].group === "action" ? "bg-accent-soft text-accent" : "bg-surface text-ink/80"}`}>{SEGMENTS[k].l}</Link>
                ))}
              </div>
            )}
          </Card>

          {(cart.length > 0 || replenish.length > 0) && (
            <Card className="space-y-3">
              {cart.length > 0 && (
                <div>
                  <h2 className="font-bold">Сейчас в корзине <span className="font-normal text-muted">· {fmtSum(cartTotal)} · {ago(cartSince)}</span></h2>
                  <ul className="mt-1.5 space-y-1 text-[14px]">
                    {cart.map((r) => <li key={r.key} className="flex gap-2"><span className="min-w-0 flex-1 truncate">{r.name}</span><span className="text-muted tabular">× {r.qty}</span></li>)}
                  </ul>
                </div>
              )}
              {replenish.length > 0 && (
                <div className={cart.length ? "border-t border-line pt-3" : ""}>
                  <h2 className="font-bold">Заканчивается</h2>
                  <ul className="mt-1.5 space-y-1 text-[14px]">
                    {replenish.map((r) => {
                      const d = -daysAgo(r.ends_at);
                      return <li key={r.product_id} className="flex gap-2"><span className="min-w-0 flex-1 truncate">{r.name}</span><span className={`tabular ${d < 0 ? "text-warn" : "text-muted"}`}>{d < 0 ? `закончилось ~${-d} дн. назад` : d === 0 ? "сегодня" : `через ~${d} дн.`}</span></li>;
                    })}
                  </ul>
                  <p className="mt-1 text-[12px] text-muted">По полю «хватает на N дней» у товара и количеству в заказе.</p>
                </div>
              )}
            </Card>
          )}

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

          <Card>
            <h2 className="font-bold">Интересы</h2>
            <div className="mt-2 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[13px] font-medium text-muted">Смотрел недавно</p>
                <ul className="mt-1 space-y-1 text-[14px]">
                  {viewed.map((v) => (
                    <li key={v.slug} className="flex gap-2">
                      <a href={`/ru/p/${v.slug}`} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:text-accent">{v.name}</a>
                      <span className="shrink-0 text-[12px] text-muted tabular">{v.views > 1 ? `${v.views}× · ` : ""}{ago(v.last_at)}{v.bought ? " · куплен" : ""}</span>
                    </li>
                  ))}
                  {!viewed.length && <li className="text-[13px] text-muted">Пока нет — считаем просмотры после входа на сайт</li>}
                </ul>
              </div>
              <div>
                <p className="text-[13px] font-medium text-muted">В избранном</p>
                <ul className="mt-1 space-y-1 text-[14px]">
                  {favorites.map((f) => <li key={f.slug} className="truncate"><a href={`/ru/p/${f.slug}`} target="_blank" rel="noreferrer" className="hover:text-accent">{f.name}</a></li>)}
                  {!favorites.length && <li className="text-[13px] text-muted">Пусто</li>}
                </ul>
              </div>
            </div>
            {sources.length > 0 && <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">Откуда заходит (90 дней): {sources.map((x) => `${sourceLabel(x.src)} — ${x.n}`).join(", ")}</p>}
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
          <CustomerTasks customerId={c.id} tasks={tasks} />
          <CustomerTags customerId={c.id} value={c.tags ?? []} all={[...TAGS]} />
          <CustomerNote id={c.id} note={c.manager_note ?? ""} />
          <Card>
            <h2 className="font-bold">События</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(EVENT_FILTERS).map(([k, f]) => (
                <Link key={k} href={`/admin/customers/${c.id}${k === "all" ? "" : `?ev=${k}`}`} scroll={false} className={`rounded-full px-2.5 py-1 text-[12px] ${ev === k ? "bg-ink text-white" : "bg-surface"}`}>{f.l}</Link>
              ))}
            </div>
            <ol className="mt-2 space-y-1.5 text-[13px]">
              {events.map((e, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-24 shrink-0 text-muted tabular">{fmtDate(e.created_at)}</span>
                  <span>{EVENT_LABEL[e.type] ?? e.type}{e.type === "visit" ? ` (${sourceLabel(e.data?.src as string)})` : ""}{(e.type === "task_added" || e.type === "task_done") && e.data?.text ? `: ${e.data.text}` : ""}{e.type === "marketing_changed" ? (e.data?.marketing ? ": подписался" : ": отписался") : ""}{e.type === "order_placed" && e.data?.number ? ` ${e.data.number}` : ""}{e.type === "order_status" && e.data?.status ? `: ${STATUS_META[e.data.status as OrderStatus]?.label.toLowerCase() ?? e.data.status}` : ""}</span>
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
