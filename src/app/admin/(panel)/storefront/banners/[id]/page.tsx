import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import { PageHead } from "../../../ui";
import { BannerForm, type BannerFormValue } from "./form";

export const metadata = { title: "Баннер" };
export const dynamic = "force-dynamic";

type L = { ru: string; uz: string };
const E: L = { ru: "", uz: "" };

export default async function BannerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [brands, creators] = await Promise.all([
    many<{ slug: string; name: string }>(`SELECT slug, name FROM brands WHERE active ORDER BY sort, lower(name)`),
    many<{ code: string; name: string }>(`SELECT code, creator_name AS name FROM promo_codes WHERE active ORDER BY creator_name`),
  ]);
  let value: BannerFormValue = {
    id: null, tone: "light", bg: "radial-gradient(120% 90% at 80% 20%,#ffd9e8 0%,#f7c3d8 35%,#e7b7e0 70%,#cdb8ef 100%)", imageDesktop: null, imageMobile: null,
    art: ["serum", "cream"], eyebrow: E, title: E, text: E, cta: { ru: "Смотреть", uz: "Ko'rish" }, href: "/catalog", active: true, startsAt: null, endsAt: null,
  };
  if (id !== "new") {
    const b = await one<{ id: string; tone: "light" | "dark"; bg: string; image_desktop: string | null; image_mobile: string | null; art: string[]; eyebrow: L; title: L; text: L; cta: L; href: string; active: boolean; starts: string | null; ends: string | null }>(
      `SELECT id, tone, bg, image_desktop, image_mobile, art, eyebrow, title, text, cta, href, active,
         to_char(starts_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS starts, to_char(ends_at AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM-DD') AS ends
       FROM banners WHERE id = $1`, [id]);
    if (!b) notFound();
    value = { id: b.id, tone: b.tone, bg: b.bg, imageDesktop: b.image_desktop, imageMobile: b.image_mobile, art: b.art as BannerFormValue["art"], eyebrow: b.eyebrow, title: b.title, text: b.text, cta: b.cta, href: b.href, active: b.active, startsAt: b.starts, endsAt: b.ends };
  }
  return (
    <>
      <PageHead title={value.id ? "Баннер" : "Новый баннер"} sub={<Link href="/admin/storefront" className="underline">← Витрина</Link>} />
      <BannerForm initial={value} brands={brands} creators={creators} />
    </>
  );
}
