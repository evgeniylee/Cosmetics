// Доступ к админке: вход тем же кодом из Telegram, телефон должен быть в ADMIN_PHONES.
import "server-only";
import { redirect } from "next/navigation";
import { currentCustomer, normalizePhone, type Customer } from "./auth";

export function adminPhones(): Set<string> {
  return new Set(
    (process.env.ADMIN_PHONES || "")
      .split(/[,;\s]+/)
      .map((p) => normalizePhone(p))
      .filter((p): p is string => !!p)
  );
}

export function isAdminPhone(phone: string) {
  return adminPhones().has(phone);
}

/** Для страниц админки: возвращает админа или отправляет на вход. */
export async function requireAdmin(): Promise<Customer> {
  const me = await currentCustomer();
  if (!me) redirect("/admin/login");
  if (!isAdminPhone(me.phone)) redirect("/admin/login?denied=1");
  return me;
}

/** Для server actions и API: бросает ошибку без доступа. */
export async function assertAdmin(): Promise<Customer> {
  const me = await currentCustomer();
  if (!me || !isAdminPhone(me.phone)) throw new Error("forbidden");
  return me;
}
