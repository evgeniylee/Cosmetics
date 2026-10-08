import { Catalog } from "@/components/Catalog";
import { one } from "@/server/db";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const params = { cat: sp.cat, skin: sp.skin, concern: sp.concern, brand: sp.brand, q: sp.q, sort: sp.sort, fav: sp.fav, creator: sp.creator, sale: sp.sale };
  // Подборка креатора: /catalog?creator=CODE (сюда ведут ссылки «Мой набор»).
  const c = sp.creator
    ? await one<{ code: string; creator_name: string; picks: string[] }>(`SELECT code, creator_name, picks FROM promo_codes WHERE code = $1 AND active`, [sp.creator.toUpperCase()])
    : null;
  const picks = c ? { code: c.code, name: c.creator_name, ids: c.picks ?? [] } : null;
  return <Catalog key={JSON.stringify(params)} params={params} picks={picks} />;
}
