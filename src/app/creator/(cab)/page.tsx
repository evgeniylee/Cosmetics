import Link from "next/link";
import { requireCreator } from "@/server/creator-auth";
import { CLICK_WINDOW_DAYS, HOLD_DAYS, REPEAT_WINDOW_DAYS, balances, funnel, linkStats, nextPayoutDate } from "@/server/creators";
import { fmtSum } from "@/lib/admin-format";
import { many } from "@/server/db";

export const metadata = { title: "Главная" };

const day = (d: Date) => d.toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "UTC" });

export default async function CreatorHome() {
  const { creator } = await requireCreator();
  const [bal, f30, links, videos] = await Promise.all([
    balances(creator.code), funnel(30, creator.code), linkStats(creator.code, 30),
    many<{ id: string; title: { ru: string }; poster: string | null; active: boolean; views: number; product_clicks: number; cart_adds: number }>(
      `SELECT id, title, poster, active, views, product_clicks, cart_adds FROM videos WHERE creator_code = $1 ORDER BY active DESC, sort`, [creator.code]
    ),
  ]);
  const b = bal.get(creator.code) ?? { ready: 0, hold: 0, waiting: 0, clawback: 0, paid: 0, readyOrders: 0 };
  const f = f30.get(creator.code) ?? { clicks: 0, visitors: 0, orders: 0, linkOrders: 0, revenue: 0, commission: 0, newCustomers: 0 };
  const toPay = Math.max(0, b.ready - b.clawback);
  const conv = f.visitors ? ((f.linkOrders / f.visitors) * 100).toFixed(1).replace(".", ",") : "—";
  const top = links.filter((l) => !l.archived && (l.clicks || l.orders)).sort((a, z) => Number(z.commission) - Number(a.commission) || z.clicks - a.clicks).slice(0, 3);

  return (
    <main className="space-y-4 px-4 pt-4 md:px-6">
      <h1 className="text-[24px] font-bold">Привет, {creator.creator_name}</h1>

      <section className="rounded-panel bg-ink p-5 text-white">
        <p className="text-[13px] text-white/60">К выплате {day(nextPayoutDate())}</p>
        <p className="mt-1 text-[34px] font-bold leading-none tabular">{fmtSum(toPay)}</p>
        {b.clawback > 0 && <p className="mt-1 text-[12px] text-[#ffb59a]">с учётом вычета {fmtSum(b.clawback)} за отменённый после выплаты заказ</p>}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/15 pt-3 text-[12px]">
          <div><p className="text-white/60">Подтвердится</p><p className="mt-0.5 text-[15px] font-semibold tabular">{fmtSum(b.hold)}</p></div>
          <div><p className="text-white/60">Ждёт доставки</p><p className="mt-0.5 text-[15px] font-semibold tabular">{fmtSum(b.waiting)}</p></div>
          <div><p className="text-white/60">Выплачено всего</p><p className="mt-0.5 text-[15px] font-semibold tabular">{fmtSum(b.paid)}</p></div>
        </div>
      </section>

      <Link href="/creator/links?new=1" className="flex h-14 items-center justify-center gap-2 rounded-card bg-accent text-[16px] font-semibold text-white shadow-float active:scale-[.99]">
        + Создать ссылку
      </Link>

      <section className="rounded-card bg-white p-4 ring-1 ring-line">
        <h2 className="font-bold">За 30 дней</h2>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {[
            ["Переходы", String(f.visitors)],
            ["Заказы", String(f.orders)],
            ["Конверсия ссылок", conv === "—" ? conv : `${conv}%`],
            ["Новые клиенты", String(f.newCustomers)],
          ].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-surface px-1 py-2.5">
              <p className="text-[20px] font-bold tabular">{v}</p>
              <p className="text-[11px] leading-tight text-muted">{l}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-muted">Продажи по вам: <b className="text-ink tabular">{fmtSum(f.revenue)}</b> · ваш заработок <b className="text-ink tabular">{fmtSum(f.commission)}</b></p>
      </section>

      <section className="rounded-card bg-white p-4 ring-1 ring-line">
        <div className="flex items-center"><h2 className="flex-1 font-bold">Лучшие ссылки</h2><Link href="/creator/links" className="text-[14px] text-accent">Все →</Link></div>
        {top.length ? (
          <ul className="mt-2 divide-y divide-line text-[14px]">
            {top.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                <span className="text-[12px] text-muted tabular">{l.visitors} перех. · {l.orders} зак.</span>
                <span className="w-24 text-right font-semibold tabular">{fmtSum(l.commission)}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-[14px] text-muted">Создайте первую ссылку и поставьте её в сторис — здесь появится статистика.</p>}
      </section>

      {videos.length > 0 && (
        <section className="rounded-card bg-white p-4 ring-1 ring-line">
          <h2 className="font-bold">Ваши видео на сайте</h2>
          <p className="mt-0.5 text-[13px] text-muted">Блок «Обзоры креаторов» на главной. Рядом с видео — ваш промокод и товары из ролика.</p>
          <ul className="mt-3 space-y-2">
            {videos.map((v) => (
              <li key={v.id} className={`flex items-center gap-3 ${v.active ? "" : "opacity-60"}`}>
                <span className="relative aspect-[9/16] w-11 shrink-0 overflow-hidden rounded-lg bg-ink">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.poster && <img src={v.poster} alt="" className="h-full w-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{v.title.ru}{v.active ? "" : " · снято с сайта"}</p>
                  <p className="text-[12px] text-muted tabular">{v.views} просм. · {v.product_clicks} переходов на товар · {v.cart_adds} в корзину</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[12px] text-muted">Заказ засчитывается вам, если покупатель применил ваш промокод (в плеере есть кнопка «Применить»).</p>
        </section>
      )}

      <details className="rounded-card bg-white p-4 ring-1 ring-line [&_summary::-webkit-details-marker]:hidden">
        <summary className="cursor-pointer list-none font-bold">Как начисляется заработок ↓</summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[14px] text-ink/80">
          <li>Покупатель получает −{creator.percent}% по вашему коду <b>{creator.code}</b> или по любой вашей ссылке — код подставится сам.</li>
          <li>Вы получаете {creator.commission}% от суммы заказа после скидки, без доставки.</li>
          <li>Ссылка помнит вас {CLICK_WINDOW_DAYS} дней: если человек купит позже, заказ всё равно ваш. Если он введёт код другого креатора — заказ засчитается тому, кого он выбрал.</li>
          <li>Если вы привели <b>нового</b> покупателя, вам засчитываются все его заказы {REPEAT_WINDOW_DAYS} дней после первой покупки.</li>
          <li>Сумма становится доступной через {HOLD_DAYS} дней после доставки — это время на возврат. Отменённые заказы не оплачиваются.</li>
          <li>Выплаты 1, 11 и 21 числа каждого месяца.</li>
          <li>Покупки на ваш собственный номер не засчитываются.</li>
        </ul>
      </details>
    </main>
  );
}
