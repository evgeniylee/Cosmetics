import Link from "next/link";
import type { Metadata } from "next";
import type { Lang } from "@/data/catalog";
import { publicBrands } from "@/server/brands";
import { plural } from "@/components/BrandPage";

export const metadata: Metadata = { title: "Бренды корейской косметики" };

export default async function BrandsPage({ params }: { params: Promise<{ lang: Lang }> }) {
  const { lang } = await params;
  const ru = lang === "ru";
  const brands = await publicBrands();
  const groups = new Map<string, typeof brands>();
  for (const b of brands) {
    const l = /^[a-z]/i.test(b.name) ? b.name[0].toUpperCase() : "#";
    groups.set(l, [...(groups.get(l) ?? []), b]);
  }
  return (
    <>
      <div className="-mt-[72px] rounded-b-[32px] bg-surface pb-8 pt-[88px] md:-mt-[160px] md:rounded-b-block md:pb-12 md:pt-[170px]">
        <div className="wrap">
          <nav className="text-[13px] text-muted"><Link href={`/${lang}`}>{ru ? "Главная" : "Bosh sahifa"}</Link> / <span>{ru ? "Бренды" : "Brendlar"}</span></nav>
          <h1 className="h-section mt-3">{ru ? "Бренды" : "Brendlar"}</h1>
          <p className="mt-2 text-ink/70">{ru ? `${brands.length} ${plural(brands.length, ["корейский бренд", "корейских бренда", "корейских брендов"])}` : `${brands.length} ta koreys brendi`}</p>
          <div className="no-scrollbar mt-5 flex gap-1 overflow-x-auto">
            {[...groups.keys()].map((l) => <a key={l} href={`#l-${l}`} className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-[15px] font-semibold hover:bg-ink hover:text-white">{l}</a>)}
          </div>
        </div>
      </div>
      <div className="wrap mt-8 space-y-10">
        {[...groups.entries()].map(([l, list]) => (
          <section key={l} id={`l-${l}`} className="scroll-mt-28">
            <h2 className="text-[22px] font-bold">{l}</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
              {list.map((b) => (
                <Link key={b.slug} href={`/${lang}/brands/${b.slug}`} className="group flex min-h-36 flex-col justify-between rounded-card p-4 transition hover:-translate-y-0.5 md:min-h-44 md:p-5" style={{ background: b.color }}>
                  {b.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.logo} alt={b.name} className="h-10 w-auto max-w-full object-contain object-left" />
                  ) : (
                    <span className="text-[19px] font-bold uppercase leading-tight tracking-[0.06em] md:text-[22px]">{b.name}</span>
                  )}
                  <span>
                    {b.tagline?.[lang] && <span className="line-clamp-2 text-[13px] leading-snug text-ink/70">{b.tagline[lang]}</span>}
                    <span className="mt-1 block text-[13px] font-semibold">{b.products} {ru ? plural(b.products, ["товар", "товара", "товаров"]) : "ta mahsulot"}{b.rating ? ` · ★ ${b.rating}` : ""}</span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
