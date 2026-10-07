import Link from "next/link";
import { many, one } from "@/server/db";
import { fmtDate, fmtPhone, fmtSum } from "@/lib/admin-format";
import { FilterTabs, PageHead, Pager, SearchBox } from "../ui";

export const metadata = { title: "Клиенты" };
const SIZE = 40;
const VIP_FROM = 2_000_000;

type Row = { id: string; first_name: string | null; last_name: string | null; phone: string; birth_date: string | null; orders_count: number; total_spent: string; last_order_at: string | null; created_at: string; marketing_opt_in: boolean; first_creator_code: string | null };

// Сегменты считаются в SQL, чтобы список и счётчики совпадали.
const SEGMENTS: Record<string, { l: string; sql: string }> = {
  all: { l: "Все", sql: "TRUE" },
  new: { l: "Новые за 7 дней", sql: "c.created_at >= now() - interval '7 days'" },
  buyers: { l: "Покупали", sql: "c.orders_count >= 1" },
  repeat: { l: "Повторные", sql: "c.orders_count >= 2" },
  vip: { l: "VIP", sql: `c.total_spent >= ${VIP_FROM}` },
  sleeping: { l: "Спящие 60+ дней", sql: "c.last_order_at < now() - interval '60 days'" },
  nobuy: { l: "Без заказов", sql: "c.orders_count = 0" },
  birthday: { l: "ДР в этом месяце", sql: "extract(month FROM c.birth_date) = extract(month FROM now() AT TIME ZONE 'Asia/Tashkent')" },
  optin: { l: "Согласны на рассылку", sql: "c.marketing_opt_in" },
};

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const seg = SEGMENTS[sp.seg ?? ""] ? sp.seg! : "all";
  const sort = sp.sort === "spent" ? "c.total_spent DESC" : sp.sort === "last" ? "c.last_order_at DESC NULLS LAST" : "c.created_at DESC";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  // Только завершившие регистрацию или оформившие заказ: без «пустых» записей после ввода кода.
  const base = `(c.first_name IS NOT NULL OR c.orders_count > 0)`;
  const params: unknown[] = [];
  const where = [base, SEGMENTS[seg].sql];
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const parts = [`lower(coalesce(c.first_name,'') || ' ' || coalesce(c.last_name,'')) LIKE $${params.length}`];
    const d = q.replace(/\D/g, "");
    if (d.length >= 3) { params.push(`%${d}%`); parts.push(`c.phone LIKE $${params.length}`); }
    where.push(`(${parts.join(" OR ")})`);
  }
  const w = `WHERE ${where.join(" AND ")}`;
  const total = (await one<{ n: number }>(`SELECT count(*)::int AS n FROM customers c ${w}`, params))!.n;
  const rows = await many<Row>(
    `SELECT c.id, c.first_name, c.last_name, c.phone, to_char(c.birth_date, 'DD.MM') AS birth_date, c.orders_count, c.total_spent, c.last_order_at, c.created_at,
       c.marketing_opt_in, c.first_creator_code
     FROM customers c ${w} ORDER BY ${sort} LIMIT ${SIZE} OFFSET ${(page - 1) * SIZE}`,
    params
  );
  const counts = (await one<Record<string, number>>(
    `SELECT ${Object.entries(SEGMENTS).map(([k, s]) => `count(*) FILTER (WHERE ${s.sql})::int AS ${k}`).join(", ")} FROM customers c WHERE ${base}`
  ))!;

  return (
    <>
      <PageHead title="Клиенты" sub={`${total} по фильтру`}>
        <a download href="/api/admin/export/customers" className="h-10 rounded-full bg-white px-4 text-[14px] leading-10 ring-1 ring-line hover:ring-ink/30">Выгрузить в Excel</a>
      </PageHead>
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBox placeholder="Имя или телефон" />
          <FilterTabs param="sort" value={sp.sort ?? ""} options={[{ v: "", l: "Новые сверху" }, { v: "spent", l: "По сумме" }, { v: "last", l: "По последнему заказу" }]} />
        </div>
        <FilterTabs param="seg" value={seg} options={Object.entries(SEGMENTS).map(([v, s]) => ({ v, l: s.l, n: counts[v] }))} />

        <ul className="divide-y divide-line overflow-hidden rounded-card bg-white ring-1 ring-line">
          {rows.map((c) => {
            const vip = Number(c.total_spent) >= VIP_FROM;
            return (
              <li key={c.id}>
                <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface/60">
                  <span className={`grid size-10 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${vip ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                    {(c.first_name ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      {[c.first_name, c.last_name].filter(Boolean).join(" ") || "Без имени"}
                      {vip && <span className="ml-2 rounded-full bg-ink px-2 py-0.5 align-middle text-[11px] text-white">VIP</span>}
                    </span>
                    <span className="block truncate text-[13px] text-muted tabular">
                      {fmtPhone(c.phone)}{c.birth_date ? ` · ДР ${c.birth_date}` : ""}{c.first_creator_code ? ` · ${c.first_creator_code}` : ""}
                    </span>
                  </span>
                  <span className="text-right text-[14px] tabular">
                    <span className="block font-semibold">{c.orders_count ? fmtSum(c.total_spent) : "—"}</span>
                    <span className="block text-[12px] text-muted">{c.orders_count ? `${c.orders_count} зак. · ${fmtDate(c.last_order_at!, false)}` : `с ${fmtDate(c.created_at, false)}`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          {!rows.length && <li className="py-10 text-center text-muted">Никого не нашли</li>}
        </ul>
        <Pager page={page} total={total} size={SIZE} />
      </div>
    </>
  );
}
