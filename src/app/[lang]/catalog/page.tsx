import { Catalog } from "@/components/Catalog";

export default async function CatalogPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const params = { cat: sp.cat, skin: sp.skin, concern: sp.concern, brand: sp.brand, q: sp.q, sort: sp.sort, fav: sp.fav, creator: sp.creator };
  return <Catalog key={JSON.stringify(params)} params={params} />;
}
