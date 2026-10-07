import { requireCreator } from "@/server/creator-auth";
import { linkPath, linkStats, siteOrigin } from "@/server/creators";
import { many } from "@/server/db";
import { CATEGORIES } from "@/data/catalog";
import { LinkMaker, LinkRow } from "./ui";

export const metadata = { title: "Ссылки" };

export default async function LinksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { creator } = await requireCreator();
  const [links, products, origin] = await Promise.all([
    linkStats(creator.code),
    many<{ slug: string; label: string }>(`SELECT slug, brand || ' ' || name AS label FROM products WHERE active ORDER BY brand, name`),
    siteOrigin(),
  ]);
  const name = (t: string, v: string | null) =>
    t === "home" ? "Главная" : t === "picks" ? "Мой набор" : t === "category" ? CATEGORIES.find((c) => c.id === v)?.name.ru ?? v : products.find((p) => p.slug === v)?.label ?? v;

  return (
    <main className="space-y-4 px-4 pt-4 md:px-6">
      <h1 className="text-[24px] font-bold">Ссылки</h1>
      <LinkMaker open={!!sp.new} products={products} categories={CATEGORIES.map((c) => ({ id: c.id, label: c.name.ru }))} hasPicks={(creator.picks ?? []).length > 0} percent={creator.percent} />
      <section className="rounded-card bg-white p-4 ring-1 ring-line">
        <p className="text-[13px] text-muted">Общая ссылка (на главную) и ваш код</p>
        <LinkRow url={origin + linkPath(creator.code)} />
        <p className="mt-2 text-[13px] text-muted">Код для голоса и подписи к видео: <b className="text-ink">{creator.code}</b></p>
      </section>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.id} className={`rounded-card bg-white p-4 ring-1 ring-line ${l.archived ? "opacity-60" : ""}`}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{l.label}</p>
                <p className="truncate text-[13px] text-muted">→ {name(l.target_type, l.target)}</p>
              </div>
              <span className="text-right text-[13px] tabular">
                <b className="text-[15px]">{Math.round(Number(l.commission)).toLocaleString("ru-RU")} сум</b>
                <span className="block text-muted">{l.visitors} перех. · {l.orders} зак.</span>
              </span>
            </div>
            <LinkRow url={origin + linkPath(creator.code, l.id)} id={l.id} archived={l.archived} />
          </li>
        ))}
        {!links.length && <li className="py-6 text-center text-[14px] text-muted">Пока нет ссылок. Создайте отдельную ссылку под каждую сторис или ролик — так будет видно, какой контент продаёт.</li>}
      </ul>
    </main>
  );
}
