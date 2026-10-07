import Link from "next/link";
import { many } from "@/server/db";
import type { ProductRow } from "@/server/catalog";
import { CATEGORIES } from "@/data/catalog";
import { fmtSum } from "@/lib/admin-format";
import { FilterTabs, PageHead, SearchBox } from "../ui";
import { ActiveToggle, ImportButton, StockSelect } from "./row-controls";
import { ProductImage } from "@/components/ProductVisual";

export const metadata = { title: "Товары" };

type Row = ProductRow & { sold30: number };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().toLowerCase();
  const cat = sp.cat ?? "";
  const show = sp.show ?? "all";

  const where: string[] = [];
  const params: unknown[] = [];
  if (q) { params.push(`%${q}%`); where.push(`(lower(p.brand || ' ' || p.name) LIKE $${params.length} OR p.slug LIKE $${params.length})`); }
  if (cat) { params.push(cat); where.push(`p.category = $${params.length}`); }
  if (show === "hidden") where.push(`NOT p.active`);
  if (show === "out") where.push(`p.stock = 'out'`);
  if (show === "nocost") where.push(`p.cost_price IS NULL`);
  if (show === "nophoto") where.push(`jsonb_array_length(p.images) = 0`);
  const w = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = await many<Row>(
    `SELECT p.*, coalesce((SELECT sum(oi.qty) FROM order_items oi JOIN orders o ON o.id = oi.order_id
        WHERE oi.product_id = p.id AND o.status <> 'cancelled' AND o.created_at >= now() - interval '30 days'), 0)::int AS sold30
     FROM products p ${w} ORDER BY p.sort, p.brand, p.name`,
    params
  );
  const stats = (await many<{ total: number; hidden: number; out: number; nocost: number; nophoto: number }>(
    `SELECT count(*)::int AS total, count(*) FILTER (WHERE NOT active)::int AS hidden, count(*) FILTER (WHERE stock = 'out')::int AS out,
       count(*) FILTER (WHERE cost_price IS NULL)::int AS nocost, count(*) FILTER (WHERE jsonb_array_length(images) = 0)::int AS nophoto FROM products`
  ))[0];
  const margin = (r: Row) => (r.cost_price == null ? null : Math.round(((Number(r.price) - Number(r.cost_price)) / Number(r.price)) * 100));
  const mCls = (m: number | null) => (m == null ? "text-muted" : m < 25 ? "text-warn font-semibold" : m < 40 ? "text-[#9a5b00]" : "text-success");

  return (
    <>
      <PageHead title="Товары" sub={`${rows.length} из ${stats.total}`}>
        <a download href="/api/admin/export/products" className="h-10 rounded-full bg-white px-4 text-[14px] leading-10 ring-1 ring-line hover:ring-ink/30">Выгрузить</a>
        <ImportButton />
        <Link href="/admin/products/new" className="h-10 rounded-full bg-accent px-4 text-[14px] font-semibold leading-10 text-white">+ Товар</Link>
      </PageHead>
      <div className="space-y-3 px-4 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <SearchBox placeholder="Бренд, название, slug" />
          <FilterTabs
            param="show"
            value={show}
            options={[
              { v: "all", l: "Все", n: stats.total },
              { v: "hidden", l: "Скрытые", n: stats.hidden },
              { v: "out", l: "Нет в наличии", n: stats.out },
              { v: "nocost", l: "Без себестоимости", n: stats.nocost },
              { v: "nophoto", l: "Без фото", n: stats.nophoto },
            ]}
          />
        </div>
        <FilterTabs param="cat" value={cat} options={[{ v: "", l: "Все категории" }, ...CATEGORIES.map((c) => ({ v: c.id, l: c.name.ru }))]} />

        <ul className="divide-y divide-line overflow-hidden rounded-card bg-white ring-1 ring-line">
          <li className="hidden grid-cols-[56px_1fr_120px_110px_80px_70px_150px_64px] items-center gap-3 bg-surface px-4 py-2.5 text-[12px] uppercase tracking-wide text-muted lg:grid">
            <span /><span>Товар</span><span className="text-right">Цена</span><span className="text-right">Себест.</span><span className="text-right">Маржа</span><span className="text-right">30 дн</span><span>Наличие</span><span>На сайте</span>
          </li>
          {rows.map((r) => {
            const m = margin(r);
            return (
              <li key={r.id} className={`grid grid-cols-[56px_1fr_auto] items-center gap-x-3 gap-y-2 px-4 py-3 lg:grid-cols-[56px_1fr_120px_110px_80px_70px_150px_64px] ${r.active ? "" : "bg-surface/50"}`}>
                <Link href={`/admin/products/${r.id}`} className="row-span-2 grid size-14 place-items-center overflow-hidden rounded-xl bg-surface p-1 lg:row-span-1">
                  <ProductImage p={{ images: r.images, pack: r.pack as never, color: r.color, brand: r.brand }} brand={false} />
                </Link>
                <Link href={`/admin/products/${r.id}`} className="min-w-0 hover:text-accent">
                  <span className="block truncate text-[12px] uppercase tracking-wide text-muted">{r.brand}</span>
                  <span className={`block truncate text-[14px] font-medium ${r.active ? "" : "text-muted"}`}>{r.name}</span>
                </Link>
                <span className="text-right text-[14px] font-semibold tabular">
                  {fmtSum(r.price)}
                  {r.old_price && <span className="block text-[12px] font-normal text-muted line-through">{fmtSum(r.old_price)}</span>}
                </span>
                <div className="col-span-2 col-start-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 lg:contents">
                  <span className="flex w-full min-w-0 items-center gap-1.5 text-[12px] text-muted tabular lg:contents">
                    <span className="lg:text-right lg:text-[14px]"><span className="lg:hidden">себест. </span>{r.cost_price != null ? fmtSum(r.cost_price) : "—"}</span>
                    <span className="lg:hidden">·</span>
                    <span className={`lg:text-right lg:text-[14px] ${mCls(m)}`}>{m == null ? "—" : `${m}%`}</span>
                    <span className="lg:hidden">·</span>
                    <span className="whitespace-nowrap lg:text-right lg:text-[14px]">{r.sold30}<span className="lg:hidden"> шт/30 дн</span></span>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-2 lg:contents">
                    <StockSelect id={r.id} value={r.stock} />
                    <ActiveToggle id={r.id} active={r.active} />
                  </span>
                </div>
              </li>
            );
          })}
          {!rows.length && <li className="py-10 text-center text-muted">Ничего не найдено</li>}
        </ul>
        <p className="pb-4 text-[12px] text-muted">Маржа = (цена − себестоимость) / цена, без учёта скидок по промокодам. Красным — ниже 25%.</p>
      </div>
    </>
  );
}
