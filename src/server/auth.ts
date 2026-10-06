import { createHash, randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { one } from "./db";

const COOKIE = "nabi_session";
const DAYS = 90;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** +998 XX XXX XX XX → +998XXXXXXXXX, либо null, если номер не узбекский мобильный. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (d.length === 9) d = "998" + d;
  if (!/^998\d{9}$/.test(d)) return null;
  return "+" + d;
}

export async function clientIp() {
  const h = await headers();
  return (h.get("x-forwarded-for") || h.get("x-real-ip") || "local").split(",")[0].trim();
}

export async function createSession(customerId: string) {
  const token = randomBytes(32).toString("base64url");
  const h = await headers();
  await one(
    `INSERT INTO sessions (customer_id, token_hash, user_agent, expires_at) VALUES ($1, $2, $3, now() + interval '${DAYS} days') RETURNING id`,
    [customerId, sha256(token), (h.get("user-agent") || "").slice(0, 300)]
  );
  const c = await cookies();
  c.set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: DAYS * 86400 });
}

export type Customer = {
  id: string;
  phone: string;
  first_name: string | null;
  last_name: string | null;
  birth_date: string | null;
  marketing_opt_in: boolean;
  city: string | null;
  orders_count: number;
};

const CUSTOMER_COLS = `c.id, c.phone, c.first_name, c.last_name, to_char(c.birth_date, 'YYYY-MM-DD') AS birth_date, c.marketing_opt_in, c.city, c.orders_count`;

export async function currentCustomer(): Promise<Customer | null> {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (!token) return null;
  const row = await one<Customer>(
    `SELECT ${CUSTOMER_COLS} FROM sessions s JOIN customers c ON c.id = s.customer_id WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [sha256(token)]
  );
  return row ?? null;
}

export async function destroySession() {
  const c = await cookies();
  const token = c.get(COOKIE)?.value;
  if (token) await one(`DELETE FROM sessions WHERE token_hash = $1`, [sha256(token)]);
  c.delete(COOKIE);
}

export async function customerById(id: string) {
  return (await one<Customer>(`SELECT ${CUSTOMER_COLS} FROM customers c WHERE c.id = $1`, [id])) ?? null;
}

/** Что отдаём в браузер: без внутренних полей. */
export function publicCustomer(c: Customer) {
  return {
    id: c.id,
    phone: c.phone,
    firstName: c.first_name,
    lastName: c.last_name,
    birthDate: c.birth_date,
    marketing: c.marketing_opt_in,
    city: c.city,
    ordersCount: Number(c.orders_count),
    needsProfile: !c.first_name || !c.last_name,
  };
}
export type PublicCustomer = ReturnType<typeof publicCustomer>;
