"use client";
import { useState, useTransition } from "react";
import { saveCustomerNote } from "../../actions";
import { Card, Toast } from "../../ui";

export function CustomerNote({ id, note }: { id: string; note: string }) {
  const [text, setText] = useState(note);
  const [saved, setSaved] = useState(note);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card>
      <label htmlFor="cnote" className="font-bold">Заметка</label>
      <p className="text-[12px] text-muted">Видят только менеджеры: предпочтения, особенности доставки</p>
      <textarea id="cnote" value={text} onChange={(e) => setText(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-line p-3 text-[14px] outline-none focus:border-accent" />
      <button type="button" disabled={pending || text === saved} onClick={() => start(async () => {
        const r = await saveCustomerNote(id, text);
        if (r.ok) setSaved(text);
        setMsg(r.ok ? r.message ?? "Сохранено" : r.error);
        setTimeout(() => setMsg(null), 2200);
      })} className="mt-2 h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-40">Сохранить</button>
      <Toast text={msg} />
    </Card>
  );
}
