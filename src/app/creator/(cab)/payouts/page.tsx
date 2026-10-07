import { requireCreator } from "@/server/creator-auth";
import { HOLD_DAYS, balances, nextPayoutDate } from "@/server/creators";
import { many } from "@/server/db";
import { fmtSum } from "@/lib/admin-format";

export const metadata = { title: "Выплаты" };

export default async function CreatorPayouts() {
  const { creator } = await requireCreator();
  const b = (await balances(creator.code)).get(creator.code);
  const toPay = Math.max(0, (b?.ready ?? 0) - (b?.clawback ?? 0));
  const rows = await many<{ id: string; amount: string; orders_count: number; created_at: string; note: string | null }>(
    `SELECT id, amount, orders_count, created_at, note FROM creator_payouts WHERE creator_code = $1 ORDER BY created_at DESC`, [creator.code]);
  const next = nextPayoutDate().toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <main className="space-y-4 px-4 pt-4 md:px-6">
      <h1 className="text-[24px] font-bold">Выплаты</h1>
      <section className="rounded-card bg-white p-4 ring-1 ring-line">
        <p className="text-[13px] text-muted">Следующая выплата — {next}</p>
        <p className="mt-1 text-[28px] font-bold tabular">{fmtSum(toPay)}</p>
        <p className="mt-1 text-[13px] text-muted">Ещё {fmtSum((b?.hold ?? 0) + (b?.waiting ?? 0))} станут доступны через {HOLD_DAYS} дней после доставки заказов.</p>
      </section>
      <section className="rounded-card bg-white p-4 ring-1 ring-line">
        <h2 className="font-bold">История</h2>
        <ul className="mt-2 divide-y divide-line text-[14px]">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="tabular text-muted">{new Date(r.created_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Tashkent" })}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{r.orders_count} зак.{r.note ? ` · ${r.note}` : ""}</span>
              <span className="font-semibold tabular">{fmtSum(r.amount)}</span>
            </li>
          ))}
          {!rows.length && <li className="py-4 text-muted">Выплат пока не было</li>}
        </ul>
      </section>
      <p className="px-1 text-[13px] text-muted">Выплаты 1, 11 и 21 числа. Реквизиты и вопросы по выплатам — через менеджера NABI.</p>
    </main>
  );
}
