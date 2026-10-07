import { many } from "@/server/db";
import type { ProductRow } from "@/server/catalog";
import { productsWorkbook } from "@/server/product-xlsx";
import { adminOnly, xlsxResponse } from "@/server/xlsx";

export const dynamic = "force-dynamic";

export async function GET() {
  return adminOnly(async () => {
    const rows = await many<ProductRow>(`SELECT * FROM products ORDER BY sort, brand, name`);
    return xlsxResponse(await productsWorkbook(rows), "nabi-products");
  });
}
