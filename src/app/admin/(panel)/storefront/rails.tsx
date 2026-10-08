"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { L10n } from "@/data/catalog";
import { saveRail } from "../actions";
import { Card, Toast } from "../ui";
import { ProductPicker, type PickOption } from "./picker";

type Rail = { key: string; title: L10n; active: boolean; mode: "auto" | "manual"; products: string[] };
const input = "h-10 w-full rounded-lg border border-line bg-white px-2.5 text-[14px] outline-none focus:border-accent";

export function RailEditor({ rail, rule, options, autoNow }: { rail: Rail; rule: string; options: PickOption[]; autoNow: string[] }) {
  const [f, setF] = useState(rail);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const dirty = JSON.stringify(f) !== JSON.stringify(rail);
  const save = () => start(async () => {
    const r = await saveRail(f);
    setErrors(r.ok ? {} : r.fields ?? {});
    setMsg(r.ok ? r.message ?? "Сохранено" : r.error);
    setTimeout(() => setMsg(null), 2200);
    if (r.ok) router.refresh();
  });
  return (
    <Card className={`space-y-3 ${f.active ? "" : "opacity-75"}`} >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 text-[17px] font-bold">{f.title.ru || "Без названия"}</h3>
        <label className="flex items-center gap-2 text-[14px]"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} className="size-5 accent-[var(--color-accent)]" />Показывать</label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[12px] text-muted">Название<input aria-label={`Название ленты ${rail.key}`} value={f.title.ru} onChange={(e) => setF({ ...f, title: { ...f.title, ru: e.target.value } })} className={`${input} mt-0.5 ${errors["title.ru"] ? "border-warn" : ""}`} /></label>
        <label className="text-[12px] text-muted">O‘zbekcha<input value={f.title.uz} onChange={(e) => setF({ ...f, title: { ...f.title, uz: e.target.value } })} className={`${input} mt-0.5`} /></label>
      </div>
      <div className="flex w-fit rounded-full bg-surface p-1 text-[13px]">
        {(["auto", "manual"] as const).map((m) => (
          <button key={m} type="button" onClick={() => setF({ ...f, mode: m })} className={`h-8 rounded-full px-3 font-medium ${f.mode === m ? "bg-white shadow" : "text-muted"}`}>{m === "auto" ? "Авто" : "Вручную"}</button>
        ))}
      </div>
      {f.mode === "auto" ? (
        <div className="rounded-xl bg-surface p-3 text-[13px]">
          <p className="font-medium">Правило: {rule}</p>
          <p className="mt-1 text-muted">{autoNow.length ? `Сейчас ${autoNow.length}: ${autoNow.slice(0, 5).join(", ")}${autoNow.length > 5 ? "…" : ""}` : "Сейчас подходящих товаров нет — лента скрыта."}</p>
        </div>
      ) : (
        <ProductPicker options={options} value={f.products} onChange={(v) => setF({ ...f, products: v })} max={24} error={errors.products} stack />
      )}
      <button type="button" disabled={!dirty || pending} onClick={save} className="h-10 rounded-full bg-accent px-5 text-[14px] font-semibold text-white disabled:opacity-40">{pending ? "Сохраняем…" : "Сохранить"}</button>
      <Toast text={msg} />
    </Card>
  );
}
