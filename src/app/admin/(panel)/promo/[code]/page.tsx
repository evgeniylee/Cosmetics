import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import { COMMISSION_STATE, STATE_LABEL, balances, funnel, linkPath, linkStats, siteOrigin } from "@/server/creators";
import { STATUS_META, fmtDate, fmtPhone, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { CATEGORIES } from "@/data/catalog";
import { Card, PageHead } from "../../ui";
import { CreatorActions } from "./actions-ui";

export const metadata = { title: "Креатор" };

const ATTR: Record<string, string> = { code: "код", link: "ссылка", repeat: "клиент 60 дн", manual: "вручную" };

export default async function CreatorPage({ params }: { params: Promise<{ code: string }> }) {
  const code = decodeURIComponent((await params).code).toUpperCase();
  const c = await one<{ code: string; creator_name: string; creator_handle: string | null; creator_phone: string | null; percent: number; commission: number; active: boolean; featured: boolean; picks: string[] }>(
    `SELECT code, creator_name, creator_handle, creator_phone, percent, commission, active, featured, picks FROM promo_codes WHERE code = $1`, [code]);
  if (!c) notFound();

  const [f30m, balm, links, origin] = await Promise.all([funnel(30, code), balances(code), linkStats(code), siteOrigin()]);
  const f = f30m.get(code) ?? { clicks: 0, visitors: 0, orders: 0, linkOrders: 0, revenue: 0, commission: 0, newCustomers: 0 };
  const b = balm.get(code) ?? { ready: 0, hold: 0, waiting: 0, clawback: 0, paid: 0, readyOrders: 0 };
  const cost = await one<{ discount: string; all: number; cancelled: number; self: number }>(
    `SELECT coalesce(sum(discount) FILTER (WHERE status <> 'cancelled' AND promo_code = $1), 0) AS discount,
       count(*)::int AS all, count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
       count(*) FILTER (WHERE commission_note = 'Покупка на номер креатора')::int AS self
     FROM orders WHERE creator_code = $1 AND created_at >= now() - interval '30 days'`, [code]);
  const sameAddr = await many<{ address: string; n: number }>(
    `SELECT min(address) AS address, count(DISTINCT phone)::int AS n FROM orders WHERE creator_code = $1 AND created_at >= now() - interval '30 days'
     GROUP BY lower(regexp_replace(address, '\\s+', ' ', 'g')) HAVING count(DISTINCT phone) >= 3`, [code]);
  const orders = await many<{ id: string; number: string; status: OrderStatus; created_at: string; first_name: string | null; last_name: string | null; phone: string; base: string; commission: string; state: string; attribution: string; new_customer: boolean; label: string | null; note: string | null }>(
    `SELECT o.id, o.number, o.status, o.created_at, o.first_name, o.last_name, o.phone, (o.subtotal - o.discount) AS base, o.commission, ${COMMISSION_STATE} AS state,
       o.attribution, o.new_customer, l.label, o.commission_note AS note
     FROM orders o LEFT JOIN creator_links l ON l.id = o.link_id WHERE o.creator_code = $1 ORDER BY o.created_at DESC LIMIT 100`, [code]);
  const payouts = await many<{ id: string; amount: string; orders_count: number; created_at: string; note: string | null; paid_by: string | null }>(
    `SELECT * FROM creator_payouts WHERE creator_code = $1 ORDER BY created_at DESC`, [code]);
  const products = await many<{ slug: string; label: string }>(`SELECT slug, brand || ' ' || name AS label FROM products`);

  const spend = Number(cost?.discount ?? 0) + f.commission;
  const flags: string[] = [];
  if (cost?.self) flags.push(`Покупки на номер креатора: ${cost.self} — комиссия не начислена`);
  if ((cost?.all ?? 0) >= 5 && (cost!.cancelled / cost!.all) >= 0.3) flags.push(`Много отмен: ${cost!.cancelled} из ${cost!.all} заказов за 30 дней`);
  if (f.visitors >= 300 && f.orders === 0) flags.push(`${f.visitors} переходов и ни одного заказа — проверьте качество трафика`);
  if (f.orders >= 5 && f.newCustomers / f.orders < 0.3) flags.push(`Мало новых клиентов: ${f.newCustomers} из ${f.orders} — креатор в основном приводит тех, кто уже покупал`);
  for (const a of sameAddr) flags.push(`${a.n} разных номеров заказывали на один адрес: «${a.address}»`);
  const target = (t: string, v: string | null) => (t === "home" ? "главная" : t === "picks" ? "набор" : t === "category" ? CATEGORIES.find((x) => x.id === v)?.name.ru ?? v : products.find((p) => p.slug === v)?.label ?? v);

  return (
    <>
      <PageHead title={`${c.creator_name} · ${c.code}`} sub={`−${c.percent}% покупателю · ${c.commission}% креатору${c.creator_handle ? ` · ${c.creator_handle}` : ""}${c.creator_phone ? ` · ${fmtPhone(c.creator_phone)}` : " · телефон не указан"}${c.active ? "" : " · выключен"}`}>
        <Link href="/admin/promo" className="text-[14px] text-muted">← Все креаторы</Link>
      </PageHead>
      <div className="space-y-4 px-4 md:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {[
            ["Переходы, 30 дн", String(f.visitors), `${f.clicks} всего кликов`],
            ["Заказы", String(f.orders), `${f.linkOrders} по ссылкам${f.visitors ? ` · конверсия ${((f.linkOrders / f.visitors) * 100).toFixed(1)}%` : ""}`],
            ["Новые клиенты", String(f.newCustomers), f.orders ? `${Math.round((f.newCustomers / f.orders) * 100)}% заказов` : ""],
            ["Выручка", fmtSum(f.revenue), "после скидки"],
            ["Затраты", fmtSum(spend), f.revenue ? `${Math.round((spend / f.revenue) * 100)}% выручки: скидки + комиссия` : "скидки + комиссия"],
          ].map(([l, v, sub]) => (
            <div key={l} className="rounded-card bg-white p-4 ring-1 ring-line"><p className="text-[13px] text-muted">{l}</p><p className="mt-1 text-[20px] font-bold tabular">{v}</p><p className="text-[12px] text-muted">{sub}</p></div>
          ))}
        </div>

        {flags.length > 0 && (
          <Card className="bg-[#fff8f2]">
            <h2 className="font-bold text-warn">Обратите внимание</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[14px]">{flags.map((x) => <li key={x}>{x}</li>)}</ul>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0 space-y-4">
            <Card>
              <h2 className="font-bold">Ссылки</h2>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full min-w-[560px] text-[14px]">
                  <thead className="text-left text-[12px] uppercase tracking-wide text-muted"><tr><th className="py-2">Подпись</th><th>Куда</th><th className="text-right">Перех.</th><th className="text-right">Заказы</th><th className="text-right">Выручка</th><th className="text-right">Комиссия</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {links.map((l) => (
                      <tr key={l.id} className={l.archived ? "text-muted" : ""}>
                        <td className="py-2"><span className="font-medium">{l.label}</span><a href={origin + linkPath(code, l.id)} target="_blank" rel="noreferrer" className="block text-[12px] text-accent">{linkPath(code, l.id)}</a></td>
                        <td className="max-w-[160px] truncate">{target(l.target_type, l.target)}</td>
                        <td className="text-right tabular">{l.visitors}</td>
                        <td className="text-right tabular">{l.orders}</td>
                        <td className="text-right tabular">{fmtSum(l.revenue)}</td>
                        <td className="text-right tabular">{fmtSum(l.commission)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!links.length && <p className="py-4 text-[14px] text-muted">Креатор ещё не создал ни одной ссылки. Общая ссылка: {origin}{linkPath(code)}</p>}
              </div>
            </Card>

            <Card>
              <h2 className="font-bold">Заказы</h2>
              <ul className="mt-2 divide-y divide-line text-[14px]">
                {orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/orders/${o.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2.5 hover:text-accent">
                      <span className="w-14 font-semibold tabular">{o.number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[12px] ${STATUS_META[o.status].cls}`}>{STATUS_META[o.status].label}</span>
                      <span className="min-w-0 flex-1 truncate">{[o.first_name, o.last_name].filter(Boolean).join(" ") || fmtPhone(o.phone)}{o.new_customer && <span className="ml-1.5 text-[12px] text-accent">новый</span>}</span>
                      <span className="text-[12px] text-muted">{ATTR[o.attribution] ?? o.attribution}{o.label ? ` «${o.label}»` : ""}</span>
                      <span className="w-28 text-right tabular">{fmtSum(o.base)}</span>
                      <span className="w-40 text-right text-[13px] tabular">{fmtSum(o.commission)} · {STATE_LABEL[o.state] ?? o.state}</span>
                    </Link>
                  </li>
                ))}
                {!orders.length && <li className="py-4 text-muted">Заказов нет</li>}
              </ul>
            </Card>
          </div>

          <div className="space-y-4">
            <CreatorActions code={code} toPay={Math.max(0, b.ready - b.clawback)} readyOrders={b.readyOrders} clawback={b.clawback} hold={b.hold} waiting={b.waiting} />
            <Card>
              <h2 className="font-bold">Выплаты</h2>
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {payouts.map((p) => (
                  <li key={p.id} className="flex gap-2"><span className="tabular text-muted">{fmtDate(p.created_at, false)}</span><span className="min-w-0 flex-1 truncate text-muted">{p.orders_count} зак.{p.note ? ` · ${p.note}` : ""}</span><b className="tabular">{fmtSum(p.amount)}</b></li>
                ))}
                {!payouts.length && <li className="text-muted">Выплат не было</li>}
              </ul>
              <p className="mt-3 border-t border-line pt-3 text-[13px] text-muted">Выплачено всего: <b className="text-ink">{fmtSum(b.paid)}</b></p>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
