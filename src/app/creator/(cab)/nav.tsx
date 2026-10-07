"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const ITEMS = [
  { href: "/creator", label: "Главная", icon: "home", exact: true },
  { href: "/creator/links", label: "Ссылки", icon: "share" },
  { href: "/creator/orders", label: "Заказы", icon: "bag" },
  { href: "/creator/payouts", label: "Выплаты", icon: "gift" },
];

export function CreatorNav() {
  const pathname = usePathname();
  const on = (it: (typeof ITEMS)[number]) => (it.exact ? pathname === it.href : pathname.startsWith(it.href));
  return (
    <>
      <nav className="fixed inset-x-2 bottom-[calc(8px+env(safe-area-inset-bottom,0px))] z-40 md:hidden" aria-label="Кабинет">
        <ul className="grid grid-cols-4 rounded-card border border-line bg-white/95 py-1.5 shadow-float backdrop-blur-md">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <Link href={it.href} className={`flex flex-col items-center gap-0.5 py-1 text-[11px] ${on(it) ? "text-accent" : "text-ink/70"}`}>
                <span className={`grid h-8 w-12 place-items-center rounded-xl ${on(it) ? "bg-accent-soft" : ""}`}><Icon name={it.icon} size={21} /></span>
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <nav className="hidden gap-1 md:flex" aria-label="Кабинет">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href} className={`rounded-full px-4 py-2 text-[15px] ${on(it) ? "bg-accent-soft font-semibold text-accent" : "hover:bg-white"}`}>{it.label}</Link>
        ))}
      </nav>
    </>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button type="button" className="text-[13px] text-muted underline" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/creator/login"); }}>
      Выйти
    </button>
  );
}
