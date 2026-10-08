import Link from "next/link";
import { many } from "@/server/db";
import { getPublicCatalog } from "@/server/catalog";
import { autoRail, pickOptions, railRows } from "@/server/storefront";
import { RAIL_RULES } from "@/lib/storefront";
import { PageHead } from "../ui";
import { RailEditor } from "./rails";
import { VideoRowActions } from "./video-actions";

export const metadata = { title: "Витрина" };
export const dynamic = "force-dynamic";

export default async function StorefrontAdmin() {
  const [rails, options, catalog, videos, sold] = await Promise.all([
    railRows(),
    pickOptions(),
    getPublicCatalog(),
    many<{ id: string; title: { ru: string }; poster: string | null; active: boolean; products: string[]; creator_name: string | null; views: number; product_clicks: number; cart_adds: number }>(
      `SELECT v.id, v.title, v.poster, v.active, v.products, p.creator_name, v.views, v.product_clicks, v.cart_adds
       FROM videos v LEFT JOIN promo_codes p ON p.code = v.creator_code ORDER BY v.sort, v.created_at DESC`
    ),
    many<{ product_id: string; n: string }>(
      `SELECT i.product_id, SUM(i.qty) AS n FROM order_items i JOIN orders o ON o.id = i.order_id WHERE o.status <> 'cancelled' AND o.created_at > now() - interval '90 days' GROUP BY 1`
    ),
  ]);
  const created = await many<{ id: string; t: string }>(`SELECT id, created_at AS t FROM products WHERE active`);
  const ctx = { sold: new Map(sold.map((r) => [r.product_id, Number(r.n)])), created: new Map(created.map((r) => [r.id, new Date(r.t).getTime()])) };
  const label = new Map(options.map((o) => [o.id, o.label]));
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <>
      <PageHead title="Витрина" sub="Что видят на главной: видео креаторов с товарами и продающие ленты." />
      <section className="px-4 md:px-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-[20px] font-bold">Видео креаторов</h2>
          <Link href="/admin/storefront/videos/new" className="h-10 rounded-full bg-accent px-4 text-[14px] font-semibold leading-10 text-white">+ Видео</Link>
        </div>
        <p className="mb-3 text-[13px] text-muted">Блок «Обзор креаторов». Нажатие на видео открывает плеер, рядом — товары из видео с кнопкой «в корзину». Порядок — как здесь.</p>
        {videos.length === 0 ? (
          <p className="rounded-card bg-white p-6 text-center text-muted ring-1 ring-line">Видео пока нет — блок на главной скрыт.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {videos.map((v, i) => (
              <li key={v.id} className={`flex gap-3 rounded-card bg-white p-3 ring-1 ring-line ${v.active ? "" : "opacity-60"}`}>
                <Link href={`/admin/storefront/videos/${v.id}`} className="relative aspect-[9/16] w-20 shrink-0 overflow-hidden rounded-xl bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.poster && <img src={v.poster} alt="" className="h-full w-full object-cover" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <Link href={`/admin/storefront/videos/${v.id}`} className="line-clamp-2 font-semibold leading-snug">{v.title.ru}</Link>
                  <p className="truncate text-[13px] text-muted">{v.creator_name ?? "без креатора"} · {v.products.length} тов.{v.active ? "" : " · скрыто"}</p>
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-muted">{v.products.map((id) => label.get(id) ?? id).join(", ")}</p>
                  <dl className="mt-auto grid grid-cols-3 gap-1 pt-2 text-[12px]">
                    <div><dt className="text-muted">Просмотры</dt><dd className="font-semibold tabular">{v.views}</dd></div>
                    <div><dt className="text-muted">На товар</dt><dd className="font-semibold tabular">{v.product_clicks} <span className="font-normal text-muted">{pct(v.product_clicks, v.views)}</span></dd></div>
                    <div><dt className="text-muted">В корзину</dt><dd className="font-semibold tabular">{v.cart_adds} <span className="font-normal text-muted">{pct(v.cart_adds, v.views)}</span></dd></div>
                  </dl>
                  <VideoRowActions id={v.id} first={i === 0} last={i === videos.length - 1} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 px-4 pb-10 md:px-8">
        <h2 className="text-[20px] font-bold">Ленты на главной</h2>
        <p className="mb-3 mt-1 text-[13px] text-muted">«Авто» собирает товары само по правилу (без товаров «нет в наличии»), «Вручную» — ваши товары в вашем порядке. Пустая лента на сайте не показывается.</p>
        <div className="grid gap-3 xl:grid-cols-2">
          {rails.map((r) => (
            <RailEditor key={r.key} rail={r} rule={RAIL_RULES[r.key]} options={options}
              autoNow={autoRail(r.key, catalog.products, ctx).map((id) => label.get(id) ?? id)} />
          ))}
        </div>
      </section>
    </>
  );
}
