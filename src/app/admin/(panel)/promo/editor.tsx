"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fmtSum } from "@/lib/admin-format";
import { savePromo } from "../actions";
import { Card, Toast } from "../ui";

export type PromoRow = {
  code: string; creatorName: string; creatorHandle: string; creatorPhone: string; percent: number; commission: number; active: boolean; featured: boolean; picks: string[];
  stats: { visitors: number; orders: number; revenue: number; newCustomers: number; toPay: number; pending: number };
};
export type Form = Omit<PromoRow, "stats"> & { isNew: boolean };

const input = "h-11 w-full rounded-xl border border-line bg-white px-3 text-[15px] outline-none focus:border-accent";

export function PromoList({ rows, products }: { rows: PromoRow[]; products: { id: string; label: string }[] }) {
  const [edit, setEdit] = useState<Form | null>(null);
  const blank: Form = { code: "", creatorName: "", creatorHandle: "", creatorPhone: "", percent: 10, commission: 7, active: true, featured: false, picks: [], isNew: true };
  return (
    <div className="space-y-3 px-4 md:px-8">
      <button type="button" onClick={() => setEdit(blank)} className="h-11 rounded-full bg-accent px-5 font-semibold text-white">+ Новый промокод</button>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.code} className={r.active ? "" : "opacity-60"}>
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[20px] font-bold tracking-wide">{r.code}</p>
                <p className="truncate text-[14px] text-muted">{r.creatorName}{r.creatorHandle ? ` · ${r.creatorHandle}` : ""}</p>
              </div>
              <span className="rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-semibold text-accent">−{r.percent}%</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-[12px]">
              {!r.active && <span className="rounded-full bg-surface px-2 py-0.5">выключен</span>}
              {r.featured && <span className="rounded-full bg-ink px-2 py-0.5 text-white">на главной</span>}
              <span className="rounded-full bg-surface px-2 py-0.5">комиссия {r.commission}%</span>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[13px]">
              <div><dt className="text-muted">Переходы</dt><dd className="font-semibold tabular">{r.stats.visitors}</dd></div>
              <div><dt className="text-muted">Заказы</dt><dd className="font-semibold tabular">{r.stats.orders}</dd></div>
              <div><dt className="text-muted">Новые клиенты</dt><dd className={`font-semibold tabular ${r.stats.orders >= 5 && r.stats.newCustomers / r.stats.orders < 0.3 ? "text-warn" : ""}`}>{r.stats.newCustomers}</dd></div>
              <div className="col-span-2"><dt className="text-muted">Выручка</dt><dd className="font-semibold tabular">{fmtSum(r.stats.revenue)}</dd></div>
              <div><dt className="text-muted">К выплате</dt><dd className="font-semibold tabular">{fmtSum(r.stats.toPay)}</dd></div>
            </dl>
            {!r.creatorPhone && <p className="mt-2 text-[12px] text-[#9a5b00]">Нет телефона — креатор не сможет войти в кабинет</p>}
            <div className="mt-3 flex gap-2">
              <a href={`/admin/promo/${r.code}`} className="h-9 rounded-full bg-ink px-4 text-[14px] leading-9 text-white">Открыть</a>
              <button type="button" onClick={() => setEdit({ ...strip(r), isNew: false })} className="h-9 rounded-full bg-surface px-4 text-[14px]">Изменить</button>
            </div>
          </Card>
        ))}
      </div>
      {!rows.length && <p className="py-10 text-center text-muted">Промокодов пока нет</p>}
      {edit && <Editor key={edit.code || "new"} initial={edit} products={products} onClose={() => setEdit(null)} />}
    </div>
  );
}

const strip = (r: PromoRow): Omit<PromoRow, "stats"> => {
  const { stats, ...rest } = r;
  void stats;
  return rest;
};

export function Editor({ initial, products, onClose }: { initial: Form; products: { id: string; label: string }[]; onClose: () => void }) {
  const [f, setF] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const margin = f.percent + f.commission;

  const submit = () => start(async () => {
    const r = await savePromo(f);
    if (!r.ok) { setErrors(r.fields ?? {}); setMsg(r.error); setTimeout(() => setMsg(null), 2400); return; }
    router.refresh();
    onClose();
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={onClose}>
      <form role="dialog" aria-label="Промокод" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); submit(); }}
        className="anim-sheet max-h-[90dvh] w-full space-y-3 overflow-y-auto rounded-t-[24px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] md:max-w-lg md:rounded-card">
        <div className="flex items-center"><h2 className="flex-1 text-[20px] font-bold">{f.isNew ? "Новый промокод" : f.code}</h2><button type="button" onClick={onClose} aria-label="Закрыть" className="text-muted">✕</button></div>
        {f.isNew && (
          <label className="block"><span className="text-[13px] text-muted">Код</span>
            <input className={`${input} mt-1 uppercase tracking-wide`} value={f.code} onChange={(e) => set("code", e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} placeholder="MADINA" />
            {errors.code && <span className="text-[12px] text-warn">{errors.code}</span>}
          </label>
        )}
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="text-[13px] text-muted">Имя креатора</span><input className={`${input} mt-1`} value={f.creatorName} onChange={(e) => set("creatorName", e.target.value)} />{errors.creatorName && <span className="text-[12px] text-warn">{errors.creatorName}</span>}</label>
          <label className="col-span-2 block"><span className="text-[13px] text-muted">Телефон креатора — для входа в кабинет</span><input className={`${input} mt-1`} inputMode="tel" value={f.creatorPhone} onChange={(e) => set("creatorPhone", e.target.value)} placeholder="+998 90 123 45 67" />{errors.creatorPhone && <span className="text-[12px] text-warn">{errors.creatorPhone}</span>}</label>
          <label className="block"><span className="text-[13px] text-muted">Instagram / Telegram</span><input className={`${input} mt-1`} value={f.creatorHandle} onChange={(e) => set("creatorHandle", e.target.value)} placeholder="@nick" /></label>
          <label className="block"><span className="text-[13px] text-muted">Скидка покупателю, %</span><input className={`${input} mt-1`} inputMode="numeric" value={f.percent} onChange={(e) => set("percent", Number(e.target.value) || 0)} />{errors.percent && <span className="text-[12px] text-warn">{errors.percent}</span>}</label>
          <label className="block"><span className="text-[13px] text-muted">Комиссия креатору, %</span><input className={`${input} mt-1`} inputMode="numeric" value={f.commission} onChange={(e) => set("commission", Number(e.target.value) || 0)} /></label>
        </div>
        <p className={`rounded-xl px-3 py-2 text-[13px] ${margin > 25 ? "bg-[#fde8df] text-warn" : "bg-surface text-muted"}`}>
          С каждого заказа по коду уходит {margin}% выручки (скидка + комиссия).{margin > 25 ? " Проверьте, что маржа товаров это выдерживает." : ""}
        </p>
        <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="size-5 accent-[var(--color-accent)]" />Код работает</label>
        <label className="flex items-center gap-3 text-[15px]"><input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="size-5 accent-[var(--color-accent)]" />Показывать подборку на главной (один креатор)</label>
        <div>
          <p className="text-[13px] text-muted">Подборка креатора, до 8 товаров</p>
          <div className="mt-1 max-h-48 space-y-1 overflow-y-auto rounded-xl p-2 ring-1 ring-line">
            {products.map((p) => {
              const on = f.picks.includes(p.id);
              return (
                <label key={p.id} className="flex items-center gap-2 text-[14px]">
                  <input type="checkbox" checked={on} disabled={!on && f.picks.length >= 8}
                    onChange={() => set("picks", on ? f.picks.filter((x) => x !== p.id) : [...f.picks, p.id])} className="size-4 accent-[var(--color-accent)]" />
                  {p.label}
                </label>
              );
            })}
          </div>
        </div>
        <button type="submit" disabled={pending} className="h-12 w-full rounded-card bg-accent font-semibold text-white disabled:opacity-50">{pending ? "Сохраняем…" : "Сохранить"}</button>
        <Toast text={msg} />
      </form>
    </div>
  );
}
