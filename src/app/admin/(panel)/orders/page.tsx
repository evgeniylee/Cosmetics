import Link from "next/link";
import { many, one } from "@/server/db";
import { PAYMENT_LABEL, STATUS_META, fmtDate, fmtPhone, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { CITIES } from "@/lib/shop";
import { FilterTabs, PageHead, Pager, SearchBox } from "../ui";

export const metadata = { title: "Заказы" };
const SIZE = 30;

type Row = { id: string; number: string; status: OrderStatus; first_name: string | null; last_name: string | null; phone: string; city: string; total: string; payment: string; paid_at: string | null; promo_code: string | null; items: number; created_at: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status ?? "open";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  if (status === "open") where.push(`o.status IN ('new','needs_call','confirmed','shipped')`);
  else if (status !== "all") { params.push(status); where.push(`o.status = $${params.length}`); }
  if (q) {
    const digits = q.replace(/\D/g, "");
    params.push(`%${q.toLowerCase()}%`);
    const t = `$${params.length}`;
    const parts = [`lower(o.number) LIKE ${t}`, `lower(coalesce(o.first_name,'') || ' ' || coalesce(o.last_name,'')) LIKE ${t}`, `lower(o.address) LIKE ${t}`];
    if (digits.length >= 3) { params.push(`%${digits}%`); parts.push(`o.phone LIKE $${params.length}`); }
    where.push(`(${parts.join(" OR ")})`);
  }
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM orders o ${w}`, params))!.n;
  const rows = await many<Row>(
    `SELECT o.id, o.number, o.status, o.first_name, o.last_name, o.phone, o.city, o.total, o.payment, o.paid_at, o.promo_code, o.created_at,
       (SELECT coalesce(sum(qty),0)::int FROM order_items WHERE order_id = o.id) AS items
     FROM orders o ${w} ORDER BY o.created_at DESC LIMIT ${SIZE} OFFSET ${(page - 1) * SIZE}`,
    params
  );
  const counts = await many<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM orders GROUP BY status`);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const open = ["new", "needs_call", "confirmed", "shipped"].reduce((a, s) => a + n(s), 0);
  const city = (id: string) => CITIES.find((c) => c.id === id)?.ru ?? id;

  return (
    <>
      <PageHead title="Заказы" sub={`${total} по фильтру`}>
        <a download href="/api/admin/export/orders" className="h-10 rounded-full bg-white px-4 text-[14px] leading-10 ring-1 ring-line hover:ring-ink/30">Выгрузить в Excel</a>
      </PageHead>
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBox placeholder="Номер, имя, телефон, адрес" />
          <FilterTabs
            param="status"
            value={status}
            options={[
              { v: "open", l: "В работе", n: open },
              { v: "new", l: "Новые", n: n("new") },
              { v: "needs_call", l: "Звонок", n: n("needs_call") },
              { v: "confirmed", l: "Подтверждены", n: n("confirmed") },
              { v: "shipped", l: "В пути", n: n("shipped") },
              { v: "delivered", l: "Доставлены", n: n("delivered") },
              { v: "cancelled", l: "Отменены", n: n("cancelled") },
              { v: "all", l: "Все" },
            ]}
          />
        </div>

        {/* Десктоп: таблица */}
        <div className="hidden overflow-hidden rounded-card bg-white ring-1 ring-line md:block">
          <table className="w-full text-[14px]">
            <thead className="bg-surface text-left text-[12px] uppercase tracking-wide text-muted">
              <tr><th className="px-4 py-2.5">Заказ</th><th className="px-4 py-2.5">Статус</th><th className="px-4 py-2.5">Клиент</th><th className="px-4 py-2.5">Город</th><th className="px-4 py-2.5">Оплата</th><th className="px-4 py-2.5 text-right">Сумма</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-surface/60">
                  <td className="px-4 py-3"><Link href={`/admin/orders/${o.id}`} className="font-semibold text-accent tabular">{o.number}</Link><div className="text-[12px] text-muted tabular">{fmtDate(o.created_at)}</div></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${STATUS_META[o.status].cls}`}>{STATUS_META[o.status].label}</span></td>
                  <td className="px-4 py-3">{[o.first_name, o.last_name].filter(Boolean).join(" ") || "—"}<div className="text-[12px] text-muted tabular">{fmtPhone(o.phone)}</div></td>
                  <td className="px-4 py-3">{city(o.city)}</td>
                  <td className="px-4 py-3">{PAYMENT_LABEL[o.payment] ?? o.payment}{o.paid_at && <span className="ml-1.5 text-success">✓</span>}{o.promo_code && <div className="text-[12px] text-accent">{o.promo_code}</div>}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular">{fmtSum(o.total)}<div className="text-[12px] font-normal text-muted">{o.items} шт</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && <p className="py-10 text-center text-muted">Заказов нет</p>}
        </div>

        {/* Мобила: карточки */}
        <ul className="space-y-2 md:hidden">
          {rows.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/orders/${o.id}`} className="block rounded-card bg-white p-4 ring-1 ring-line active:bg-surface">
                <div className="flex items-center gap-2">
                  <span className="font-semibold tabular">{o.number}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[12px] font-medium ${STATUS_META[o.status].cls}`}>{STATUS_META[o.status].label}</span>
                  <span className="ml-auto font-bold tabular">{fmtSum(o.total)}</span>
                </div>
                <p className="mt-1 text-[14px]">{[o.first_name, o.last_name].filter(Boolean).join(" ") || "—"} · <span className="tabular">{fmtPhone(o.phone)}</span></p>
                <p className="text-[13px] text-muted">{city(o.city)} · {PAYMENT_LABEL[o.payment]}{o.paid_at ? " ✓" : ""} · {fmtDate(o.created_at)}</p>
              </Link>
            </li>
          ))}
          {!rows.length && <li className="py-10 text-center text-muted">Заказов нет</li>}
        </ul>
        <Pager page={page} total={total} size={SIZE} />
      </div>
    </>
  );
}
