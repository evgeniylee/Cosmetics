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
];
