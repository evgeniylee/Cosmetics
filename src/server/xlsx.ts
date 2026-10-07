// Выгрузки в Excel для админки: одна таблица с шапкой, закреплённой первой строкой и автофильтром.
import "server-only";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { assertAdmin } from "./admin";

export type Col<T> = { header: string; key: string; width?: number; value: (r: T) => string | number | Date | boolean | null | undefined; money?: boolean; date?: boolean };

export async function buildSheet<T>(title: string, cols: Col<T>[], rows: T[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "NABI";
  const ws = wb.addWorksheet(title, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 16 }));
  for (const r of rows) ws.addRow(Object.fromEntries(cols.map((c) => [c.key, c.value(r) ?? null])));
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF3EFEA" } };
  cols.forEach((c, i) => {
    if (c.money) ws.getColumn(i + 1).numFmt = "#,##0";
    if (c.date) ws.getColumn(i + 1).numFmt = "dd.mm.yyyy hh:mm";
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function xlsxResponse(buf: Buffer, name: string) {
  const stamp = new Date(Date.now() + 5 * 3600_000).toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${name}-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

/** Обёртка для маршрутов выгрузки: без доступа — 403. */
export async function adminOnly(fn: () => Promise<Response>) {
  try {
    await assertAdmin();
  } catch {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return fn();
}

/** Дата в ташкентском времени без часового пояса — Excel покажет как есть. */
export const tz = (d: string | Date | null) => (d ? new Date(new Date(d).getTime() + 5 * 3600_000) : null);
