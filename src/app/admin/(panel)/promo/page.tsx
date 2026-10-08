import Link from "next/link";
import { many } from "@/server/db";
import { balances, funnel, nextPayoutDate } from "@/server/creators";
import { fmtSum } from "@/lib/admin-format";
import { PageHead } from "../ui";
import { PromoList, type PromoRow } from "./editor";

export const metadata = { title: "Креаторы" };

export default async function PromoPage() {
  const base = await many<Omit<PromoRow, "stats">>(
    `SELECT code, creator_name AS "creatorName", coalesce(creator_handle, '') AS "creatorHandle", coalesce(creator_phone, '') AS "creatorPhone",
       percent, commission, active, featured, picks, photo FROM promo_codes ORDER BY active DESC, created_at`
  );
  const [f30, bal] = await Promise.all([funnel(30), balances()]);
  const rows: PromoRow[] = base.map((r) => {
    const f = f30.get(r.code);
    const b = bal.get(r.code);
    return { ...r, stats: { visitors: f?.visitors ?? 0, orders: f?.orders ?? 0, revenue: f?.revenue ?? 0, newCustomers: f?.newCustomers ?? 0, toPay: Math.max(0, (b?.ready ?? 0) - (b?.clawback ?? 0)), pending: (b?.hold ?? 0) + (b?.waiting ?? 0) } };
  }).sort((a, z) => Number(z.active) - Number(a.active) || z.stats.revenue - a.stats.revenue);
  const products = await many<{ id: string; label: string }>(`SELECT id, brand || ' ' || name AS label FROM products WHERE active ORDER BY brand, name`);
  const due = rows.reduce((a, r) => a + r.stats.toPay, 0);
  const next = nextPayoutDate().toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <PageHead title="Креаторы" sub="Цифры за 30 дней, без отменённых заказов. Выручка — после скидки, без доставки." />
      <div className="px-4 pb-3 md:px-8">
        <Link href="/admin/promo/payouts" className="flex items-center justify-between rounded-card bg-ink px-4 py-3 text-white">
          <span><span className="block text-[13px] text-white/60">К выплате {next}</span><b className="text-[18px] tabular">{fmtSum(due)}</b></span>
          <span className="text-[14px]">Ведомость →</span>
        </Link>
      </div>
      <PromoList rows={rows} products={products} />
    </>
  );
}
