// Миграции применяются по порядку при первом подключении к базе.
// Новая миграция = новый элемент в конце массива. Старые не менять.
export const MIGRATIONS: { id: string; sql: string }[] = [
  {
    id: "001_init",
    sql: `
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  phone_verified_at timestamptz,
  first_name text,
  last_name text,
  birth_date date,
  telegram_user_id bigint,
  lang text NOT NULL DEFAULT 'ru',
  city text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  consent_version text,
  consent_at timestamptz,
  first_utm jsonb,
  first_creator_code text,
  orders_count integer NOT NULL DEFAULT 0,
  total_spent bigint NOT NULL DEFAULT 0,
  last_order_at timestamptz,
  manager_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE customer_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  city text NOT NULL,
  address text NOT NULL,
  comment text,
  is_default boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_addresses_customer ON customer_addresses(customer_id);

-- Конфиг анкеты: новый вопрос добавляется строкой, без изменения схемы.
CREATE TABLE profile_questions (
  key text PRIMARY KEY,
  label_ru text NOT NULL,
  label_uz text NOT NULL,
  type text NOT NULL,              -- single | multi | text
  options jsonb,                   -- [{value, ru, uz}]
  placement text NOT NULL DEFAULT 'profile', -- after_delivery | profile | quiz
  reward integer NOT NULL DEFAULT 0,
  sort integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE customer_answers (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  question_key text NOT NULL REFERENCES profile_questions(key),
  value jsonb NOT NULL,
  source text NOT NULL DEFAULT 'profile', -- profile | quiz | manager
  answered_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, question_key)
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX sessions_customer ON sessions(customer_id);

CREATE TABLE otp_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  ip text,
  channel text NOT NULL,           -- telegram | demo | none
  gateway_request_id text,
  status text NOT NULL DEFAULT 'sent', -- sent | verified | failed | expired
  attempts integer NOT NULL DEFAULT 0,
  cost numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz
);
CREATE INDEX otp_requests_phone ON otp_requests(phone, created_at);
CREATE INDEX otp_requests_ip ON otp_requests(ip, created_at);

CREATE SEQUENCE order_number_seq START 1001;

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number text NOT NULL UNIQUE,
  customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'new', -- new | needs_call | confirmed | shipped | delivered | cancelled
  phone text NOT NULL,
  first_name text,
  last_name text,
  city text NOT NULL,
  address text NOT NULL,
  comment text,
  payment text NOT NULL,
  subtotal bigint NOT NULL,
  discount bigint NOT NULL DEFAULT 0,
  discount_source text,
  delivery bigint NOT NULL DEFAULT 0,
  total bigint NOT NULL,
  promo_code text,
  samples jsonb,
  utm jsonb,
  lang text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX orders_customer ON orders(customer_id, created_at);
CREATE INDEX orders_promo ON orders(promo_code, created_at);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  name text NOT NULL,
  price bigint NOT NULL,
  qty integer NOT NULL
);
CREATE INDEX order_items_order ON order_items(order_id);

CREATE TABLE customer_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE,
  type text NOT NULL,
  data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customer_events_customer ON customer_events(customer_id, created_at);
`,
  },
  {
    id: "002_seed_questions",
    sql: `
INSERT INTO profile_questions (key, label_ru, label_uz, type, options, placement, reward, sort) VALUES
('skin_type', 'Какой у вас тип кожи?', 'Teringiz turi qanday?', 'single',
 '[{"value":"dry","ru":"Сухая","uz":"Quruq"},{"value":"oily","ru":"Жирная","uz":"Yog''li"},{"value":"combo","ru":"Комбинированная","uz":"Aralash"},{"value":"sens","ru":"Чувствительная","uz":"Sezgir"},{"value":"normal","ru":"Нормальная","uz":"Normal"}]',
 'after_delivery', 15000, 10),
('concerns', 'Что хотите улучшить?', 'Nimani yaxshilamoqchisiz?', 'multi',
 '[{"value":"acne","ru":"Акне","uz":"Husnbuzar"},{"value":"dryness","ru":"Сухость","uz":"Quruqlik"},{"value":"pigment","ru":"Пигментация","uz":"Dog''lar"},{"value":"redness","ru":"Покраснения","uz":"Qizarish"},{"value":"aging","ru":"Возрастные изменения","uz":"Qarish belgilari"},{"value":"pores","ru":"Расширенные поры","uz":"Kengaygan g''ovaklar"}]',
 'after_delivery', 0, 20),
('sensitivity', 'Бывает ли раздражение от косметики?', 'Kosmetikadan qizarish bo''ladimi?', 'single',
 '[{"value":"often","ru":"Часто","uz":"Tez-tez"},{"value":"sometimes","ru":"Иногда","uz":"Ba''zan"},{"value":"never","ru":"Никогда","uz":"Hech qachon"}]',
 'profile', 0, 30),
('instagram', 'Ваш Instagram', 'Instagramingiz', 'text', NULL, 'profile', 0, 40),
('favorite_brands', 'Любимые бренды', 'Sevimli brendlar', 'text', NULL, 'profile', 0, 50),
('source', 'Откуда вы о нас узнали?', 'Biz haqimizda qayerdan bildingiz?', 'single',
 '[{"value":"instagram","ru":"Instagram","uz":"Instagram"},{"value":"tiktok","ru":"TikTok","uz":"TikTok"},{"value":"friends","ru":"От друзей","uz":"Do''stlardan"},{"value":"search","ru":"Поиск","uz":"Qidiruv"},{"value":"other","ru":"Другое","uz":"Boshqa"}]',
 'profile', 0, 60);
`,
  },
  {
    id: "003_catalog_admin",
    sql: `
-- Товары. Тексты на двух языках лежат в content (jsonb), чтобы добавлять поля без миграций.
CREATE TABLE products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  brand text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  skin text[] NOT NULL DEFAULT '{}',
  concerns text[] NOT NULL DEFAULT '{}',
  volume numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'ml',
  price bigint NOT NULL,
  old_price bigint,
  cost_price bigint,                -- закупочная цена: только для админки
  stock text NOT NULL DEFAULT 'in_stock', -- in_stock | on_order | out
  active boolean NOT NULL DEFAULT true,
  badge text,                       -- hit | choice | new
  rating numeric NOT NULL DEFAULT 0,
  reviews integer NOT NULL DEFAULT 0,
  days_supply integer NOT NULL DEFAULT 60,
  color text NOT NULL DEFAULT '#E6DCCB',
  pack text NOT NULL DEFAULT 'bottle',
  images jsonb NOT NULL DEFAULT '[]',
  fbt text[] NOT NULL DEFAULT '{}',
  content jsonb NOT NULL DEFAULT '{}', -- {type, desc, why, howTo, ingredients[], reviewSummary, rank}
  sort integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX products_category ON products(category);

-- Промокоды креаторов.
CREATE TABLE promo_codes (
  code text PRIMARY KEY,
  creator_name text NOT NULL,
  creator_handle text,
  percent integer NOT NULL CHECK (percent BETWEEN 1 AND 50),
  commission integer NOT NULL DEFAULT 7, -- % креатору со своих продаж
  active boolean NOT NULL DEFAULT true,
  featured boolean NOT NULL DEFAULT false, -- показывать в блоке «Выбор креаторов»
  picks text[] NOT NULL DEFAULT '{}',      -- товары подборки
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE order_items ADD COLUMN cost bigint;
ALTER TABLE orders ADD COLUMN manager_note text;
ALTER TABLE orders ADD COLUMN paid_at timestamptz;
ALTER TABLE orders ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE order_status_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  by_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX order_status_log_order ON order_status_log(order_id, created_at);
CREATE INDEX orders_status ON orders(status, created_at);
`,
  },
  {
    id: "004_creators",
    sql: `
-- Креатор входит в кабинет по своему номеру.
ALTER TABLE promo_codes ADD COLUMN creator_phone text;
CREATE UNIQUE INDEX promo_codes_phone ON promo_codes(creator_phone) WHERE creator_phone IS NOT NULL;

-- Ссылки креаторов: nabi.uz/c/<код>/<id>.
CREATE TABLE creator_links (
  id text PRIMARY KEY,
  creator_code text NOT NULL REFERENCES promo_codes(code) ON UPDATE CASCADE,
  label text NOT NULL,
  target_type text NOT NULL,       -- home | picks | category | product
  target text,                     -- slug товара или id категории
  archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_links_code ON creator_links(creator_code, created_at);

-- Переходы без ботов-превью. visitor_id — случайный id из куки, для уникальных посетителей.
CREATE TABLE link_clicks (
  id bigserial PRIMARY KEY,
  creator_code text NOT NULL,
  link_id text,
  visitor_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX link_clicks_code ON link_clicks(creator_code, created_at);
CREATE INDEX link_clicks_link ON link_clicks(link_id, created_at);

-- Последний переход клиента (для покупок с другого устройства) и окно 60 дней для новых клиентов.
ALTER TABLE customers ADD COLUMN ref_code text, ADD COLUMN ref_link text, ADD COLUMN ref_at timestamptz,
  ADD COLUMN referred_by text, ADD COLUMN referred_until timestamptz;

-- Кому засчитан заказ и сколько комиссии.
-- commission_status: pending (ждёт доставки и 7 дней) | paid | void (отмена, покупка самим креатором)
--                    | clawback (отменён после выплаты — вычитается из следующей выплаты) | clawed
ALTER TABLE orders ADD COLUMN creator_code text, ADD COLUMN attribution text, ADD COLUMN link_id text,
  ADD COLUMN commission_rate integer, ADD COLUMN commission bigint NOT NULL DEFAULT 0, ADD COLUMN commission_status text,
  ADD COLUMN commission_note text, ADD COLUMN delivered_at timestamptz, ADD COLUMN commission_available_at timestamptz,
  ADD COLUMN payout_id uuid, ADD COLUMN new_customer boolean NOT NULL DEFAULT false;
CREATE INDEX orders_creator ON orders(creator_code, created_at);

CREATE TABLE creator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_code text NOT NULL,
  amount bigint NOT NULL,
  orders_count integer NOT NULL,
  note text,
  paid_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX creator_payouts_code ON creator_payouts(creator_code, created_at);

CREATE TABLE attribution_log (
  id bigserial PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_code text,
  to_code text,
  reason text NOT NULL,
  by_phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Старые заказы с промокодом засчитываем креатору по коду.
UPDATE orders o SET creator_code = o.promo_code, attribution = 'code', commission_rate = p.commission,
  commission = round((o.subtotal - o.discount) * p.commission / 100.0),
  commission_status = CASE WHEN o.status = 'cancelled' THEN 'void' ELSE 'pending' END,
  delivered_at = CASE WHEN o.status = 'delivered' THEN coalesce(o.updated_at, o.created_at) END,
  commission_available_at = CASE WHEN o.status = 'delivered' THEN coalesce(o.updated_at, o.created_at) + interval '7 days' END
FROM promo_codes p WHERE p.code = o.promo_code;
`,
  },
  {
    id: "005_customer_account",
    sql: `
-- Корзина и избранное вошедшего клиента: одни и те же на всех устройствах.
CREATE TABLE customer_cart (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  qty integer NOT NULL CHECK (qty > 0 AND qty <= 50),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);
CREATE TABLE customer_favorites (
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, product_id)
);
-- Адреса с названиями («Дом», «Работа»).
ALTER TABLE customer_addresses ADD COLUMN label text;
-- Удалённый аккаунт: данные стёрты, заказы остаются для учёта.
ALTER TABLE customers ADD COLUMN deleted_at timestamptz;
`,
  },
];
