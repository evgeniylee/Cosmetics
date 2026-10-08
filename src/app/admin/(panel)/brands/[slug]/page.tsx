import Link from "next/link";
import { notFound } from "next/navigation";
import { brandBySlug } from "@/server/brands";
import { PageHead } from "../../ui";
import { BrandForm } from "./form";

export const metadata = { title: "Бренд" };
const E = { ru: "", uz: "" };

export default async function BrandEdit({ params }: { params: Promise<{ slug: string }> }) {
  const b = await brandBySlug((await params).slug);
  if (!b) notFound();
  return (
    <>
      <PageHead title={b.name} sub="Название берётся из товаров: чтобы переименовать бренд, поменяйте его в товарах.">
        <a href={`/ru/brands/${b.slug}`} target="_blank" rel="noreferrer" className="text-[14px] text-accent">Открыть на сайте ↗</a>
        <Link href="/admin/brands" className="text-[14px] text-muted">← Все бренды</Link>
      </PageHead>
      <BrandForm
        initial={{
          slug: b.slug, country: b.country ?? E, tagline: b.tagline ?? E, story: b.story ?? E, faq: b.faq ?? [], color: b.color,
          heroImage: b.hero_image, heroImageMobile: b.hero_image_mobile, logo: b.logo, active: b.active, sort: b.sort,
        }}
        name={b.name}
      />
    </>
  );
}
