"use client";
import { useState, useTransition } from "react";
import { ORDER_STATUSES, STATUS_META } from "@/lib/admin-format";
import { saveOrderNote, setOrderPaid, setOrderStatus } from "../../actions";
import { Card, Toast } from "../../ui";

export function OrderControls({ id, status, paid, note }: { id: string; status: string; paid: boolean; note: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [text, setText] = useState(note);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const flash = (m?: string) => { if (!m) return; setMsg(m); setTimeout(() => setMsg(null), 2200); };

  const go = (s: string) => {
    if (s === "cancelled" && !confirmCancel) { setConfirmCancel(true); return; }
    setConfirmCancel(false);
    start(async () => { const r = await setOrderStatus(id, s); flash(r.ok ? r.message : r.error); });
  };

  // Следующий логичный шаг — крупной кнопкой.
  const next: Record<string, string> = { new: "confirmed", needs_call: "confirmed", confirmed: "shipped", shipped: "delivered" };
  const nextLabel: Record<string, string> = { confirmed: "Подтвердить", shipped: "Отправить курьеру", delivered: "Доставлен" };

  return (
    <Card className="space-y-4">
      <div>
        <p className="text-[13px] text-muted">Статус</p>
        <p className={`mt-1 inline-block rounded-full px-3 py-1 text-[14px] font-semibold ${STATUS_META[status as keyof typeof STATUS_META].cls}`}>{STATUS_META[status as keyof typeof STATUS_META].label}</p>
      </div>
      {next[status] && (
        <button type="button" disabled={pending} onClick={() => go(next[status])} className="h-12 w-full rounded-card bg-accent font-semibold text-white transition active:scale-[.98] disabled:opacity-50">
          {nextLabel[next[status]]}
        </button>
      )}
      <div className="flex flex-wrap gap-1.5">
        {ORDER_STATUSES.filter((s) => s !== status).map((s) => (
          <button key={s} type="button" disabled={pending} onClick={() => go(s)} className={`rounded-full px-3 py-1.5 text-[13px] ring-1 transition disabled:opacity-50 ${s === "cancelled" && confirmCancel ? "bg-warn text-white ring-warn" : "ring-line hover:ring-ink/30"}`}>
            {s === "cancelled" && confirmCancel ? "Точно отменить?" : STATUS_META[s].label}
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2.5 border-t border-line pt-4 text-[14px]">
        <input id="paid" type="checkbox" defaultChecked={paid} disabled={pending} onChange={(e) => start(async () => { const r = await setOrderPaid(id, e.target.checked); flash(r.ok ? r.message : r.error); })} className="size-5 accent-[var(--color-accent)]" />
        Оплата получена
      </label>
      <div className="border-t border-line pt-4">
        <label htmlFor="note" className="text-[13px] text-muted">Заметка менеджера (клиент её не видит)</label>
        <textarea id="note" value={text} onChange={(e) => setText(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-line p-3 text-[14px] outline-none focus:border-accent" />
        <button type="button" disabled={pending || text === note} onClick={() => start(async () => { const r = await saveOrderNote(id, text); flash(r.ok ? r.message : r.error); })} className="mt-2 h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-40">
          Сохранить заметку
        </button>
      </div>
      <Toast text={msg} />
    </Card>
  );
}
