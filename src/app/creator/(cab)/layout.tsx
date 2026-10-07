import Link from "next/link";
import { requireCreator } from "@/server/creator-auth";
import { CreatorNav, LogoutButton } from "./nav";

export const dynamic = "force-dynamic";

export default async function CabLayout({ children }: { children: React.ReactNode }) {
  const { creator } = await requireCreator();
  return (
    <div className="mx-auto min-h-[100dvh] max-w-3xl pb-28 md:pb-12">
      <header className="flex items-center gap-3 px-4 pb-2 pt-5 md:px-6">
        <Link href="/creator" className="text-[22px] font-bold tracking-[0.04em]">NABI<span className="text-accent">.</span></Link>
        <span className="rounded-full bg-white px-3 py-1 text-[13px] font-semibold ring-1 ring-line">{creator.code} · −{creator.percent}%</span>
        <span className="ml-auto"><LogoutButton /></span>
      </header>
      <div className="px-4 md:px-6"><CreatorNav /></div>
      {!creator.active && <p className="mx-4 mt-3 rounded-card bg-[#fde8df] px-4 py-3 text-[14px] text-warn md:mx-6">Ваш код сейчас выключен: новые переходы и заказы не засчитываются. Свяжитесь с менеджером.</p>}
      {children}
    </div>
  );
}
