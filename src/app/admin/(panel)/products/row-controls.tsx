"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { STOCK_META } from "@/lib/admin-format";
import { setProductStock, toggleProduct } from "../actions";
import { Toast } from "../ui";

function useFlash() {
  const [msg, setMsg] = useState<string | null>(null);
  return [msg, (m?: string) => { if (!m) return; setMsg(m); setTimeout(() => setMsg(null), 2200); }] as const;
}

export function ActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [on, setOn] = useState(active);
  const [pending, start] = useTransition();
  const [msg, flash] = useFlash();
  return (
    <>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? "Скрыть с сайта" : "Показать на сайте"}
        disabled={pending}
        onClick={() => { const v = !on; setOn(v); start(async () => { const r = await toggleProduct(id, v); if (!r.ok) setOn(!v); flash(r.ok ? r.message : r.error); }); }}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${on ? "bg-success" : "bg-line"}`}
      >
        <span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] ${on ? "left-[22px]" : "left-0.5"}`} />
      </button>
      <Toast text={msg} />
    </>
  );
}

export function StockSelect({ id, value }: { id: string; value: string }) {
  const [v, setV] = useState(value);
  const [pending, start] = useTransition();
  const [msg, flash] = useFlash();
  return (
    <>
      <select
        aria-label="Наличие"
        value={v}
        disabled={pending}
        onChange={(e) => { const nv = e.target.value; const old = v; setV(nv); start(async () => { const r = await setProductStock(id, nv); if (!r.ok) setV(old); flash(r.ok ? r.message : r.error); }); }}
        className={`h-8 rounded-full border-0 px-2.5 text-[13px] font-medium outline-none ${STOCK_META[v]?.cls ?? ""}`}
      >
        {Object.entries(STOCK_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
      </select>
      <Toast text={msg} />
    </>
  );
}

type Summary = {
  total: number; create: number; update: number; applied: boolean; error?: string;
  errors: { row: number; message: string }[];
  preview: { row: number; slug: string; action: "create" | "update"; name: string; price: number; stock: string; active: boolean }[];
};

export function ImportButton() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [sum, setSum] = useState<Summary | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const send = async (f: File, dry: boolean) => {
    setBusy(true);
    const fd = new FormData();
    fd.set("file", f);
    try {
      const r = await fetch(`/api/admin/import/products${dry ? "?dry=1" : ""}`, { method: "POST", body: fd });
      const j = (await r.json()) as Summary;
      setSum(r.ok ? j : { ...j, errors: [{ row: 0, message: j.error ?? "Ошибка загрузки" }], preview: [], total: 0, create: 0, update: 0, applied: false });
      if (j.applied) router.refresh();
    } catch {
      setSum({ total: 0, create: 0, update: 0, applied: false, errors: [{ row: 0, message: "Нет связи с сервером" }], preview: [] });
    }
    setBusy(false);
  };
  const close = () => { setOpen(false); setFile(null); setSum(null); };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-10 rounded-full bg-white px-4 text-[14px] ring-1 ring-line hover:ring-ink/30">Загрузить Excel</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 md:items-center" onClick={close}>
          <div role="dialog" aria-label="Загрузка товаров из Excel" className="anim-sheet max-h-[88dvh] w-full overflow-y-auto rounded-t-[24px] bg-white p-5 md:max-w-2xl md:rounded-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <h2 className="flex-1 text-[20px] font-bold">Загрузка товаров из Excel</h2>
              <button type="button" onClick={close} className="text-muted" aria-label="Закрыть">✕</button>
            </div>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-[14px] text-ink/80">
              <li><a download href="/api/admin/export/products" className="text-accent underline">Скачайте текущий каталог</a> — это и есть шаблон, подсказки во втором листе.</li>
              <li>Поправьте цены, наличие, добавьте строки с новыми товарами.</li>
              <li>Загрузите файл. Сначала покажем, что изменится, и только потом применим.</li>
            </ol>
            <input ref={input} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) { setFile(f); setSum(null); send(f, true); } }} />
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="mt-4 flex h-24 w-full flex-col items-center justify-center rounded-card border-2 border-dashed border-line text-[14px] hover:border-accent disabled:opacity-50">
              <span className="font-semibold">{file ? file.name : "Выбрать файл .xlsx"}</span>
              <span className="text-muted">{busy ? "Проверяем…" : file ? "Нажмите, чтобы выбрать другой" : "до 10 МБ"}</span>
            </button>

            {sum && (
              <div className="mt-4 space-y-3 text-[14px]">
                {sum.applied ? (
                  <p className="rounded-xl bg-[#e3f5e6] px-3 py-2.5 font-semibold text-[#2f7a3a]">Готово: создано {sum.create}, обновлено {sum.update}. Витрина уже показывает изменения.</p>
                ) : sum.errors.length ? (
                  <>
                    <p className="rounded-xl bg-[#fde8df] px-3 py-2.5 text-warn"><b>Ничего не применено.</b> Исправьте ошибки в файле и загрузите снова{sum.total ? ` (строк с ошибками: ${sum.errors.length} из ${sum.total})` : ""}.</p>
                    <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl bg-surface p-3 text-[13px]">
                      {sum.errors.map((e, i) => <li key={i}>{e.row > 0 && <b className="tabular">Строка {e.row}: </b>}{e.message}</li>)}
                    </ul>
                  </>
                ) : sum.total === 0 ? (
                  <p className="text-muted">В файле нет строк с товарами.</p>
                ) : (
                  <>
                    <p>Строк: <b>{sum.total}</b> · новых товаров: <b>{sum.create}</b> · изменится: <b>{sum.update}</b></p>
                    <ul className="max-h-56 divide-y divide-line overflow-y-auto rounded-xl ring-1 ring-line text-[13px]">
                      {sum.preview.map((p) => (
                        <li key={p.row} className="flex gap-2 px-3 py-1.5">
                          <span className={`w-16 shrink-0 font-medium ${p.action === "create" ? "text-success" : "text-muted"}`}>{p.action === "create" ? "новый" : "обновить"}</span>
                          <span className="min-w-0 flex-1 truncate">{p.name}</span>
                          <span className="tabular">{p.price.toLocaleString("ru-RU")}</span>
                          {!p.active && <span className="text-muted">скрыт</span>}
                        </li>
                      ))}
                    </ul>
                    <button type="button" disabled={busy} onClick={() => file && send(file, false)} className="h-12 w-full rounded-card bg-accent font-semibold text-white disabled:opacity-50">
                      {busy ? "Применяем…" : `Применить: ${sum.create + sum.update} товаров`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
