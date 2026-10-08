import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Catalog } from "@/components/Catalog";
import { BrandHero, BrandStory } from "@/components/BrandPage";
import { brandBySlug, publicBrands } from "@/server/brands";
import { getPublicCatalog } from "@/server/catalog";
import type { Lang } from "@/data/catalog";

type P = { params: Promise<{ lang: Lang; slug: string }>; searchParams: Promise<Record<string, string | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { lang, slug } = await params;
  const b = await brandBySlug(slug);
  if (!b) return {};
  const ru = lang === "ru";
  return {
    title: ru ? `${b.name} — корейская косметика купить в Ташкенте` : `${b.name} — koreys kosmetikasi Toshkentda`,
    description: b.tagline?.[lang] || (ru ? `Оригинальная косметика ${b.name} с доставкой по Узбекистану` : `${b.name} original kosmetikasi`),
  };
}

export default async function BrandPage({ params, searchParams }: P) {
  const { lang, slug } = await params;
  const sp = await searchParams;
  const b = await brandBySlug(slug);
  if (!b || !b.active) notFound();
  const { products } = await getPublicCatalog();
  const own = products.filter((p) => p.brand === b.name);
  if (!own.length) notFound();
  const others = (await publicBrands()).filter((x) => x.slug !== b.slug).slice(0, 12);
  const rated = own.filter((p) => p.reviews >= 3);
  const rating = rated.length ? rated.reduce((a, p) => a + p.rating, 0) / rated.length : null;
  const reviews = own.reduce((a, p) => a + p.reviews, 0);
  const params2 = { cat: sp.cat, skin: sp.skin, concern: sp.concern, q: sp.q, sort: sp.sort };
  const ru = lang === "ru";

  const jsonLd = [
    { "@context": "https://schema.org", "@type": "Brand", name: b.name, description: b.tagline?.[lang] ?? undefined, logo: b.logo ?? undefined },
    ...(b.faq.length ? [{ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: b.faq.map((f) => ({ "@type": "Question", name: f.q[lang], acceptedAnswer: { "@type": "Answer", text: f.a[lang] } })) }] : []),
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Catalog
        key={JSON.stringify(params2)}
        params={params2}
        scopeBrand={b.name}
        hero={<BrandHero brand={b} lang={lang} count={own.length} rating={rating} reviews={reviews} showcase={own.slice().sort((x, y) => y.reviews - x.reviews).slice(0, 3)} />}
      />
      <BrandStory brand={b} lang={lang} />
      {others.length > 0 && (
        <section className="wrap mt-14 md:mt-20">
          <h2 className="text-[22px] font-bold md:text-[28px]">{ru ? "Другие бренды" : "Boshqa brendlar"}</h2>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
            {others.map((o) => (
              <Link key={o.slug} href={`/${lang}/brands/${o.slug}`} className="shrink-0 rounded-full px-4 py-2.5 text-[14px] font-semibold uppercase tracking-[0.08em] transition hover:brightness-95" style={{ background: o.color }}>
                {o.name}
              </Link>
            ))}
            <Link href={`/${lang}/brands`} className="shrink-0 rounded-full bg-ink px-4 py-2.5 text-[14px] font-semibold text-white">{ru ? "Все бренды →" : "Barcha brendlar →"}</Link>
          </div>
        </section>
      )}
    </>
  );
}
