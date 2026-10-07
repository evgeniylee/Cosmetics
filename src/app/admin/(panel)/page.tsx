import Link from "next/link";
import { many, one } from "@/server/db";
import { STATUS_META, fmtDate, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { Card, PageHead } from "./ui";

export const metadata = { title: "Сводка" };

// Узбекистан без перехода на летнее время: UTC+5.
function tashkentDayStart(daysAgo = 0) {
  const now = new Date(Date.now() + 5 * 3600_000);
  const d = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo) - 5 * 3600_000;
  return new Date(d).toISOString();
}

type Stat = { orders: number; revenue: string | null; discount: string | null; items_rev: string | null; cost: string | null; uncosted: number };

async function period(since: string): Promise<Stat> {
  return (await one<Stat>(
    `WITH o AS (SELECT * FROM orders WHERE created_at >= $1 AND status <> 'cancelled'),
      i AS (SELECT oi.order_id, sum(oi.price * oi.qty) AS rev, sum(oi.cost * oi.qty) AS cost, bool_or(oi.cost IS NULL) AS miss
            FROM order_items oi JOIN o ON o.id = oi.order_id GROUP BY oi.order_id)
     SELECT (SELECT count(*)::int FROM o) AS orders,
            (SELECT sum(total) FROM o) AS revenue,
            (SELECT sum(o.discount) FROM o JOIN i ON i.order_id = o.id WHERE NOT i.miss) AS discount,
            (SELECT sum(rev) FROM i WHERE NOT miss) AS items_rev,
            (SELECT sum(cost) FROM i WHERE NOT miss) AS cost,
            (SELECT count(*)::int FROM i WHERE miss) AS uncosted`,
    [since]
  ))!;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-card bg-white p-4 ring-1 ring-line">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[22px] font-bold tabular md:text-[26px]">{value}</p>
      {sub && <p className="mt-0.5 text-[12px] text-muted">{sub}</p>}
    </div>
  );
}

function profitLine(s: Stat) {
  if (!s.items_rev) return { value: "—", sub: s.orders ? "Нет себестоимости у товаров" : undefined };
  const profit = Number(s.items_rev) - Number(s.discount ?? 0) - Number(s.cost ?? 0);
  const margin = Math.round((profit / Number(s.items_rev)) * 100);
  return { value: fmtSum(profit), sub: `маржа ${margin}%${s.uncosted ? ` · без учёта ${s.uncosted} зак. без себестоимости` : ""}` };
}

export default async function Dashboard() {
  const [today, week, month] = await Promise.all([period(tashkentDayStart(0)), period(tashkentDayStart(6)), period(tashkentDayStart(29))]);
  const statuses = await many<{ status: OrderStatus; n: number }>(`SELECT status, count(*)::int AS n FROM orders WHERE status IN ('new','needs_call','confirmed','shipped') GROUP BY status`);
  const newCustomers = await one<{ n: number }>(`SELECT count(*)::int AS n FROM customers WHERE created_at >= $1 AND first_name IS NOT NULL`, [tashkentDayStart(6)]);
  const repeat = await one<{ buyers: number; repeaters: number }>(`SELECT count(*) FILTER (WHERE orders_count >= 1)::int AS buyers, count(*) FILTER (WHERE orders_count >= 2)::int AS repeaters FROM customers`);
  const top = await many<{ name: string; qty: number; rev: string }>(
    `SELECT oi.name, sum(oi.qty)::int AS qty, sum(oi.price * oi.qty) AS rev FROM order_items oi JOIN orders o ON o.id = oi.order_id
     WHERE o.created_at >= $1 AND o.status <> 'cancelled' GROUP BY oi.name ORDER BY qty DESC LIMIT 5`,
    [tashkentDayStart(29)]
  );
  const promos = await many<{ code: string; orders: number; rev: string; commission: string; fresh: number }>(
    `SELECT creator_code AS code, count(*)::int AS orders, sum(subtotal - discount) AS rev,
       sum(commission) FILTER (WHERE commission_status <> 'void') AS commission, count(*) FILTER (WHERE new_customer)::int AS fresh
     FROM orders WHERE creator_code IS NOT NULL AND created_at >= $1 AND status <> 'cancelled' GROUP BY creator_code ORDER BY rev DESC LIMIT 5`,
    [tashkentDayStart(29)]
  );
  const recent = await many<{ id: string; number: string; status: OrderStatus; first_name: string | null; total: string; created_at: string }>(
    `SELECT id, number, status, first_name, total, created_at FROM orders ORDER BY created_at DESC LIMIT 8`
  );
  const wp = profitLine(week);
  const mp = profitLine(month);
  const active = statuses.reduce((a, s) => a + s.n, 0);

  return (
    <>
      <PageHead title="Сводка" sub="Цифры по заказам без отменённых, время ташкентское" />
      <div className="space-y-4 px-4 md:px-8">
        {statuses.some((s) => s.status === "needs_call" || s.status === "new") && (
          <Link href="/admin/orders?status=open" className="flex items-center justify-between rounded-card bg-accent px-4 py-3 font-semibold text-white">
            <span>Ждут обработки: {statuses.filter((s) => s.status === "new" || s.status === "needs_call").reduce((a, s) => a + s.n, 0)}</span>
            <span>Открыть →</span>
          </Link>
        )}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="Сегодня" value={`${today.orders} зак.`} sub={fmtSum(today.revenue ?? 0)} />
          <Metric label="7 дней" value={fmtSum(week.revenue ?? 0)} sub={`${week.orders} зак. · средний ${week.orders ? fmtSum(Number(week.revenue) / week.orders) : "—"}`} />
          <Metric label="Прибыль за 7 дней" value={wp.value} sub={wp.sub} />
          <Metric label="Прибыль за 30 дней" value={mp.value} sub={mp.sub} />
          <Metric label="Новые клиенты, 7 дней" value={String(newCustomers?.n ?? 0)} />
          <Metric label="Повторные покупатели" value={repeat?.buyers ? `${Math.round((repeat.repeaters / repeat.buyers) * 100)}%` : "—"} sub={`${repeat?.repeaters ?? 0} из ${repeat?.buyers ?? 0}`} />
          <Metric label="В работе" value={String(active)} sub={statuses.map((s) => `${STATUS_META[s.status].label.toLowerCase()} ${s.n}`).join(" · ") || "пусто"} />
          <Metric label="30 дней" value={fmtSum(month.revenue ?? 0)} sub={`${month.orders} зак.`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-bold">Последние заказы</h2><Link href="/admin/orders" className="text-[14px] text-accent">Все →</Link></div>
            <ul className="mt-2 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-[14px] hover:text-accent">
                    <span className={`size-2 shrink-0 rounded-full ${STATUS_META[o.status].dot}`} />
                    <span className="w-16 font-semibold tabular">{o.number}</span>
                    <span className="min-w-0 flex-1 truncate">{o.first_name ?? "—"}</span>
                    <span className="hidden text-muted tabular sm:inline">{fmtDate(o.created_at)}</span>
                    <span className="w-28 text-right font-semibold tabular">{fmtSum(o.total)}</span>
                  </Link>
                </li>
              ))}
              {!recent.length && <li className="py-6 text-center text-[14px] text-muted">Заказов пока нет</li>}
            </ul>
          </Card>
          <div className="space-y-4">
            <Card>
              <h2 className="font-bold">Топ товаров за 30 дней</h2>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {top.map((t) => (
                  <li key={t.name} className="flex gap-3"><span className="min-w-0 flex-1 truncate">{t.name}</span><span className="tabular text-muted">{t.qty} шт</span><span className="w-28 text-right tabular">{fmtSum(t.rev)}</span></li>
                ))}
                {!top.length && <li className="text-muted">Пока нет продаж</li>}
              </ul>
            </Card>
            <Card>
              <div className="flex items-center justify-between"><h2 className="font-bold">Креаторы за 30 дней</h2><Link href="/admin/promo" className="text-[14px] text-accent">Креаторы →</Link></div>
              <ul className="mt-2 space-y-1.5 text-[14px]">
                {promos.map((p) => (
                  <li key={p.code} className="flex gap-3">
                    <span className="w-24 font-semibold">{p.code}</span>
                    <span className="flex-1 tabular text-muted">{p.orders} зак. · {p.fresh} новых</span>
                    <span className="tabular">{fmtSum(p.rev)}</span>
                    <span className="w-32 text-right tabular text-muted">комиссия {fmtSum(p.commission ?? 0)}</span>
                  </li>
                ))}
                {!promos.length && <li className="text-muted">Заказов по промокодам пока нет</li>}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
