import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLang } from "@/lib/i18n";
import { getPublicCatalog } from "@/server/catalog";
import { ProductDetail } from "@/components/ProductDetail";

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = (await getPublicCatalog()).products.find((x) => x.slug === slug);
  if (!p || !isLang(lang)) return {};
  return { title: `${p.brand} ${p.name}`, description: p.desc[lang], openGraph: p.images?.[0] ? { images: [p.images[0]] } : undefined };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getPublicCatalog()).products.find((x) => x.slug === slug);
  if (!p) notFound();
  return <ProductDetail p={p} />;
}
