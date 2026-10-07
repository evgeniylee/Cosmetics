import { requireCreator } from "@/server/creator-auth";
import { COMMISSION_STATE, STATE_LABEL } from "@/server/creators";
import { many } from "@/server/db";
import { fmtSum } from "@/lib/admin-format";

export const metadata = { title: "Заказы" };

// Без имён, телефонов и адресов: только то, что нужно для расчёта заработка.
type Row = { number: string; created_at: string; base: string; commission: string; state: string; available_at: string | null; attribution: string; new_customer: boolean; label: string | null; items: number };

const STATE_CLS: Record<string, string> = {
  waiting_delivery: "bg-surface text-muted", hold: "bg-[#fff1d6] text-[#9a5b00]", ready: "bg-[#e3f5e6] text-[#2f7a3a]",
  paid: "bg-ink text-white", void: "bg-surface text-muted line-through", clawback: "bg-[#fde8df] text-warn", clawed: "bg-surface text-muted",
};
const date = (d: string, time = false) => new Date(d).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) });

export default async function CreatorOrders() {
  const { creator } = await requireCreator();
  const rows = await many<Row>(
    `SELECT o.number, o.created_at, (o.subtotal - o.discount) AS base, o.commission, ${COMMISSION_STATE} AS state, o.commission_available_at AS available_at,
       o.attribution, o.new_customer, l.label, (SELECT coalesce(sum(qty), 0)::int FROM order_items WHERE order_id = o.id) AS items
     FROM orders o LEFT JOIN creator_links l ON l.id = o.link_id
     WHERE o.creator_code = $1 ORDER BY o.created_at DESC LIMIT 200`,
    [creator.code]
  );
  const source = (r: Row) => (r.attribution === "repeat" ? "повторная покупка вашего клиента" : r.label ? `по ссылке «${r.label}»` : r.attribution === "link" ? "по ссылке" : r.attribution === "manual" ? "назначен менеджером" : "по коду");

  return (
    <main className="space-y-3 px-4 pt-4 md:px-6">
      <h1 className="text-[24px] font-bold">Заказы</h1>
      <p className="text-[13px] text-muted">Данные покупателей скрыты. Сумма — после скидки, без доставки.</p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.number} className="rounded-card bg-white p-4 ring-1 ring-line">
            <div className="flex items-center gap-2">
              <span className="font-semibold tabular">{r.number}</span>
              {r.new_customer && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">новый клиент</span>}
              <span className={`ml-auto text-[15px] font-bold tabular ${r.state === "clawback" || r.state === "clawed" ? "text-warn" : r.state === "void" ? "text-muted" : ""}`}>{r.state === "clawback" || r.state === "clawed" ? "−" : r.state === "void" ? "" : "+"}{fmtSum(r.state === "void" ? 0 : r.commission)}</span>
            </div>
            <p className="mt-0.5 text-[13px] text-muted">{date(r.created_at, true)} · {r.items} шт · {fmtSum(r.base)} · {source(r)}</p>
            <p className="mt-2"><span className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${STATE_CLS[r.state] ?? ""}`}>
              {r.state === "hold" && r.available_at ? `подтвердится ${date(r.available_at)}` : r.state === "clawback" ? "заказ вернули после выплаты — вычтем из следующей" : STATE_LABEL[r.state] ?? r.state}
            </span></p>
          </li>
        ))}
        {!rows.length && <li className="py-10 text-center text-[14px] text-muted">Заказов пока нет</li>}
      </ul>
    </main>
  );
}
