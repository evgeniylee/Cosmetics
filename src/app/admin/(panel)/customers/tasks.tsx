"use client";
// Задачи менеджера по клиенту: «перезвонить 15.10», «предложить новый тонер».
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addCrmTask, setCrmTaskDone, setCustomerTags } from "../actions";
import { Card, Toast } from "../ui";

export function TaskCheck({ id, done }: { id: string; done: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <input type="checkbox" aria-label="Выполнено" defaultChecked={done} disabled={pending}
      onChange={(e) => { const v = e.target.checked; start(async () => { await setCrmTaskDone(id, v); router.refresh(); }); }}
      className="size-5 shrink-0 accent-[var(--color-accent)]" />
  );
}

type Task = { id: string; due: string; due_iso: string; text: string; done: boolean; overdue: boolean };

export function CustomerTasks({ customerId, tasks }: { customerId: string; tasks: Task[] }) {
  const tomorrow = new Date(Date.now() + 5 * 3600_000 + 86400_000).toISOString().slice(0, 10);
  const [text, setText] = useState("");
  const [due, setDue] = useState(tomorrow);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done).slice(0, 5);
  const presets = [["Перезвонить", ""], ["Предложить пополнить", ""], ["Поздравить с ДР", ""]] as const;
  return (
    <Card>
      <h2 className="font-bold">Задачи</h2>
      <ul className="mt-2 space-y-1.5 text-[14px]">
        {open.map((t) => (
          <li key={t.id} className="flex items-start gap-2">
            <TaskCheck id={t.id} done={false} />
            <span className={`w-11 shrink-0 tabular ${t.overdue ? "font-semibold text-warn" : "text-muted"}`}>{t.due}</span>
            <span className="min-w-0 flex-1">{t.text}</span>
          </li>
        ))}
        {done.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-muted line-through">
            <TaskCheck id={t.id} done />
            <span className="w-11 shrink-0 tabular">{t.due}</span>
            <span className="min-w-0 flex-1">{t.text}</span>
          </li>
        ))}
        {!tasks.length && <li className="text-[13px] text-muted">Задач нет</li>}
      </ul>
      <form className="mt-3 space-y-2 border-t border-line pt-3" onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await addCrmTask(customerId, due, text);
          setMsg(r.ok ? r.message ?? "Добавлено" : r.error);
          setTimeout(() => setMsg(null), 2000);
          if (r.ok) { setText(""); router.refresh(); }
        });
      }}>
        <div className="flex flex-wrap gap-1.5">
          {presets.map(([l]) => <button key={l} type="button" onClick={() => setText(l)} className="rounded-full bg-surface px-2.5 py-1 text-[12px]">{l}</button>)}
        </div>
        <input id="task-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={300} placeholder="Что сделать" className="h-10 w-full rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
        <div className="flex gap-2">
          <input type="date" aria-label="Когда" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-[14px] outline-none focus:border-accent" />
          <button type="submit" disabled={pending || !text.trim()} className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white disabled:opacity-40">Добавить</button>
        </div>
      </form>
      <Toast text={msg} />
    </Card>
  );
}

export function CustomerTags({ customerId, value, all }: { customerId: string; value: string[]; all: string[] }) {
  const [tags, setTags] = useState(value);
  const [pending, start] = useTransition();
  const toggle = (t: string) => {
    const next = tags.includes(t) ? tags.filter((x) => x !== t) : [...tags, t];
    setTags(next);
    start(async () => { await setCustomerTags(customerId, next); });
  };
  return (
    <Card>
      <h2 className="font-bold">Метки</h2>
      <p className="text-[12px] text-muted">По меткам можно фильтровать список клиентов</p>
      <div className={`mt-2 flex flex-wrap gap-1.5 ${pending ? "opacity-60" : ""}`}>
        {all.map((t) => (
          <button key={t} type="button" aria-pressed={tags.includes(t)} onClick={() => toggle(t)}
            className={`rounded-full px-3 py-1.5 text-[13px] transition ${tags.includes(t) ? "bg-ink text-white" : "bg-surface hover:bg-line"}`}>#{t}</button>
        ))}
      </div>
    </Card>
  );
}
