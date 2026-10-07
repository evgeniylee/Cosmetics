"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, type ApiCustomer } from "@/lib/api";
import { useI18n } from "@/components/I18n";
import { AccountGate, fmtPhoneUz } from "@/components/AccountGate";
import { logoutEverywhere } from "@/components/Auth";
import { useSession, useShop } from "@/store/shop";

const inputCls = "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none focus:border-accent";

export default function ProfilePage() {
  return <AccountGate>{(c) => <ProfileForm c={c} />}</AccountGate>;
}

function ProfileForm({ c }: { c: ApiCustomer }) {
  const { lang, t } = useI18n();
  const ru = lang === "ru";
  const router = useRouter();
  const setCustomer = useSession((s) => s.setCustomer);
  const [first, setFirst] = useState(c.firstName ?? "");
  const [last, setLast] = useState(c.lastName ?? "");
  const [bd, setBd] = useState(() => {
    const [y, m, d] = (c.birthDate ?? "").split("-");
    return { d: d ? String(Number(d)) : "", m: m ? String(Number(m)) : "", y: y ?? "" };
  });
  const [pref, setPref] = useState<"ru" | "uz">(c.lang === "uz" ? "uz" : "ru");
  const [marketing, setMarketing] = useState(c.marketing);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState(0);

  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 14 - i);
  const birth = () => {
    if (!bd.d && !bd.m && !bd.y) return { ok: true, v: null };
    const d = Number(bd.d), m = Number(bd.m), y = Number(bd.y);
    const date = new Date(y, m - 1, d);
    const ok = !!d && !!m && !!y && date.getDate() === d;
    return { ok, v: ok ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null };
  };

  const save = async () => {
    const b = birth();
    if (!first.trim() || !last.trim() || !b.ok) { setMsg({ ok: false, text: !b.ok ? t.coBirthInvalid : t.coRequired }); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await api.updateProfile({ firstName: first.trim(), lastName: last.trim(), birthDate: b.v, lang: pref, marketing });
      setCustomer(r.customer);
      setMsg({ ok: true, text: ru ? "Сохранено" : "Saqlandi" });
      if (pref !== lang) router.push(`/${pref}/account/profile`);
    } catch {
      setMsg({ ok: false, text: ru ? "Не удалось сохранить, попробуйте ещё раз" : "Saqlab bo'lmadi" });
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    if (del < 1) { setDel(1); return; }
    setBusy(true);
    try {
      await api.deleteAccount();
      useShop.getState().resetPersonal();
      setCustomer(null);
      router.push(`/${lang}`);
    } catch (e) {
      setBusy(false);
      setDel(0);
      const active = e instanceof Error && e.message === "active_orders";
      setMsg({ ok: false, text: active ? (ru ? "Сначала дождитесь доставки текущих заказов — адрес нужен курьеру." : "Avval joriy buyurtmalar yetkazilishini kuting.") : ru ? "Не удалось удалить аккаунт" : "Akkauntni o'chirib bo'lmadi" });
    }
  };

  return (
    <div className="wrap max-w-[560px] py-6 md:py-10">
      <Link href={`/${lang}/account`} className="text-[14px] text-muted">{ru ? "← Профиль" : "← Profil"}</Link>
      <h1 className="mt-2 h-section">{ru ? "Мои данные" : "Ma'lumotlarim"}</h1>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-[13px] font-medium text-ink/70">{t.coPhone}</p>
          <p className="mt-1 text-[16px] tabular">{fmtPhoneUz(c.phone)}</p>
          <p className="text-[12px] text-muted">{ru ? "Номер — это ваш вход. Сменить его можно через поддержку." : "Raqam — kirishingiz. Uni qo'llab-quvvatlash orqali o'zgartirish mumkin."}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block"><span className="text-[13px] font-medium text-ink/70">{t.coFirst}</span><input id="first" value={first} onChange={(e) => setFirst(e.target.value)} className={`${inputCls} mt-1`} /></label>
          <label className="block"><span className="text-[13px] font-medium text-ink/70">{t.coLast}</span><input id="last" value={last} onChange={(e) => setLast(e.target.value)} className={`${inputCls} mt-1`} /></label>
        </div>
        <div>
          <span className="text-[13px] font-medium text-ink/70">{t.coBirth}</span>
          <div className="mt-1 grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <select aria-label={t.coDay} value={bd.d} onChange={(e) => setBd({ ...bd, d: e.target.value })} className={inputCls}><option value="">{t.coDay}</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            <select aria-label={t.coMonth} value={bd.m} onChange={(e) => setBd({ ...bd, m: e.target.value })} className={inputCls}><option value="">{t.coMonth}</option>{t.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select aria-label={t.coYear} value={bd.y} onChange={(e) => setBd({ ...bd, y: e.target.value })} className={inputCls}><option value="">{t.coYear}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </div>
        </div>
        <fieldset>
          <legend className="text-[13px] font-medium text-ink/70">{ru ? "Язык сайта и сообщений" : "Sayt va xabarlar tili"}</legend>
          <div className="mt-1 grid grid-cols-2 gap-1 rounded-xl bg-surface p-1">
            {(["ru", "uz"] as const).map((l) => (
              <button key={l} type="button" onClick={() => setPref(l)} className={`h-10 rounded-lg font-medium ${pref === l ? "bg-white shadow" : "text-muted"}`}>{l === "ru" ? "Русский" : "O‘zbekcha"}</button>
            ))}
          </div>
        </fieldset>
        <label className="flex items-start gap-3 rounded-card bg-surface p-4 text-[14px]">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
          <span><b>{ru ? "Акции и новинки в Telegram" : "Telegramda aksiya va yangiliklar"}</b><span className="block text-ink/70">{ru ? "Не чаще пары раз в месяц. Отписаться можно здесь же." : "Oyiga bir-ikki martadan ko'p emas."}</span></span>
        </label>
        {msg && <p role="status" className={`text-[14px] ${msg.ok ? "text-success" : "text-warn"}`}>{msg.text}</p>}
        <button type="button" onClick={save} disabled={busy} className="h-12 w-full rounded-card bg-accent font-semibold text-white disabled:opacity-50">{ru ? "Сохранить" : "Saqlash"}</button>
      </div>

      <section className="mt-10 space-y-3 border-t border-line pt-6 text-[14px]">
        <h2 className="text-[17px] font-bold">{ru ? "Безопасность" : "Xavfsizlik"}</h2>
        <button type="button" onClick={() => logoutEverywhere(true).then(() => router.push(`/${lang}`))} className="block text-ink/80 underline">{ru ? "Выйти на всех устройствах" : "Barcha qurilmalardan chiqish"}</button>
        <p className="text-muted">{ru ? "Если потеряли телефон или входили с чужого устройства." : "Telefonni yo'qotgan bo'lsangiz yoki begona qurilmadan kirgan bo'lsangiz."}</p>
        <div className="pt-4">
          <button type="button" onClick={deleteAccount} disabled={busy} className={`text-[14px] ${del ? "font-semibold text-warn" : "text-muted underline"}`}>
            {del ? (ru ? "Нажмите ещё раз — аккаунт будет удалён навсегда" : "Yana bosing — akkaunt butunlay o'chiriladi") : ru ? "Удалить аккаунт" : "Akkauntni o'chirish"}
          </button>
          {del > 0 && <p className="mt-1 text-[13px] text-muted">{ru ? "Удалим имя, дату рождения, адреса, избранное и корзину. История заказов останется у нас обезличенной для бухгалтерии." : "Ism, tug'ilgan sana, manzillar, sevimlilar o'chiriladi. Buyurtmalar tarixi buxgalteriya uchun qoladi."}</p>}
        </div>
      </section>
    </div>
  );
}
