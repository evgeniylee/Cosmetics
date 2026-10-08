// Запись товара в базу: общая для формы в админке и импорта из Excel.
import "server-only";
import { one } from "./db";
import type { ProductInputT } from "./product-schema";
import { brandSlug } from "@/lib/slug";

export const newProductId = (n = 0) => `p${Date.now().toString(36)}${n ? n.toString(36) : ""}`;

export async function upsertProduct(p: ProductInputT, id: string) {
  // У объёмов цена товара = самая низкая цена варианта (для сортировки и «от …»).
  if (p.variantKind === "volume" && p.variants.length) {
    const live = p.variants.filter((v) => v.price);
    const min = live.sort((a, b) => a.price! - b.price!)[0];
    if (min) p = { ...p, price: min.price!, oldPrice: min.oldPrice ?? null, costPrice: min.costPrice ?? p.costPrice };
  }
  const vals = [id, p.slug, p.brand, p.name, p.category, p.skin, p.concerns, p.volume, p.unit, p.price, p.oldPrice || null, p.costPrice ?? null, p.stock, p.active,
    p.badge || null, p.rating, p.reviews, p.daysSupply, p.color, p.pack, JSON.stringify(p.images), p.fbt.filter((x) => x && x !== id), JSON.stringify(p.content), p.sort];
  await one(
    `INSERT INTO products (id, slug, brand, name, category, skin, concerns, volume, unit, price, old_price, cost_price, stock, active,
       badge, rating, reviews, days_supply, color, pack, images, fbt, content, sort)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
     ON CONFLICT (id) DO UPDATE SET slug=$2, brand=$3, name=$4, category=$5, skin=$6, concerns=$7, volume=$8, unit=$9, price=$10, old_price=$11,
       cost_price=$12, stock=$13, active=$14, badge=$15, rating=$16, reviews=$17, days_supply=$18, color=$19, pack=$20, images=$21, fbt=$22,
       content=$23, sort=$24, updated_at=now()`,
    vals
  );
  await saveVariants(id, p);
  // Новый бренд в товаре — сразу заводим ему страницу.
  await one(`INSERT INTO brands (slug, name, country) VALUES ($1, $2, '{"ru":"Южная Корея","uz":"Janubiy Koreya"}') ON CONFLICT DO NOTHING`, [brandSlug(p.brand), p.brand]);
}

async function saveVariants(productId: string, p: ProductInputT) {
  await one(`UPDATE products SET variant_kind = $2 WHERE id = $1`, [productId, p.variantKind || null]);
  const list = p.variantKind ? p.variants : [];
  const ids = list.map((v, i) => v.id || `v${Date.now().toString(36)}${i.toString(36)}`);
  await one(`DELETE FROM product_variants WHERE product_id = $1 AND NOT (id = ANY($2::text[]))`, [productId, ids]);
  for (const [i, v] of list.entries()) {
    await one(
      `INSERT INTO product_variants (id, product_id, name, hex, volume, price, old_price, cost_price, images, stock, sku, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (id) DO UPDATE SET name=$3, hex=$4, volume=$5, price=$6, old_price=$7, cost_price=$8, images=$9, stock=$10, sku=$11, sort=$12`,
      [ids[i], productId, JSON.stringify({ ru: v.name.ru, uz: v.name.uz || v.name.ru }), p.variantKind === "shade" ? v.hex ?? null : null,
        p.variantKind === "volume" ? v.volume ?? null : null, p.variantKind === "volume" ? v.price ?? null : null,
        p.variantKind === "volume" ? v.oldPrice || null : null, v.costPrice ?? null, JSON.stringify(v.images), v.stock, v.sku || null, i]
    );
  }
}
