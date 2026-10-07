// Загрузка товаров из Excel. ?dry=1 — только проверка и сводка, без записи.
// Если в файле есть хоть одна ошибка, ничего не применяется.
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { invalidateCatalog } from "@/server/catalog";
import { parseProductsFile } from "@/server/product-xlsx";
import { newProductId, upsertProduct } from "@/server/products";
import { adminOnly } from "@/server/xlsx";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return adminOnly(async () => {
    const dry = new URL(req.url).searchParams.get("dry") === "1";
    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Файл не получен" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "Файл больше 10 МБ" }, { status: 400 });

    const res = await parseProductsFile(await file.arrayBuffer());
    const summary = {
      total: res.total,
      create: res.rows.filter((r) => r.action === "create").length,
      update: res.rows.filter((r) => r.action === "update").length,
      errors: res.errors,
      preview: res.rows.slice(0, 50).map((r) => ({ row: r.row, slug: r.slug, action: r.action, name: `${r.data.brand} ${r.data.name}`, price: r.data.price, stock: r.data.stock, active: r.data.active })),
    };
    if (dry || res.errors.length || !res.rows.length) return NextResponse.json({ ...summary, applied: false });

    // Новым товарам выдаём id заранее, чтобы ссылки fbt между ними сработали.
    const ids = new Map<string, string>();
    res.rows.forEach((r, i) => ids.set(r.slug, r.data.id ?? newProductId(i + 1)));
    for (const r of res.rows) {
      const fbt = r.data.fbt.map((x) => (x.startsWith("new:") ? ids.get(x.slice(4)) ?? "" : x));
      await upsertProduct({ ...r.data, fbt }, ids.get(r.slug)!);
    }
    invalidateCatalog();
    revalidatePath("/admin/products");
    revalidatePath("/", "layout");
    return NextResponse.json({ ...summary, applied: true });
  });
}
