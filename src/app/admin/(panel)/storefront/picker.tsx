"use client";
// Выбор товаров по порядку: поиск слева/сверху, выбранные — списком со стрелками.
import { useMemo, useState } from "react";
import { fmtSum } from "@/lib/admin-format";

export type PickOption = { id: string; label: string; image: string | null; color: string; price: number; stock: string; active: boolean };

export function ProductPicker({ options, value, onChange, max, error, stack = false }: { options: PickOption[]; value: string[]; onChange: (v: string[]) => void; max: number; error?: string; stack?: boolean }) {
  const [q, setQ] = useState("");
  const byId = useMemo(() => new Map(options.map((o) => [o.id, o])), [options]);
  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options.filter((o) => o.active && !value.includes(o.id) && (!s || o.label.toLowerCase().includes(s))).slice(0, 30);
  }, [q, options, value]);
  const move = (i: number, d: number) => {
    const a = [...value];
    const j = i + d;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    onChange(a);
  };
  const Thumb = ({ o }: { o?: PickOption }) => (
    // eslint-disable-next-line @next/next/no-img-element
    o?.image ? <img src={o.image} alt="" className="size-10 shrink-0 rounded-lg bg-surface object-contain" /> : <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface"><span className="h-6 w-3.5 rounded-[4px]" style={{ background: o?.color ?? "#ddd" }} /></span>
  );
  return (
    <div className={`grid gap-3 ${stack ? "" : "md:grid-cols-2"}`}>
      <div>
        <p className="mb-1 text-[13px] text-muted">Выбрано {value.length} из {max}</p>
        {value.length === 0 && <p className={`rounded-xl p-3 text-[13px] ${error ? "bg-[#fde8df] text-warn" : "bg-surface text-muted"}`}>{error ?? "Найдите товары справа и нажмите «+»"}</p>}
        <ol className="space-y-1">
          {value.map((id, i) => {
            const o = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-2 rounded-xl bg-surface/70 p-1.5 pr-1 ring-1 ring-line">
                <span className="w-5 text-center text-[12px] text-muted tabular">{i + 1}</span>
                <Thumb o={o} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] leading-tight">{o?.label ?? id}</span>
                  {o && (o.stock === "out" || !o.active) && <span className="text-[11px] text-warn">{!o.active ? "скрыт с сайта" : "нет в наличии"}</span>}
                </span>
                <button type="button" aria-label="Выше" disabled={i === 0} onClick={() => move(i, -1)} className="grid size-8 place-items-center rounded-lg bg-white text-[12px] disabled:opacity-30">↑</button>
                <button type="button" aria-label="Ниже" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="grid size-8 place-items-center rounded-lg bg-white text-[12px] disabled:opacity-30">↓</button>
                <button type="button" aria-label="Убрать" onClick={() => onChange(value.filter((x) => x !== id))} className="grid size-8 place-items-center rounded-lg bg-white text-warn">✕</button>
              </li>
            );
          })}
        </ol>
      </div>
      <div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск: бренд или название" aria-label="Поиск товара"
          className="h-10 w-full rounded-full border border-line bg-white px-3.5 text-[14px] outline-none focus:border-accent" />
        <ul className="mt-2 max-h-72 space-y-1 overflow-y-auto">
          {found.map((o) => (
            <li key={o.id}>
              <button type="button" disabled={value.length >= max} onClick={() => onChange([...value, o.id])} className="flex w-full items-center gap-2 rounded-xl p-1.5 text-left hover:bg-surface disabled:opacity-40">
                <Thumb o={o} />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[13px]">{o.label}</span>
                  <span className="text-[12px] text-muted tabular">{fmtSum(o.price)}{o.stock === "out" ? " · нет в наличии" : ""}</span>
                </span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[18px] text-accent">+</span>
              </button>
            </li>
          ))}
          {!found.length && <li className="p-3 text-[13px] text-muted">Ничего не найдено</li>}
        </ul>
      </div>
    </div>
  );
}
