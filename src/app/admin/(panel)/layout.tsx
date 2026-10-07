import Link from "next/link";
import { requireAdmin } from "@/server/admin";
import { one } from "@/server/db";
import { fmtPhone } from "@/lib/admin-format";
import { AdminNav } from "./ui";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  const counts = await one<{ calls: number; fresh: number }>(
    `SELECT count(*) FILTER (WHERE status = 'needs_call')::int AS calls, count(*) FILTER (WHERE status = 'new')::int AS fresh FROM orders`
  );
  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-[100dvh] flex-col border-r border-line bg-white px-3 py-5 md:flex">
        <Link href="/admin" className="px-3 text-[24px] font-bold tracking-[0.04em]">NABI<span className="text-accent">.</span></Link>
        <AdminNav fresh={(counts?.fresh ?? 0) + (counts?.calls ?? 0)} />
        <div className="mt-auto space-y-2 px-3 text-[13px] text-muted">
          <p className="tabular">{me.first_name ?? "Админ"} · {fmtPhone(me.phone)}</p>
          <Link href="/ru" target="_blank" className="block text-accent">Открыть сайт ↗</Link>
        </div>
      </aside>
      <div className="min-w-0 pb-24 md:pb-10">{children}</div>
      <AdminNav mobile fresh={(counts?.fresh ?? 0) + (counts?.calls ?? 0)} />
    </div>
  );
}
