"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATEGORIES } from "@/data/catalog";
import { assertCreator } from "@/server/creator-auth";
import { linkPath, newLinkId, siteOrigin } from "@/server/creators";
import { one } from "@/server/db";

const LinkInput = z.object({
  label: z.string().trim().min(1, "Подпишите ссылку").max(60),
  targetType: z.enum(["home", "picks", "category", "product"]),
  target: z.string().trim().max(120).nullable(),
});

export async function createLink(input: unknown): Promise<{ ok: true; url: string; id: string } | { ok: false; error: string }> {
  const { creator } = await assertCreator();
  if (!creator.active) return { ok: false, error: "Код выключен — ссылки сейчас не работают" };
  const p = LinkInput.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Проверьте поля" };
  const { label, targetType, target } = p.data;
  if (targetType === "product" && !(target && (await one(`SELECT id FROM products WHERE slug = $1 AND active`, [target])))) return { ok: false, error: "Выберите товар" };
  if (targetType === "category" && !CATEGORIES.some((c) => c.id === target)) return { ok: false, error: "Выберите категорию" };
  const n = await one<{ n: number }>(`SELECT count(*)::int AS n FROM creator_links WHERE creator_code = $1 AND created_at > now() - interval '1 day'`, [creator.code]);
  if ((n?.n ?? 0) >= 50) return { ok: false, error: "Не больше 50 ссылок в сутки" };
  let id = newLinkId();
  while (await one(`SELECT id FROM creator_links WHERE id = $1`, [id])) id = newLinkId();
  await one(`INSERT INTO creator_links (id, creator_code, label, target_type, target) VALUES ($1, $2, $3, $4, $5)`,
    [id, creator.code, label, targetType, targetType === "home" || targetType === "picks" ? null : target]);
  revalidatePath("/creator", "layout");
  return { ok: true, id, url: (await siteOrigin()) + linkPath(creator.code, id) };
}

export async function archiveLink(id: string, archived: boolean) {
  const { creator } = await assertCreator();
  await one(`UPDATE creator_links SET archived = $3 WHERE id = $1 AND creator_code = $2`, [id, creator.code, archived]);
  revalidatePath("/creator", "layout");
  return { ok: true as const };
}
