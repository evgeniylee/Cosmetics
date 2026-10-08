import Link from "next/link";
import { many } from "@/server/db";
import { PageHead } from "../ui";

export const metadata = { title: "Бренды" };

export default async function BrandsAdmin() {
  const rows = await many<{ slug: string; name: string; color: string; hero_image: string | null; logo: string | null; story: unknown; tagline: unknown; faq: unknown[]; active: boolean; products: number; live: number }>(
    `SELECT b.slug, b.name, b.color, b.hero_image, b.logo, b.story, b.tagline, b.faq, b.active,
       (SELECT count(*)::int FROM products p WHERE p.brand = b.name) AS products,
       (SELECT count(*)::int FROM products p WHERE p.brand = b.name AND p.active) AS live
     FROM brands b ORDER BY b.sort, lower(b.name)`
  );
  const mark = (ok: boolean, label: string) => <span className={`rounded-full px-2 py-0.5 text-[12px] ${ok ? "bg-[#e3f5e6] text-[#2f7a3a]" : "bg-surface text-muted"}`}>{ok ? "✓" : "—"} {label}</span>;
  return (
    <>
      <PageHead title="Бренды" sub="Страница бренда появляется на сайте автоматически, как только у бренда есть товары. Здесь — оформление и тексты." />
      <ul className="mx-4 divide-y divide-line overflow-hidden rounded-card bg-white ring-1 ring-line md:mx-8">
        {rows.map((b) => (
          <li key={b.slug}>
            <Link href={`/admin/brands/${b.slug}`} className={`flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-surface/60 ${b.active ? "" : "opacity-60"}`}>
              <span className="size-10 shrink-0 rounded-xl ring-1 ring-line" style={{ background: b.color }} />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{b.name}</span>
                <span className="text-[12px] text-muted">{b.live} из {b.products} товаров на сайте{b.active ? "" : " · страница скрыта"}</span>
              </span>
              <span className="flex flex-wrap gap-1.5">{mark(!!b.hero_image, "баннер")}{mark(!!b.logo, "логотип")}{mark(!!b.tagline && !!b.story, "тексты")}{mark(b.faq.length > 0, "вопросы")}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
