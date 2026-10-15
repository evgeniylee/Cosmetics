import Link from "next/link";
import { many } from "@/server/db";
import { getPublicCatalog } from "@/server/catalog";
import { autoRail, pickOptions, railRows } from "@/server/storefront";
import { RAIL_RULES } from "@/lib/storefront";
import { PageHead } from "../ui";
import { RailEditor } from "./rails";
import { BannerRowActions, VideoRowActions } from "./video-actions";

export const metadata = { title: "Витрина" };
export const dynamic = "force-dynamic";

export default async function StorefrontAdmin() {
  const [banners, rails, options, catalog, videos, sold] = await Promise.all([
    many<{ id: string; tone: string; bg: string; image: string | null; title: { ru: string }; active: boolean; starts: string | null; ends: string | null; state: "on" | "off" | "soon" | "ended"; views: number; clicks: number }>(
      `SELECT id, tone, bg, coalesce(image_desktop, image_mobile) AS image, title, active, views, clicks,
         to_char(starts_at AT TIME ZONE 'Asia/Tashkent', 'DD.MM') AS starts, to_char(ends_at AT TIME ZONE 'Asia/Tashkent', 'DD.MM') AS ends,
         CASE WHEN NOT active THEN 'off' WHEN starts_at > now() THEN 'soon' WHEN ends_at <= now() THEN 'ended' ELSE 'on' END AS state
       FROM banners ORDER BY sort, id`
    ),
    railRows(),
    pickOptions(),
    getPublicCatalog(),
    many<{ id: string; title: { ru: string }; poster: string | null; active: boolean; products: string[]; views: number; product_clicks: number; cart_adds: number }>(
      `SELECT id, title, poster, active, products, views, product_clicks, cart_adds FROM videos ORDER BY sort, created_at DESC`
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
      <PageHead title="Витрина" sub="Что видят на главной: баннеры, видео с товарами и продающие ленты." />
      <section className="px-4 md:px-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-[20px] font-bold">Баннеры на главной</h2>
          <Link href="/admin/storefront/banners/new" className="h-10 rounded-full bg-accent px-4 text-[14px] font-semibold leading-10 text-white">+ Баннер</Link>
        </div>
        <p className="mb-3 text-[13px] text-muted">Карусель вверху главной. Порядок — как здесь. «Клики» — нажатия на кнопку баннера, доля — от показов.</p>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((b, i) => (
            <li key={b.id} className={`overflow-hidden rounded-card bg-white ring-1 ring-line ${b.state === "on" ? "" : "opacity-70"}`}>
              <Link href={`/admin/storefront/banners/${b.id}`} className="relative block aspect-[1440/560] p-4" style={{ background: b.bg }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {b.image && <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />}
                <span className={`relative line-clamp-2 max-w-[60%] text-[17px] font-bold leading-tight ${b.tone === "dark" ? "text-white" : "text-ink"}`}>{b.title.ru}</span>
              </Link>
              <div className="p-3">
                <div className="flex flex-wrap items-center gap-2 text-[12px]">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${b.state === "on" ? "bg-[#e3f5e6] text-[#2f7a3a]" : "bg-surface text-muted"}`}>
                    {b.state === "on" ? "показывается" : b.state === "off" ? "выключен" : b.state === "soon" ? `с ${b.starts}` : "акция закончилась"}
                  </span>
                  {(b.starts || b.ends) && <span className="text-muted">{b.starts ? `с ${b.starts}` : ""}{b.ends ? ` по ${b.ends}` : ""}</span>}
                  <span className="ml-auto text-muted tabular">{b.views} показов · {b.clicks} кликов{b.views ? ` · ${((b.clicks / b.views) * 100).toFixed(1)}%` : ""}</span>
                </div>
                <BannerRowActions id={b.id} active={b.active} first={i === 0} last={i === banners.length - 1} />
              </div>
            </li>
          ))}
        </ul>
        {banners.filter((b) => b.state === "on").length === 0 && <p className="mt-3 rounded-xl bg-[#fff1d6] px-3 py-2 text-[13px] text-[#9a5b00]">Ни один баннер сейчас не показывается — на главной стоит запасной.</p>}
      </section>

      <section className="mt-10 px-4 md:px-8">
        <div className="mb-3 flex items-center gap-3">
          <h2 className="flex-1 text-[20px] font-bold">Видео с товарами</h2>
          <Link href="/admin/storefront/videos/new" className="h-10 rounded-full bg-accent px-4 text-[14px] font-semibold leading-10 text-white">+ Видео</Link>
        </div>
        <p className="mb-3 text-[13px] text-muted">Блок «Обзоры» на главной. Нажатие открывает плеер: слева описание, справа товары из видео с кнопкой «в корзину». Порядок — как здесь.</p>
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
                  <p className="truncate text-[13px] text-muted">{v.products.length} тов.{v.active ? "" : " · скрыто"}</p>
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
