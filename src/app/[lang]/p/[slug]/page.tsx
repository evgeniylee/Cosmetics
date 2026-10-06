import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCTS, getProduct } from "@/data/catalog";
import { LANGS, isLang } from "@/lib/i18n";
import { ProductDetail } from "@/components/ProductDetail";

export function generateStaticParams() {
  return LANGS.flatMap((lang) => PRODUCTS.map((p) => ({ lang, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }): Promise<Metadata> {
  const { lang, slug } = await params;
  const p = getProduct(slug);
  if (!p || !isLang(lang)) return {};
  return { title: `${p.brand} ${p.name}`, description: p.desc[lang] };
}

export default async function ProductPage({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  return <ProductDetail p={p} />;
}
