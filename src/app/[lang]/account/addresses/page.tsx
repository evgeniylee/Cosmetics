"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CITIES } from "@/lib/shop";
import { api, type ApiAddress } from "@/lib/api";
import { useI18n } from "@/components/I18n";
import { Icon } from "@/components/Icon";
import { AccountGate } from "@/components/AccountGate";
import { AddressForm } from "@/components/AddressForm";

export default function AddressesPage() {
  return <AccountGate>{() => <Addresses />}</AccountGate>;
}

function Addresses() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const [list, setList] = useState<ApiAddress[] | null>(null);
  const [edit, setEdit] = useState<string | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useEffect(() => { api.addresses().then((r) => { setList(r.addresses); if (!r.addresses.length) setEdit("new"); }).catch(() => setList([])); }, []);

  const run = async (p: Promise<{ addresses: ApiAddress[] }>) => {
    setBusy(true);
    try { setList((await p).addresses); setEdit(null); } catch { /* сеть */ } finally { setBusy(false); }
  };
  const city = (id: string) => CITIES.find((c) => c.id === id)?.[lang] ?? id;

  return (
    <div className="wrap max-w-[640px] py-6 md:py-10">
      <Link href={`/${lang}/account`} className="text-[14px] text-muted">{ru ? "← Профиль" : "← Profil"}</Link>
      <h1 className="mt-2 h-section">{ru ? "Адреса" : "Manzillar"}</h1>
      <p className="mt-1 text-[14px] text-ink/70">{ru ? "При оформлении заказа выберете адрес одним нажатием." : "Buyurtmada manzilni bir bosishda tanlaysiz."}</p>

      {list === null ? <div className="mt-5 h-32 animate-pulse rounded-card bg-surface" /> : (
        <ul className="mt-5 space-y-3">
          {list.map((a) => (
            <li key={a.id} className="rounded-card border border-line p-4">
              {edit === a.id ? (
                <AddressForm busy={busy} initial={{ label: a.label, city: a.city, address: a.address, comment: a.comment, isDefault: a.is_default }} onCancel={() => setEdit(null)} onSave={(v) => run(api.updateAddress(a.id, v))} />
              ) : (
                <div className="flex items-start gap-3">
                  <Icon name="pin" size={20} className="mt-0.5 shrink-0 text-accent" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{a.label || city(a.city)}{a.is_default && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{ru ? "основной" : "asosiy"}</span>}</p>
                    <p className="text-[14px] text-ink/75">{city(a.city)}, {a.address}</p>
                    {a.comment && <p className="text-[13px] text-muted">{a.comment}</p>}
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                      <button type="button" onClick={() => setEdit(a.id)} className="text-accent">{ru ? "Изменить" : "O'zgartirish"}</button>
                      {!a.is_default && <button type="button" onClick={() => run(api.updateAddress(a.id, { label: a.label, city: a.city, address: a.address, comment: a.comment, isDefault: true }))} className="text-ink/70">{ru ? "Сделать основным" : "Asosiy qilish"}</button>}
                      {confirmDel === a.id
                        ? <button type="button" onClick={() => { setConfirmDel(null); run(api.deleteAddress(a.id)); }} className="font-semibold text-warn">{ru ? "Точно удалить?" : "Rostdan o'chirish?"}</button>
                        : <button type="button" onClick={() => setConfirmDel(a.id)} className="text-muted">{ru ? "Удалить" : "O'chirish"}</button>}
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {edit === "new" ? (
        <div className="mt-4 rounded-card border border-line p-4">
          <p className="mb-3 font-semibold">{ru ? "Новый адрес" : "Yangi manzil"}</p>
          <AddressForm busy={busy} initial={{ label: null, city: "tashkent", address: "", comment: "", isDefault: !list?.length }} onCancel={list?.length ? () => setEdit(null) : undefined} onSave={(v) => run(api.addAddress(v))} />
        </div>
      ) : (list?.length ?? 0) < 10 && (
        <button type="button" onClick={() => setEdit("new")} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-card border-2 border-dashed border-line font-semibold text-ink/80 hover:border-accent hover:text-accent">
          <Icon name="plus" size={18} /> {ru ? "Добавить адрес" : "Manzil qo'shish"}
        </button>
      )}
    </div>
  );
}
