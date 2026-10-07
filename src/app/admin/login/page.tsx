"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";

const digits = (v: string) => v.replace(/\D/g, "").replace(/^998/, "").slice(0, 9);
const fmt = (d: string) => `+998 ${[d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ")}`.trim();

function Login() {
  const router = useRouter();
  const denied = useSearchParams().get("denied");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(denied ? "У этого номера нет доступа к админке. Номер нужно добавить в ADMIN_PHONES." : null);
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const d = digits(phone);

  const request = async () => {
    setBusy(true); setErr(null);
    const r = await fetch("/api/auth/otp/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: d }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setErr(j.error === "too_many_requests" ? "Слишком много попыток, подождите 15 минут." : "Не удалось отправить код.");
    if (j.channel === "none") return setErr("На этот номер нельзя отправить код в Telegram.");
    setRequestId(j.requestId); setDemo(j.demoCode ?? null);
    setTimeout(() => codeRef.current?.focus(), 50);
  };

  const verify = async (v: string) => {
    setCode(v);
    if (v.length < 6 || !requestId) return;
    setBusy(true); setErr(null);
    const r = await fetch("/api/auth/otp/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, code: v }) });
    setBusy(false);
    if (!r.ok) { setCode(""); return setErr("Неверный код."); }
    router.replace("/admin");
    router.refresh();
  };

  return (
    <main className="grid min-h-[100dvh] place-items-center p-4">
      <div className="w-full max-w-[380px] rounded-panel bg-white p-6 shadow-float">
        <p className="text-[26px] font-bold tracking-[0.04em]">NABI<span className="text-accent">.</span> <span className="text-[15px] font-medium tracking-normal text-muted">админка</span></p>
        <p className="mt-1 text-[14px] text-muted">Вход по коду из Telegram</p>
        {!requestId ? (
          <div className="mt-6 space-y-3">
            <label htmlFor="phone" className="text-[13px] font-medium text-ink/70">Номер телефона</label>
            <input id="phone" type="tel" inputMode="tel" value={fmt(d)} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && d.length === 9 && request()} className="h-12 w-full rounded-xl border border-line px-3.5 text-[16px] tabular outline-none focus:border-accent" />
            <button type="button" disabled={d.length !== 9 || busy} onClick={request} className="h-12 w-full rounded-card bg-accent font-semibold text-white disabled:opacity-40">Получить код</button>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            <p className="text-[14px]">Код отправлен в Telegram на {fmt(d)}</p>
            {demo && <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px]">Демо-режим: код {demo}</p>}
            <input ref={codeRef} id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy} onChange={(e) => verify(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" className="h-12 w-full rounded-xl border border-line text-center text-[22px] font-bold tracking-[0.5em] tabular outline-none focus:border-accent" />
            <button type="button" onClick={() => { setRequestId(null); setCode(""); }} className="text-[14px] text-muted underline">Изменить номер</button>
          </div>
        )}
        {err && <p role="alert" className="mt-3 text-[13px] text-warn">{err}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}
