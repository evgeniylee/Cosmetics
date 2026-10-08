import { NextResponse } from "next/server";
import { adminOnly } from "@/server/xlsx";
import { saveVideoStream } from "@/server/uploads";

export const dynamic = "force-dynamic";

// Загрузка видео из админки: тело запроса — сам файл, тип в Content-Type.
export async function POST(req: Request) {
  return adminOnly(async () => {
    try {
      const url = await saveVideoStream(req.body, (req.headers.get("content-type") || "").split(";")[0].trim());
      return NextResponse.json({ url });
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Не удалось сохранить" }, { status: 400 });
    }
  });
}
