import "server-only";
import { z } from "zod";
import { many } from "./db";
import { CITIES } from "@/lib/shop";

export const AddressBody = z.object({
  label: z.string().trim().max(30).nullable().optional(),
  city: z.string().refine((c) => CITIES.some((x) => x.id === c)),
  address: z.string().trim().min(3).max(300),
  comment: z.string().trim().max(500).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type AddressRow = { id: string; label: string | null; city: string; address: string; comment: string | null; is_default: boolean };

export async function listAddresses(customerId: string) {
  return many<AddressRow>(`SELECT id, label, city, address, comment, is_default FROM customer_addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC`, [customerId]);
}

