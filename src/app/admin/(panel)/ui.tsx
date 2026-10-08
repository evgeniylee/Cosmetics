"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";

const ITEMS = [
  { href: "/admin", label: "Сводка", icon: "home", exact: true },
  { href: "/admin/orders", label: "Заказы", icon: "bag", badge: true },
  { href: "/admin/products", label: "Товары", icon: "jar" },
  { href: "/admin/storefront", label: "Витрина", icon: "spark" },
  { href: "/admin/brands", label: "Бренды", icon: "star" },
  { href: "/admin/customers", label: "Клиенты", icon: "user" },
  { href: "/admin/promo", label: "Креаторы", icon: "gift" },
];

export function AdminNav({ mobile = false, fresh = 0 }: { mobile?: boolean; fresh?: number }) {
  const pathname = usePathname();
  const active = (it: (typeof ITEMS)[number]) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));
  if (mobile)
    return (
      <nav className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom,0px))] z-40 md:hidden" aria-label="Админка">
        <ul className="grid grid-cols-7 rounded-card border border-line bg-white/95 py-1.5 shadow-float backdrop-blur-md">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={`relative flex flex-col items-center gap-0.5 py-1 text-[10px] ${active(it) ? "text-accent" : "text-ink/70"}`}>
                <span className={`grid h-8 w-9 place-items-center rounded-xl ${active(it) ? "bg-accent-soft" : ""}`}><Icon name={it.icon} size={21} /></span>
                {it.label}
                {it.badge && fresh > 0 && <span className="absolute right-2 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-white tabular">{fresh}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  return (
    <nav className="mt-6 space-y-1" aria-label="Админка">
      {ITEMS.map((it) => (
        <Link key={it.href} href={it.href} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${active(it) ? "bg-accent-soft font-semibold text-accent" : "hover:bg-surface"}`}>
          <Icon name={it.icon} size={20} /> {it.label}
          {it.badge && fresh > 0 && <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white tabular">{fresh}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function PageHead({ title, sub, children }: { title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-end gap-3 px-4 pb-4 pt-6 md:px-8 md:pt-8">
      <div className="min-w-0">
        <h1 className="text-[26px] font-bold leading-tight md:text-[32px]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-muted">{sub}</p>}
      </div>
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-card bg-white p-4 shadow-[0_1px_0_rgba(17,17,17,.04)] ring-1 ring-line md:p-5 ${className}`}>{children}</section>;
}

/** Поиск в URL (?q=) с задержкой, без перезагрузки страницы. */
export function SearchBox({ placeholder, param = "q" }: { placeholder: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [v, setV] = useState(sp.get(param) ?? "");
  const [, start] = useTransition();
  useEffect(() => {
    const id = setTimeout(() => {
      if ((sp.get(param) ?? "") === v) return;
      const q = new URLSearchParams(sp.toString());
      if (v) q.set(param, v); else q.delete(param);
      q.delete("page");
      start(() => router.replace(`${pathname}?${q}`));
    }, 350);
    return () => clearTimeout(id);
  }, [v, sp, param, pathname, router]);
  return (
    <label className="flex h-10 w-full min-w-0 shrink-0 items-center gap-2 rounded-full bg-white px-3.5 ring-1 ring-line focus-within:ring-accent md:w-72">
      <Icon name="search" size={18} className="text-muted" />
      <span className="sr-only">{placeholder}</span>
      <input id={`search-${param}`} value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none focus-visible:outline-none" />
    </label>
  );
}

/** Таблетки-фильтры, пишут значение в URL. */
export function FilterTabs({ param, options, value }: { param: string; options: { v: string; l: string; n?: number }[]; value: string }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const href = (v: string) => {
    const q = new URLSearchParams(sp.toString());
    if (v) q.set(param, v); else q.delete(param);
    q.delete("page");
    return `${pathname}?${q}`;
  };
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {options.map((o) => (
        <Link key={o.v} href={href(o.v)} className={`flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] transition-colors ${value === o.v ? "bg-ink text-white" : "bg-white ring-1 ring-line hover:ring-ink/30"}`}>
          {o.l}
          {o.n !== undefined && <span className={`tabular text-[12px] ${value === o.v ? "text-white/70" : "text-muted"}`}>{o.n}</span>}
        </Link>
      ))}
    </div>
  );
}

export function Pager({ page, total, size }: { page: number; total: number; size: number }) {
  const sp = useSearchParams();
  const pathname = usePathname();
  const pages = Math.max(1, Math.ceil(total / size));
  if (pages <= 1) return null;
  const href = (p: number) => {
    const q = new URLSearchParams(sp.toString());
    q.set("page", String(p));
    return `${pathname}?${q}`;
  };
  return (
    <div className="flex items-center justify-center gap-2 py-4 text-[14px]">
      {page > 1 && <Link href={href(page - 1)} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line">← Назад</Link>}
      <span className="tabular text-muted">{page} / {pages}</span>
      {page < pages && <Link href={href(page + 1)} className="rounded-full bg-white px-3 py-1.5 ring-1 ring-line">Дальше →</Link>}
    </div>
  );
}

export function Toast({ text }: { text: string | null }) {
  if (!text) return null;
  return <div role="status" className="anim-fade fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-[14px] text-white shadow-float md:bottom-6">{text}</div>;
}
