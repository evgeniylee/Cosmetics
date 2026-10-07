"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fmtSum } from "@/lib/admin-format";
import { payCreator } from "../../actions";
import { Card, Toast } from "../../ui";

export function CreatorActions({ code, toPay, readyOrders, clawback, hold, waiting }: { code: string; toPay: number; readyOrders: number; clawback: number; hold: number; waiting: number }) {
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Card className="space-y-3">
      <div>
        <p className="text-[13px] text-muted">К выплате сейчас</p>
        <p className="text-[26px] font-bold tabular">{fmtSum(toPay)}</p>
        <p className="text-[12px] text-muted">{readyOrders} зак.{clawback ? ` · вычет ${fmtSum(clawback)}` : ""} · ещё в ожидании {fmtSum(hold + waiting)}</p>
      </div>
      {toPay > 0 && (
        <>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Комментарий: карта, перевод…" aria-label="Комментарий к выплате" className="h-11 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
          <button type="button" disabled={pending} onClick={() => {
            if (!confirm) { setConfirm(true); return; }
            start(async () => { const r = await payCreator(code, note); setMsg(r.ok ? r.message ?? "Готово" : r.error); setConfirm(false); setNote(""); router.refresh(); setTimeout(() => setMsg(null), 2600); });
          }} className={`h-12 w-full rounded-card font-semibold text-white disabled:opacity-50 ${confirm ? "bg-warn" : "bg-accent"}`}>
            {confirm ? `Подтвердите: перевели ${fmtSum(toPay)}?` : "Отметить выплату"}
          </button>
          <p className="text-[12px] text-muted">Сначала переведите деньги, потом отметьте здесь. Креатор сразу увидит выплату в кабинете.</p>
        </>
      )}
      <Toast text={msg} />
    </Card>
  );
}
