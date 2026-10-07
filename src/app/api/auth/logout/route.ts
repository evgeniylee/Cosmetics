import { NextResponse } from "next/server";
import { currentCustomer, destroyAllSessions, destroySession } from "@/server/auth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { all?: boolean };
  const me = body.all ? await currentCustomer() : null;
  if (me) await destroyAllSessions(me.id);
  else await destroySession();
  return NextResponse.json({ ok: true });
}
