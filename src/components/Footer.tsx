import Link from "next/link";
import type { Lang } from "@/data/catalog";
import { getDict } from "@/lib/i18n";
import { Logo } from "./Header";

export function Footer({ lang }: { lang: Lang }) {
  const t = getDict(lang);
  const cols = [
    { title: t.footerBuyers, links: [t.fDelivery, t.fPayment, t.fReturn, t.fOriginal] },
    { title: t.footerAbout, links: [t.fAboutUs, t.fContacts, t.fPrivacy] },
    { title: t.footerCreators, links: [t.fCreatorProgram, t.fCreatorLogin] },
  ];
  return (
    <footer className="mt-20 bg-surface pb-28 pt-12 md:pb-12">
      <div className="wrap grid gap-10 md:grid-cols-[1.2fr_repeat(3,1fr)_1.4fr]">
        <div>
          <Logo className="text-[28px]" />
          <p className="mt-2 text-[14px] text-ink/60">{t.brandTag}</p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <p className="text-[15px] font-bold">{c.title}</p>
            <ul className="mt-3 space-y-2 text-[14px]">
              {c.links.map((l) => (
                <li key={l}><Link href={`/${lang}`} className="hover:text-accent">{l}</Link></li>
              ))}
            </ul>
          </div>
        ))}
        <div className="md:text-right">
          <p className="whitespace-nowrap text-[26px] font-bold tabular md:text-[24px] lg:text-[28px]">+998 90 000 00 00</p>
          <p className="text-[13px] text-muted">{t.workHours}</p>
          <div className="mt-3 flex gap-2 md:justify-end">
            {["Telegram", "Instagram", "TikTok"].map((s) => (
              <a key={s} href="#" className="rounded-full bg-white px-3 py-1.5 text-[13px] hover:text-accent">{s}</a>
            ))}
          </div>
        </div>
      </div>
      <div className="wrap mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12px] text-muted">
        <span>© {new Date().getFullYear()} NABI</span>
        <span>{t.fPrivacy}</span>
        <span className="ml-auto flex gap-4 font-semibold tracking-wide">
          <span>Click</span><span>Payme</span><span>Uzcard</span><span>Humo</span>
        </span>
      </div>
    </footer>
  );
}
