import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import type { ProductRow, VariantRow } from "@/server/catalog";
import type { ProductInputT } from "@/server/product-schema";
import { PageHead } from "../../ui";
import { ProductForm } from "./form";

export const metadata = { title: "Товар" };

const EMPTY = { ru: "", uz: "" };

function toInput(r: ProductRow | null, vrows: VariantRow[] = []): ProductInputT {
  if (!r)
    return {
      slug: "", brand: "", name: "", category: "serum", skin: [], concerns: [], volume: 50, unit: "ml", price: 0, oldPrice: null, costPrice: null,
      stock: "in_stock", active: false, badge: "", rating: 0, reviews: 0, daysSupply: 60, color: "#EADFD3", pack: "bottle", images: [], fbt: [], sort: 1000, variantKind: "", variants: [],
      content: { type: EMPTY, desc: EMPTY, why: EMPTY, howTo: EMPTY, ingredients: [], rank: null, reviewSummary: null },
    };
  const c = r.content ?? {};
  return {
    id: r.id, slug: r.slug, brand: r.brand, name: r.name, category: r.category, skin: r.skin ?? [], concerns: r.concerns ?? [], volume: Number(r.volume),
    unit: r.unit as ProductInputT["unit"], price: Number(r.price), oldPrice: r.old_price ? Number(r.old_price) : null,
    costPrice: r.cost_price != null ? Number(r.cost_price) : null, stock: r.stock as ProductInputT["stock"], active: r.active,
    badge: (r.badge ?? "") as ProductInputT["badge"], rating: Number(r.rating), reviews: r.reviews, daysSupply: r.days_supply, color: r.color, pack: r.pack,
    images: r.images ?? [], fbt: r.fbt ?? [], sort: r.sort,
    variantKind: (r.variant_kind ?? "") as ProductInputT["variantKind"],
    variants: vrows.map((v) => ({
      id: v.id, name: { ru: v.name.ru ?? "", uz: v.name.uz ?? "" }, hex: v.hex, volume: v.volume != null ? Number(v.volume) : null,
      price: v.price != null ? Number(v.price) : null, oldPrice: v.old_price != null ? Number(v.old_price) : null, costPrice: v.cost_price != null ? Number(v.cost_price) : null,
      images: v.images ?? [], stock: v.stock as "in_stock", sku: v.sku,
    })),
    content: {
      type: c.type ?? EMPTY, desc: c.desc ?? EMPTY, why: c.why ?? EMPTY, howTo: c.howTo ?? EMPTY, ingredients: c.ingredients ?? [],
      rank: c.rank ?? null, reviewSummary: c.reviewSummary ?? null,
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const row = isNew ? null : await one<ProductRow>(`SELECT * FROM products WHERE id = $1`, [id]);
  if (!isNew && !row) notFound();
  const vrows = isNew ? [] : await many<VariantRow>(`SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort, id`, [id]);
  const options = await many<{ id: string; label: string }>(`SELECT id, brand || ' ' || name AS label FROM products WHERE id <> $1 ORDER BY brand, name`, [id]);
  const brands = (await many<{ brand: string }>(`SELECT DISTINCT brand FROM products ORDER BY brand`)).map((b) => b.brand);

  return (
    <>
      <PageHead title={isNew ? "Новый товар" : `${row!.brand} ${row!.name}`} sub={isNew ? "Новый товар сохраняется скрытым — включите показ, когда всё заполните" : undefined}>
        {!isNew && row!.active && <a href={`/ru/p/${row!.slug}`} target="_blank" rel="noreferrer" className="text-[14px] text-accent">Открыть на сайте ↗</a>}
        <Link href="/admin/products" className="text-[14px] text-muted">← Все товары</Link>
      </PageHead>
      <ProductForm key={row ? `${row.id}:${row.updated_at}` : "new"} initial={toInput(row ?? null, vrows)} options={options} brands={brands} />
    </>
  );
}
