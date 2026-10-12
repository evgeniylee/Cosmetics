import Link from "next/link";
import { customerStats, sourceLabel } from "@/server/crm";
import { fmtSum } from "@/lib/admin-format";
import { Card, PageHead } from "../../ui";

export const metadata = { title: "Аналитика клиентов" };
export const dynamic = "force-dynamic";

// Две серии графика: проверены на различимость, в т.ч. при дальтонизме.
const NEW = "#E4467E";
const RET = "#5B4BB7";
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-card bg-white p-4 ring-1 ring-line">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-[26px] font-bold leading-none tabular">{value}</p>
      <p className="mt-1.5 text-[12px] leading-snug text-muted">{hint}</p>
    </div>
  );
}

export default async function CustomerStats() {
  const { kpi, weeks, sources, cohorts, abandoned } = await customerStats();
  const max = Math.max(1, ...weeks.map((w) => w.new_buyers + w.returning));
  const H = 160;

  return (
    <>
      <PageHead title="Аналитика клиентов" sub="Без отменённых заказов. Покупатель — клиент хотя бы с одним заказом.">
        <Link href="/admin/customers" className="text-[14px] text-muted">← Клиенты</Link>
      </PageHead>
      <div className="space-y-4 px-4 pb-10 md:px-8">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Повторная покупка за 90 дней" value={kpi.eligible90 ? pct(kpi.second90 ?? 0, kpi.eligible90) : "—"}
            hint={kpi.eligible90 ? `Из ${kpi.eligible90} купивших впервые больше 90 дней назад. Главная цифра здоровья магазина.` : "Появится, когда первым покупателям будет 90+ дней"} />
          <Tile label="Купили больше одного раза" value={pct(kpi.repeaters, kpi.buyers)} hint={`${kpi.repeaters} из ${kpi.buyers} покупателей`} />
          <Tile label="До второго заказа" value={kpi.median_days != null ? `${kpi.median_days} дн.` : "—"} hint="Медиана: половина возвращается быстрее" />
          <Tile label="Новых покупателей за 30 дней" value={String(kpi.new30)} hint="Первый заказ за последние 30 дней" />
          <Tile label="Средний чек, 30 дней" value={kpi.aov30 ? fmtSum(kpi.aov30) : "—"} hint="Заказы за последние 30 дней" />
          <Tile label="Покупатель приносит" value={kpi.ltv ? fmtSum(kpi.ltv) : "—"} hint="Средняя сумма всех заказов на покупателя" />
          <Link href="/admin/customers?seg=abandoned" className="block">
            <Tile label="Брошенные корзины" value={abandoned.sum ? fmtSum(abandoned.sum) : "—"} hint={`Клиентов: ${abandoned.n} · открыть список →`} />
          </Link>
          <Tile label="Покупателей всего" value={String(kpi.buyers)} hint="Хотя бы один неотменённый заказ" />
        </div>

        <Card>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <h2 className="mr-auto font-bold">Покупатели по неделям</h2>
            <span className="flex items-center gap-1.5 text-[13px] text-ink/80"><span className="size-3 rounded-[3px]" style={{ background: NEW }} />Новые</span>
            <span className="flex items-center gap-1.5 text-[13px] text-ink/80"><span className="size-3 rounded-[3px]" style={{ background: RET }} />Вернувшиеся</span>
          </div>
          <div className="mt-4 flex items-end gap-1.5 border-b border-line md:gap-3" style={{ height: H + 20 }} role="img" aria-label="Новые и вернувшиеся покупатели по неделям за 12 недель">
            {weeks.map((w) => {
              const hn = Math.round((w.new_buyers / max) * H);
              const hr = Math.round((w.returning / max) * H);
              return (
                <div key={w.week} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
                  <span className="pointer-events-none absolute -top-1 left-1/2 z-10 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-white shadow-float group-hover:block">
                    Неделя с {w.week}<br />Новые: {w.new_buyers} · Вернувшиеся: {w.returning}
                  </span>
                  {hr > 0 && <div className="mx-auto w-full max-w-[36px] rounded-t-[4px]" style={{ height: hr, background: RET, marginBottom: hn > 0 ? 2 : 0 }} />}
                  {hn > 0 && <div className={`mx-auto w-full max-w-[36px] ${hr > 0 ? "" : "rounded-t-[4px]"}`} style={{ height: hn, background: NEW }} />}
                  <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-muted tabular md:text-[11px]">{w.week}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-7 text-[12px] text-muted">Наведите на столбец, чтобы увидеть числа. Неделя начинается в понедельник.</p>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card>
            <h2 className="font-bold">Откуда приходят лучшие клиенты</h2>
            <p className="text-[12px] text-muted">По первому источнику клиента. Важно не только сколько пришло, но и сколько вернулось.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[460px] text-[14px]">
                <thead><tr className="text-left text-[12px] text-muted"><th className="pb-2 font-medium">Источник</th><th className="pb-2 pl-4 text-right font-medium">Клиенты</th><th className="pb-2 pl-4 text-right font-medium">Купили</th><th className="pb-2 pl-4 text-right font-medium">Повторно</th><th className="pb-2 pl-4 text-right font-medium">Выручка</th><th className="pb-2 pl-4 text-right font-medium">На покупателя</th></tr></thead>
                <tbody className="divide-y divide-line">
                  {sources.map((s) => (
                    <tr key={s.src}>
                      <td className="py-2">{sourceLabel(s.src)}</td>
                      <td className="py-2 pl-4 text-right tabular">{s.customers}</td>
                      <td className="py-2 pl-4 text-right tabular">{s.buyers}</td>
                      <td className="py-2 pl-4 text-right tabular">{pct(s.repeaters, s.buyers)}</td>
                      <td className="py-2 pl-4 text-right tabular">{fmtSum(s.revenue)}</td>
                      <td className="py-2 pl-4 text-right tabular">{s.buyers ? fmtSum(Number(s.revenue) / s.buyers) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h2 className="font-bold">Возвращаемость по месяцам</h2>
            <p className="text-[12px] text-muted">Строка — месяц первой покупки. Ячейка — какая доля этих покупателей снова купила через 1, 2, … месяца.</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-center text-[13px]">
                <thead><tr className="text-[12px] text-muted"><th className="pb-2 text-left font-medium">Месяц</th><th className="pb-2 font-medium">Покупателей</th>{[1, 2, 3, 4, 5].map((k) => <th key={k} className="pb-2 font-medium">+{k} мес.</th>)}</tr></thead>
                <tbody>
                  {cohorts.map((c) => (
                    <tr key={c.cohort}>
                      <td className="py-1 text-left tabular">{c.cohort}</td>
                      <td className="py-1 tabular">{c.size}</td>
                      {[c.m1, c.m2, c.m3, c.m4, c.m5].map((v, i) => {
                        if (i + 1 > c.age) return <td key={i} className="py-1 text-line">·</td>;
                        const share = c.size ? v / c.size : 0;
                        return (
                          <td key={i} className="p-0.5">
                            <span className="block rounded-md py-1.5 tabular" title={`${v} из ${c.size}`}
                              style={{ background: `color-mix(in oklab, ${NEW} ${Math.round(8 + share * 72)}%, white)`, color: share > 0.45 ? "#fff" : "var(--color-ink)" }}>
                              {Math.round(share * 100)}%
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  {!cohorts.length && <tr><td colSpan={7} className="py-6 text-muted">Данных пока нет</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
