import Link from "next/link";
import { many } from "@/server/db";
import { balances, nextPayoutDate } from "@/server/creators";
import { fmtDate, fmtPhone, fmtSum } from "@/lib/admin-format";
import { Card, PageHead } from "../../ui";

export const metadata = { title: "Выплаты креаторам" };

export default async function PayoutsPage() {
  const creators = await many<{ code: string; creator_name: string; creator_phone: string | null }>(`SELECT code, creator_name, creator_phone FROM promo_codes ORDER BY creator_name`);
  const bal = await balances();
  const due = creators.map((c) => ({ ...c, b: bal.get(c.code) })).filter((c) => c.b && c.b.ready - c.b.clawback > 0);
  const history = await many<{ id: string; creator_code: string; amount: string; orders_count: number; created_at: string; note: string | null; paid_by: string | null }>(
    `SELECT * FROM creator_payouts ORDER BY created_at DESC LIMIT 100`);
  const total = due.reduce((a, c) => a + c.b!.ready - c.b!.clawback, 0);
  const next = nextPayoutDate().toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <PageHead title="Выплаты креаторам" sub={`Ближайшая дата — ${next}. Выплачиваем только заказы, доставленные больше 7 дней назад.`}>
        <a download href="/api/admin/export/payouts" className="h-10 rounded-full bg-white px-4 text-[14px] leading-10 ring-1 ring-line hover:ring-ink/30">Ведомость в Excel</a>
        <Link href="/admin/promo" className="text-[14px] text-muted">← Креаторы</Link>
      </PageHead>
      <div className="space-y-4 px-4 md:px-8">
        <Card>
          <div className="flex items-baseline"><h2 className="flex-1 font-bold">К выплате</h2><b className="text-[20px] tabular">{fmtSum(total)}</b></div>
          <ul className="mt-2 divide-y divide-line text-[14px]">
            {due.map((c) => (
              <li key={c.code}>
                <Link href={`/admin/promo/${c.code}`} className="flex items-center gap-3 py-3 hover:text-accent">
                  <span className="min-w-0 flex-1"><b>{c.creator_name}</b> · {c.code}<span className="block text-[12px] text-muted tabular">{c.creator_phone ? fmtPhone(c.creator_phone) : "телефон не указан"} · {c.b!.readyOrders} зак.{c.b!.clawback ? ` · вычет ${fmtSum(c.b!.clawback)}` : ""}</span></span>
                  <b className="tabular">{fmtSum(c.b!.ready - c.b!.clawback)}</b>
                  <span className="text-accent">Выплатить →</span>
                </Link>
              </li>
            ))}
            {!due.length && <li className="py-4 text-muted">Сейчас выплачивать некому</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="font-bold">История выплат</h2>
          <ul className="mt-2 divide-y divide-line text-[14px]">
            {history.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="w-24 tabular text-muted">{fmtDate(p.created_at, false)}</span>
                <span className="w-28 font-semibold">{p.creator_code}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{p.orders_count} зак.{p.note ? ` · ${p.note}` : ""}{p.paid_by ? ` · ${fmtPhone(p.paid_by)}` : ""}</span>
                <b className="tabular">{fmtSum(p.amount)}</b>
              </li>
            ))}
            {!history.length && <li className="py-4 text-muted">Пока пусто</li>}
          </ul>
        </Card>
      </div>
    </>
  );
}
