import "server-only";
import { redirect } from "next/navigation";
import { currentCustomer } from "./auth";
import { creatorByPhone } from "./creators";

/** Для страниц кабинета: креатор по номеру из сессии или редирект на вход. */
export async function requireCreator() {
  const me = await currentCustomer();
  if (!me) redirect("/creator/login");
  const c = await creatorByPhone(me.phone);
  if (!c) redirect("/creator/login?denied=1");
  return { me, creator: c };
}

export async function assertCreator() {
  const me = await currentCustomer();
  const c = me ? await creatorByPhone(me.phone) : null;
  if (!me || !c) throw new Error("forbidden");
  return { me, creator: c };
}
