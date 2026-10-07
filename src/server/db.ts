// Подключение к базе. В продакшене — PostgreSQL по DATABASE_URL.
// Локально без DATABASE_URL — встроенный PGlite (Postgres в WASM), файлы в ./.data/pglite.
import { MIGRATIONS } from "./migrations";
import { SEED_PRODUCTS } from "@/data/catalog";

export type Row = Record<string, unknown>;
export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

declare global {
  var __nabiDb: Promise<Db> | undefined;
}

async function connect(): Promise<Db> {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
    return {
      query: (sql, params) => pool.query(sql, params as unknown[]) as never,
      exec: (sql) => pool.query(sql),
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR || "./.data/pglite";
  if (!dir.includes("://")) {
    const { mkdirSync } = await import("node:fs");
    mkdirSync(dir, { recursive: true });
  }
  const pg = new PGlite(dir);
  await pg.waitReady;
  return {
    query: (sql, params) => pg.query(sql, params as unknown[]) as never,
    exec: (sql) => pg.exec(sql),
  };
}

async function migrate(db: Db) {
  await db.exec(`CREATE TABLE IF NOT EXISTS _migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const { rows } = await db.query<{ id: string }>(`SELECT id FROM _migrations`);
  const done = new Set(rows.map((r) => r.id));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.exec(`BEGIN; ${m.sql}; INSERT INTO _migrations (id) VALUES ('${m.id}'); COMMIT;`);
  }
}

/** Первое заполнение: демо-товары и промокоды, если таблицы пустые. */
async function seed(db: Db) {
  const { rows } = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM products`);
  if (rows[0].n === 0) {
    for (const [i, p] of SEED_PRODUCTS.entries()) {
      await db.query(
        `INSERT INTO products (id, slug, brand, name, category, skin, concerns, volume, unit, price, old_price, badge, rating, reviews,
           days_supply, color, pack, fbt, content, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
        [p.id, p.slug, p.brand, p.name, p.cat, p.skin, p.concerns, p.volume, p.unit, p.price, p.oldPrice ?? null, p.badge ?? null,
          p.rating, p.reviews, p.daysSupply, p.color, p.pack, p.fbt,
          JSON.stringify({ type: p.type, desc: p.desc, why: p.why, howTo: p.howTo, ingredients: p.ingredients, reviewSummary: p.reviewSummary ?? null, rank: p.rank ?? null }),
          (i + 1) * 10]
      );
    }
  }
  const pc = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM promo_codes`);
  if (pc.rows[0].n === 0) {
    await db.query(
      `INSERT INTO promo_codes (code, creator_name, creator_handle, percent, commission, featured, picks) VALUES
       ('MADINA', 'Мадина', '@madina.skincare', 10, 7, true, '{1,2,5,13}'),
       ('SEVARA', 'Севара', '@sevara.tt', 10, 7, false, '{}')`
    );
  }
}

/** Единое подключение на процесс (переживает hot-reload в dev). */
export function db(): Promise<Db> {
  if (!globalThis.__nabiDb) {
    globalThis.__nabiDb = (async () => {
      const d = await connect();
      await migrate(d);
      await seed(d);
      return d;
    })().catch((e) => {
      globalThis.__nabiDb = undefined;
      throw e;
    });
  }
  return globalThis.__nabiDb;
}

export async function one<T extends Row>(sql: string, params?: unknown[]) {
  const d = await db();
  const { rows } = await d.query<T>(sql, params);
  return rows[0] as T | undefined;
}

export async function many<T extends Row>(sql: string, params?: unknown[]) {
  const d = await db();
  return (await d.query<T>(sql, params)).rows;
}
