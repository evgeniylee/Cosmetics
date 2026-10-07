"use client";
import { useState } from "react";
import { CITIES } from "@/lib/shop";
import type { AddressInput } from "@/lib/api";
import { useI18n } from "./I18n";

const inputCls = "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none focus:border-accent";

export function AddressForm({ initial, onSave, onCancel, busy }: { initial: AddressInput; onSave: (a: AddressInput) => void; onCancel?: () => void; busy?: boolean }) {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const [a, setA] = useState<AddressInput>(initial);
  const [err, setErr] = useState(false);
  const presets = ru ? ["Дом", "Работа"] : ["Uy", "Ish"];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button key={p} type="button" onClick={() => setA({ ...a, label: a.label === p ? null : p })} className={`rounded-full px-3.5 py-2 text-[14px] ${a.label === p ? "bg-ink text-white" : "bg-surface"}`}>{p}</button>
        ))}
        <input aria-label={ru ? "Своё название" : "O'z nomi"} value={a.label && !presets.includes(a.label) ? a.label : ""} onChange={(e) => setA({ ...a, label: e.target.value || null })} placeholder={ru ? "Своё: «Мама»" : "O'zingiz: «Onam»"} maxLength={30} className="h-9 min-w-0 flex-1 rounded-full border border-line px-3 text-[14px] outline-none focus:border-accent" />
      </div>
      <select id="addr-city" aria-label={ru ? "Город" : "Shahar"} value={a.city} onChange={(e) => setA({ ...a, city: e.target.value })} className={inputCls}>
        {CITIES.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
      </select>
      <input id="addr-address" aria-label={ru ? "Адрес" : "Manzil"} value={a.address} onChange={(e) => { setA({ ...a, address: e.target.value }); setErr(false); }} placeholder={ru ? "Улица, дом, квартира" : "Ko'cha, uy, xonadon"} className={inputCls} />
      {err && <p className="text-[12px] text-warn">{ru ? "Укажите адрес" : "Manzilni kiriting"}</p>}
      <input id="addr-comment" aria-label={ru ? "Комментарий" : "Izoh"} value={a.comment ?? ""} onChange={(e) => setA({ ...a, comment: e.target.value })} placeholder={ru ? "Подъезд, ориентир, домофон" : "Kirish, mo'ljal"} className={inputCls} />
      <label className="flex items-center gap-2.5 text-[14px]">
        <input type="checkbox" checked={!!a.isDefault} onChange={(e) => setA({ ...a, isDefault: e.target.checked })} className="size-5 accent-[var(--color-accent)]" />
        {ru ? "Основной адрес" : "Asosiy manzil"}
      </label>
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => (a.address.trim().length < 3 ? setErr(true) : onSave(a))} className="h-12 flex-1 rounded-card bg-accent font-semibold text-white disabled:opacity-50">{ru ? "Сохранить" : "Saqlash"}</button>
        {onCancel && <button type="button" onClick={onCancel} className="h-12 rounded-card bg-surface px-5">{ru ? "Отмена" : "Bekor"}</button>}
      </div>
    </div>
  );
}

