import Link from "next/link";
import { notFound } from "next/navigation";
import { one } from "@/server/db";
import { pickOptions } from "@/server/storefront";
import { PageHead } from "../../../ui";
import { VideoForm, type VideoFormValue } from "./form";

export const metadata = { title: "Видео" };
export const dynamic = "force-dynamic";

export default async function VideoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const options = await pickOptions();
  let value: VideoFormValue = { id: null, title: { ru: "", uz: "" }, description: { ru: "", uz: "" }, src: "", poster: null, products: [], active: true };
  if (id !== "new") {
    const v = await one<{ id: string; title: { ru: string; uz: string }; description: { ru?: string; uz?: string }; src: string; poster: string | null; products: string[]; active: boolean }>(
      `SELECT id, title, description, src, poster, products, active FROM videos WHERE id = $1`, [id]
    );
    if (!v) notFound();
    value = { id: v.id, title: v.title, description: { ru: v.description?.ru ?? "", uz: v.description?.uz ?? "" }, src: v.src, poster: v.poster, products: v.products ?? [], active: v.active };
  }
  return (
    <>
      <PageHead title={value.id ? "Видео" : "Новое видео"} sub={<Link href="/admin/storefront" className="underline">← Витрина</Link>} />
      <VideoForm initial={value} options={options} />
    </>
  );
}
