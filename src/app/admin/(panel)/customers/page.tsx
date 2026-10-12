import Link from "next/link";
import { many, one } from "@/server/db";
import { CUSTOMER_BASE, SEGMENTS, customerWhere } from "@/server/crm";
import { ago, fmtDate, fmtPhone, fmtSum } from "@/lib/admin-format";
import { FilterTabs, PageHead, Pager, SearchBox } from "../ui";
import { TaskCheck } from "./tasks";

export const metadata = { title: "Клиенты" };
export const dynamic = "force-dynamic";
const SIZE = 40;

type Row = {
  id: string; first_name: string | null; last_name: string | null; phone: string; birth_date: string | null; orders_count: number; total_spent: string;
  last_order_at: string | null; last_seen_at: string | null; created_at: string; first_creator_code: string | null; tags: string[]; vip: boolean;
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { seg, sql: w, params } = customerWhere(sp);
  const sort = sp.sort === "spent" ? "c.total_spent DESC" : sp.sort === "last" ? "c.last_order_at DESC NULLS LAST" : sp.sort === "seen" ? "c.last_seen_at DESC NULLS LAST" : "c.created_at DESC";
  const page = Math.max(1, Number(sp.page) || 1);

  const [total, rows, counts, tags, tasks] = await Promise.all([
    one<{ n: number }>(`SELECT count(*)::int AS n FROM customers c ${w}`, params).then((r) => r!.n),
    many<Row>(
      `SELECT c.id, c.first_name, c.last_name, c.phone, to_char(c.birth_date, 'DD.MM') AS birth_date, c.orders_count, c.total_spent, c.last_order_at,
         c.last_seen_at, c.created_at, c.first_creator_code, c.tags, (${SEGMENTS.vip.sql}) AS vip
       FROM customers c ${w} ORDER BY ${sort} LIMIT ${SIZE} OFFSET ${(page - 1) * SIZE}`, params),
    one<Record<string, number>>(
      `SELECT ${Object.entries(SEGMENTS).map(([k, s]) => `count(*) FILTER (WHERE ${s.sql})::int AS "${k}"`).join(", ")} FROM customers c WHERE ${CUSTOMER_BASE}`
    ).then((r) => r!),
    many<{ tag: string; n: number }>(`SELECT t AS tag, count(*)::int AS n FROM customers c, unnest(c.tags) t WHERE ${CUSTOMER_BASE} GROUP BY t ORDER BY n DESC`),
    many<{ id: string; due: string; text: string; customer_id: string; name: string | null; overdue: boolean }>(
      `SELECT t.id, to_char(t.due, 'DD.MM') AS due, t.text, t.customer_id, NULLIF(trim(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')), '') AS name,
         t.due < (now() AT TIME ZONE 'Asia/Tashkent')::date AS overdue
       FROM crm_tasks t JOIN customers c ON c.id = t.customer_id
       WHERE t.done_at IS NULL AND t.due <= (now() AT TIME ZONE 'Asia/Tashkent')::date ORDER BY t.due, t.created_at LIMIT 20`),
  ]);
  const opts = (group: string) => Object.entries(SEGMENTS).filter(([, s]) => s.group === group).map(([v, s]) => ({ v, l: s.l, n: counts[v] }));
  const exportQs = new URLSearchParams(Object.entries({ seg: sp.seg, tag: sp.tag, q: sp.q }).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <PageHead title="Клиенты" sub={`${total} по фильтру`}>
        <Link href="/admin/customers/stats" className="h-10 rounded-full bg-ink px-4 text-[14px] leading-10 text-white">Аналитика</Link>
        <a download href={`/api/admin/export/customers${exportQs ? `?${exportQs}` : ""}`} className="h-10 rounded-full bg-white px-4 text-[14px] leading-10 ring-1 ring-line hover:ring-ink/30">Выгрузить в Excel</a>
      </PageHead>
      <div className="space-y-3 px-4 pb-10 md:px-8">
        {tasks.length > 0 && (
          <section className="rounded-card bg-white p-4 ring-1 ring-line">
            <h2 className="font-bold">Задачи на сегодня <span className="text-muted">· {tasks.length}</span></h2>
            <ul className="mt-2 divide-y divide-line text-[14px]">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <TaskCheck id={t.id} done={false} />
                  <span className={`w-12 shrink-0 tabular ${t.overdue ? "font-semibold text-warn" : "text-muted"}`}>{t.due}</span>
                  <span className="min-w-0 flex-1">{t.text}</span>
                  <Link href={`/admin/customers/${t.customer_id}`} className="shrink-0 text-accent">{t.name ?? "Клиент"} →</Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Что сделать</p>
          <FilterTabs param="seg" value={seg === "all" ? "" : seg} options={[{ v: "", l: "Все", n: counts.all }, ...opts("action")]} />
        </div>
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Клиенты</p>
          <FilterTabs param="seg" value={seg} options={opts("people")} />
        </div>
        {tags.length > 0 && <FilterTabs param="tag" value={sp.tag ?? ""} options={[{ v: "", l: "Все метки" }, ...tags.map((t) => ({ v: t.tag, l: `#${t.tag}`, n: t.n }))]} />}
        {SEGMENTS[seg].hint && <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] text-ink/80">{SEGMENTS[seg].hint}</p>}

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBox placeholder="Имя или телефон" />
          <FilterTabs param="sort" value={sp.sort ?? ""} options={[{ v: "", l: "Новые сверху" }, { v: "spent", l: "По сумме" }, { v: "last", l: "По заказу" }, { v: "seen", l: "По визиту" }]} />
        </div>

        <ul className="divide-y divide-line overflow-hidden rounded-card bg-white ring-1 ring-line">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${c.vip ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                  {(c.first_name ?? "?").slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Без имени"}
                    {c.vip && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle text-[11px] text-white">VIP</span>}
                    {c.tags.map((t) => <span key={t} className="ml-1.5 rounded-full bg-surface px-2 py-0.5 align-middle text-[11px] text-ink/70">#{t}</span>)}
                  </span>
                  <span className="block truncate text-[13px] text-muted tabular">
                    {fmtPhone(c.phone)}{c.birth_date ? ` · ДР ${c.birth_date}` : ""}{c.first_creator_code ? ` · ${c.first_creator_code}` : ""}{c.last_seen_at ? ` · был ${ago(c.last_seen_at)}` : ""}
                  </span>
                </span>
                <span className="text-right text-[14px] tabular">
                  <span className="block font-semibold">{c.orders_count ? fmtSum(c.total_spent) : "—"}</span>
                  <span className="block text-[12px] text-muted">{c.orders_count ? `${c.orders_count} зак. · ${fmtDate(c.last_order_at!, false)}` : `с ${fmtDate(c.created_at, false)}`}</span>
                </span>
              </Link>
            </li>
          ))}
          {!rows.length && <li className="py-10 text-center text-muted">Никого не нашли</li>}
        </ul>
        <Pager page={page} total={total} size={SIZE} />
      </div>
    </>
  );
}
