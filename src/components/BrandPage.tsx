// Баннер и история бренда. Серверные компоненты: текст сразу в HTML, хорошо для поиска.
import Link from "next/link";
import type { Lang, Product } from "@/data/catalog";
import type { BrandRow } from "@/server/brands";
import { ProductImage } from "./ProductVisual";

export const plural = (n: number, ru: [string, string, string]) => {
  const m10 = n % 10, m100 = n % 100;
  return ru[m10 === 1 && m100 !== 11 ? 0 : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? 1 : 2];
};

export function BrandHero({ brand: b, lang, count, rating, reviews, showcase }: { brand: BrandRow; lang: Lang; count: number; rating: number | null; reviews: number; showcase: Product[] }) {
  const ru = lang === "ru";
  const photo = !!b.hero_image;
  const chips = [
    ru ? `${count} ${plural(count, ["товар", "товара", "товаров"])}` : `${count} ta mahsulot`,
    b.country?.[lang],
    rating ? `★ ${rating.toFixed(1)} · ${reviews.toLocaleString("ru-RU")} ${ru ? plural(reviews, ["отзыв", "отзыва", "отзывов"]) : "sharh"}` : null,
  ].filter(Boolean) as string[];

  return (
    <section
      className="relative -mt-[72px] overflow-hidden rounded-b-[32px] md:-mt-[160px] md:rounded-b-block"
      style={{ background: photo ? "#f4f1ee" : `radial-gradient(120% 140% at 85% 30%, #fff 0%, ${b.color} 55%, ${b.color} 100%)` }}
    >
      {photo && (
        <>
          <picture>
            {b.hero_image_mobile && <source media="(max-width: 767px)" srcSet={b.hero_image_mobile} />}

            <img src={b.hero_image!} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </picture>
          <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/30 to-transparent md:bg-gradient-to-r md:from-white/85 md:via-white/40" />
        </>
      )}

      <div className="wrap relative grid min-h-[420px] items-end gap-4 pb-6 pt-[100px] md:min-h-[560px] md:grid-cols-[1fr_minmax(0,46%)] md:pb-14 md:pt-[190px]">
        <div className="min-w-0">
          <nav className="text-[13px] text-ink/60">
            <Link href={`/${lang}`}>{ru ? "Главная" : "Bosh sahifa"}</Link> / <Link href={`/${lang}/brands`}>{ru ? "Бренды" : "Brendlar"}</Link> / <span className="text-ink">{b.name}</span>
          </nav>
          {b.logo ? (
            <h1 className="mt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.logo} alt={b.name} className="h-14 w-auto max-w-[80%] object-contain object-left md:h-24" />
            </h1>
          ) : (
            <h1 className="mt-3 text-[44px] font-bold leading-[0.95] tracking-[-0.02em] md:text-[84px]">{b.name}</h1>
          )}
          {b.tagline?.[lang] && <p className="mt-3 max-w-[480px] text-[16px] leading-snug text-ink/80 md:mt-4 md:text-[20px]">{b.tagline[lang]}</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((c) => <span key={c} className="rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-medium backdrop-blur md:text-[14px]">{c}</span>)}
          </div>
        </div>

        {/* Без фото бренда — витрина из его хитов */}
        {!photo && showcase.length > 0 && (
          <div className="relative flex h-36 items-end justify-center gap-2 md:h-[340px] md:gap-4" aria-hidden>
            {showcase.map((p, i) => (
              <div
                key={p.id}
                className="float aspect-square drop-shadow-[0_24px_30px_rgba(17,17,17,.12)]"
                style={{ width: i === 1 ? "38%" : "30%", marginBottom: i === 1 ? "8%" : 0, ["--r" as string]: `${[-7, 0, 6][i]}deg`, animationDelay: `${i * 0.8}s` }}
              >
                {/* У нарисованной упаковки большие поля — увеличиваем; настоящие фото показываем как есть */}
                <div className={`h-full w-full ${p.images?.length ? "" : "scale-[1.9]"}`}><ProductImage p={p} brand={false} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/** «О бренде» и «Вопросы и ответы»: абзацы через пустую строку, «## » — подзаголовок. */
export function BrandStory({ brand: b, lang }: { brand: BrandRow; lang: Lang }) {
  const ru = lang === "ru";
  const story = b.story?.[lang] || b.story?.ru;
  const faq = b.faq.filter((f) => f.q[lang] || f.q.ru);
  if (!story && !faq.length) return null;
  return (
    <section className="wrap mt-14 grid gap-10 md:mt-24 md:grid-cols-[1fr_1fr] md:gap-16">
      {story && (
        <div>
          <h2 className="text-[26px] font-bold md:text-[34px]">{ru ? `О бренде ${b.name}` : `${b.name} brendi haqida`}</h2>
          <div className="mt-4 space-y-3 text-[16px] leading-relaxed text-ink/80">
            {story.split(/\n{2,}/).map((block, i) =>
              block.startsWith("## ") ? (
                <div key={i}>
                  <h3 className="pt-2 text-[18px] font-bold text-ink">{block.slice(3).split("\n")[0]}</h3>
                  {block.includes("\n") && <p className="mt-2">{block.slice(block.indexOf("\n") + 1)}</p>}
                </div>
              ) : (
                <p key={i}>{block}</p>
              ),
            )}
          </div>
        </div>
      )}
      {faq.length > 0 && (
        <div>
          <h2 className="text-[26px] font-bold md:text-[34px]">{ru ? "Вопросы и ответы" : "Savol-javoblar"}</h2>
          <div className="mt-4 divide-y divide-line border-y border-line">
            {faq.map((f, i) => (
              <details key={i} className="group py-4 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-start justify-between gap-4 text-[16px] font-semibold">
                  {f.q[lang] || f.q.ru}
                  <span className="mt-0.5 text-[20px] leading-none text-accent transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/75">{f.a[lang] || f.a.ru}</p>
              </details>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
