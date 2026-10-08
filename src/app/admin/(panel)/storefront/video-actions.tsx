"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteVideo, moveVideo } from "../actions";

export function VideoRowActions({ id, first, last }: { id: string; first: boolean; last: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const run = (p: () => Promise<unknown>) => start(async () => { await p(); router.refresh(); });
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[13px]">
      <button type="button" aria-label="Выше" disabled={first || pending} onClick={() => run(() => moveVideo(id, -1))} className="grid size-8 place-items-center rounded-lg bg-surface disabled:opacity-30">↑</button>
      <button type="button" aria-label="Ниже" disabled={last || pending} onClick={() => run(() => moveVideo(id, 1))} className="grid size-8 place-items-center rounded-lg bg-surface disabled:opacity-30">↓</button>
      <a href={`/admin/storefront/videos/${id}`} className="ml-1 h-8 rounded-full bg-ink px-3 leading-8 text-white">Изменить</a>
      {confirm
        ? <button type="button" disabled={pending} onClick={() => run(() => deleteVideo(id))} className="ml-auto font-semibold text-warn">Точно удалить?</button>
        : <button type="button" onClick={() => setConfirm(true)} className="ml-auto text-muted">Удалить</button>}
    </div>
  );
}
