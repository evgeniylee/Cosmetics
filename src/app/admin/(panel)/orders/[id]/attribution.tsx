"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { reassignOrder } from "../../actions";
import { Toast } from "../../ui";

/** Ручная привязка заказа к креатору — для спорных случаев («клиентка пришла от меня»). Причина пишется в историю. */
export function AttributionControl({ id, current, creators, locked }: { id: string; current: string | null; creators: { code: string; name: string }[]; locked: boolean }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState(current ?? "");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  if (locked) return <p className="mt-2 text-[12px] text-muted">Комиссия выплачена — привязку изменить нельзя.</p>;
  if (!open) return <button type="button" onClick={() => setOpen(true)} className="mt-2 text-[13px] text-muted underline">Изменить привязку</button>;
  return (
    <div className="mt-3 space-y-2 border-t border-line pt-3">
      <select value={code} onChange={(e) => setCode(e.target.value)} aria-label="Креатор" className="h-10 w-full rounded-xl border border-line bg-white px-3 text-[14px]">
        <option value="">Без креатора</option>
        {creators.map((c) => <option key={c.code} value={c.code}>{c.name} · {c.code}</option>)}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина, например: клиентка прислала скрин сторис" aria-label="Причина" className="h-10 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
      <button type="button" disabled={pending || (code || null) === current || reason.trim().length < 3}
        onClick={() => start(async () => { const r = await reassignOrder(id, code || null, reason); setMsg(r.ok ? r.message ?? "Готово" : r.error); if (r.ok) { setOpen(false); setReason(""); router.refresh(); } setTimeout(() => setMsg(null), 2400); })}
        className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-40">Сохранить</button>
      <Toast text={msg} />
    </div>
  );
}
