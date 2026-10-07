"use client";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { archiveLink, createLink } from "../actions";

type Opt = { id: string; label: string };
type Target = "product" | "category" | "picks" | "home";

const input = "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none focus:border-accent";

function useCopy() {
  const [done, setDone] = useState(false);
  return [done, async (text: string) => {
    try { await navigator.clipboard.writeText(text); } catch {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1600);
  }] as const;
}

function Qr({ url }: { url: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => { QRCode.toDataURL(url, { margin: 1, width: 520, color: { dark: "#111111", light: "#ffffff" } }).then(setSrc); }, [url]);
  if (!src) return <div className="mx-auto mt-3 size-44 animate-pulse rounded-xl bg-surface" />;
  return (
    <div className="mt-3 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="QR-код ссылки" className="mx-auto size-44 rounded-xl ring-1 ring-line" />
      <a href={src} download="nabi-qr.png" className="mt-2 inline-block text-[14px] text-accent">Скачать QR</a>
    </div>
  );
}

export function LinkRow({ url, id, archived }: { url: string; id?: string; archived?: boolean }) {
  const [copied, copy] = useCopy();
  const [qr, setQr] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-xl bg-surface px-3 py-2.5 text-left text-[13px] [direction:rtl]" title={url}>{url.replace(/^https?:\/\//, "")}</code>
        <button type="button" onClick={() => copy(url)} className={`h-10 shrink-0 rounded-full px-4 text-[14px] font-semibold ${copied ? "bg-success text-white" : "bg-ink text-white"}`}>{copied ? "✓" : "Копировать"}</button>
      </div>
      <div className="mt-1.5 flex gap-4 text-[13px]">
        <button type="button" onClick={() => setQr((v) => !v)} className="text-muted underline">{qr ? "Скрыть QR" : "QR-код"}</button>
        {id && (
          <button type="button" disabled={pending} onClick={() => start(async () => { await archiveLink(id, !archived); router.refresh(); })} className="text-muted underline">
            {archived ? "Вернуть" : "В архив"}
          </button>
        )}
      </div>
      {qr && <Qr url={url} />}
    </div>
  );
}

export function LinkMaker({ open: initialOpen, products, categories, hasPicks, percent }: { open: boolean; products: { slug: string; label: string }[]; categories: Opt[]; hasPicks: boolean; percent: number }) {
  const [open, setOpen] = useState(initialOpen);
  const [type, setType] = useState<Target>("product");
  const [q, setQ] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, copy] = useCopy();
  const router = useRouter();
  const story = `−${percent}% на всё в NABI по моей ссылке 👇 Скидка применится сама.`;

  const found = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? products.filter((p) => p.label.toLowerCase().includes(s)) : products).slice(0, 8);
  }, [q, products]);
  const picked = type === "product" ? products.find((p) => p.slug === target)?.label : type === "category" ? categories.find((c) => c.id === target)?.label : null;

  const reset = () => { setMade(null); setTarget(null); setQ(""); setLabel(""); setErr(null); };
  const submit = () => start(async () => {
    setErr(null);
    const r = await createLink({ label, targetType: type, target });
    if (!r.ok) return setErr(r.error);
    setMade(r.url);
    router.refresh();
  });

  if (!open)
    return <button type="button" onClick={() => setOpen(true)} className="h-14 w-full rounded-card bg-accent text-[16px] font-semibold text-white shadow-float">+ Создать ссылку</button>;

  if (made)
    return (
      <section className="anim-fade rounded-card bg-white p-4 ring-2 ring-accent">
        <p className="font-bold">Ссылка готова 🎉</p>
        <p className="mt-0.5 text-[13px] text-muted">{label}</p>
        <LinkRow url={made} />
        <div className="mt-3 rounded-xl bg-surface p-3 text-[14px]">
          <p className="text-[12px] text-muted">Текст для сторис</p>
          <p className="mt-1">{story}</p>
          <button type="button" onClick={() => copy(`${story}\n${made}`)} className="mt-2 text-[13px] font-semibold text-accent">{copied ? "Скопировано ✓" : "Скопировать текст со ссылкой"}</button>
        </div>
        <button type="button" onClick={reset} className="mt-3 h-11 w-full rounded-card bg-ink font-semibold text-white">Создать ещё</button>
      </section>
    );

  return (
    <section className="space-y-3 rounded-card bg-white p-4 ring-1 ring-line">
      <div className="flex items-center"><h2 className="flex-1 font-bold">Новая ссылка</h2><button type="button" onClick={() => setOpen(false)} className="text-muted" aria-label="Закрыть">✕</button></div>
      <div>
        <p className="mb-1.5 text-[13px] text-muted">Куда ведёт</p>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-surface p-1 text-[13px]">
          {([["product", "Товар"], ["category", "Категория"], ["picks", "Мой набор"], ["home", "Главная"]] as const).map(([v, l]) => (
            <button key={v} type="button" disabled={v === "picks" && !hasPicks} onClick={() => { setType(v); setTarget(null); }}
              className={`h-10 rounded-lg font-medium disabled:opacity-40 ${type === v ? "bg-white shadow" : "text-muted"}`}>{l}</button>
          ))}
        </div>
        {!hasPicks && type !== "picks" && <p className="mt-1 text-[12px] text-muted">«Мой набор» появится, когда менеджер добавит вашу подборку.</p>}
      </div>

      {type === "product" && (
        picked ? (
          <div className="flex items-center gap-2 rounded-xl bg-accent-soft px-3 py-2.5 text-[14px]">
            <span className="min-w-0 flex-1 truncate font-medium">{picked}</span>
            <button type="button" onClick={() => setTarget(null)} className="text-accent">Изменить</button>
          </div>
        ) : (
          <div>
            <input className={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Найти товар: тонер, Anua, SPF…" aria-label="Поиск товара" />
            <ul className="mt-1 max-h-64 divide-y divide-line overflow-y-auto rounded-xl ring-1 ring-line">
              {found.map((p) => (
                <li key={p.slug}><button type="button" onClick={() => { setTarget(p.slug); if (!label) setLabel(p.label.split(" ").slice(0, 3).join(" ")); }} className="w-full px-3 py-2.5 text-left text-[14px] hover:bg-surface">{p.label}</button></li>
              ))}
              {!found.length && <li className="px-3 py-3 text-[14px] text-muted">Ничего не нашли</li>}
            </ul>
          </div>
        )
      )}
      {type === "category" && (
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c.id} type="button" onClick={() => { setTarget(c.id); if (!label) setLabel(c.label); }} className={`rounded-full px-3.5 py-2 text-[14px] ${target === c.id ? "bg-ink text-white" : "bg-surface"}`}>{c.label}</button>
          ))}
        </div>
      )}

      <label className="block">
        <span className="text-[13px] text-muted">Подпись — только для вас, чтобы отличать ссылки</span>
        <input className={`${input} mt-1`} value={label} maxLength={60} onChange={(e) => setLabel(e.target.value)} placeholder="Например: reels тонер 07.10" />
      </label>
      {err && <p role="alert" className="text-[13px] text-warn">{err}</p>}
      <button type="button" disabled={pending || !label.trim() || ((type === "product" || type === "category") && !target)} onClick={submit}
        className="h-12 w-full rounded-card bg-accent font-semibold text-white disabled:opacity-40">
        {pending ? "Создаём…" : "Получить ссылку"}
      </button>
    </section>
  );
}
