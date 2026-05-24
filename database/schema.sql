-- ── Shared function: auto-update updated_at ───────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- 1. ADMIN USERS

CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT  UNIQUE NOT NULL,
  password_hash TEXT  NOT NULL,
  name          TEXT,
  role          TEXT  NOT NULL DEFAULT 'staff', -- 'staff' | 'admin' | 'superadmin'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('staff','admin','superadmin'))
);

-- . ROOMS
CREATE TABLE IF NOT EXISTS rooms (
  id                   TEXT    PRIMARY KEY,   -- 't6-room1', 'cine-1', ...
  name                 TEXT    NOT NULL,      -- 'Room 1', 'Cine 1', ...
  floor                INT     NOT NULL,      -- 4, 5, 6
  type                 TEXT    NOT NULL,      -- 'small'|'classic'|'deluxe'|'big'|'cine'|'suite'
  capacity_min         INT     NOT NULL DEFAULT 1,
  capacity_max         INT     NOT NULL,      -- 2, 3, 4, 8
  surcharge_per_person INT     NOT NULL DEFAULT 0,   -- phụ thu/người (Big Room: 40k)
  surcharge_from_person INT    DEFAULT NULL,          -- từ người thứ mấy (Big Room: 7)
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_type     CHECK (type IN ('small','classic','deluxe','big','cine','suite')),
  CONSTRAINT valid_floor    CHECK (floor IN (4, 5, 6)),
  CONSTRAINT valid_capacity CHECK (capacity_max >= capacity_min AND capacity_min >= 1)
);

-- ── 3. PRICING ────────────────────────────────────────────
-- Bảng giá theo loại phòng × khung giờ × loại ngày
CREATE TABLE IF NOT EXISTS pricing (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type      TEXT NOT NULL,
  day_type       TEXT NOT NULL,  -- 'weekday' (T2-T6) | 'weekend' (T7-CN/lễ)
  time_slot      TEXT NOT NULL,  -- 'morning' (09-17h) | 'evening' (17-02h)
  price_per_hour INT  NOT NULL,  -- nghìn đồng/giờ
  base_people    INT  NOT NULL DEFAULT 1, -- giá áp dụng cho X người
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_day_type  CHECK (day_type  IN ('weekday','weekend')),
  CONSTRAINT valid_time_slot CHECK (time_slot IN ('morning','evening')),
  CONSTRAINT valid_room_type CHECK (room_type IN ('small','classic','deluxe','big','cine','suite')),
  CONSTRAINT valid_price     CHECK (price_per_hour > 0),
  UNIQUE (room_type, day_type, time_slot)
);

-- Seed bảng giá
INSERT INTO pricing (room_type, day_type, time_slot, price_per_hour, base_people) VALUES
  -- T2-T6 sáng/tối
  ('cine',    'weekday', 'morning',  75,  1),
  ('cine',    'weekday', 'evening', 109,  1),
  ('suite',   'weekday', 'morning',  99,  1),
  ('suite',   'weekday', 'evening', 135,  1),
  ('small',   'weekday', 'morning',  59,  2),
  ('small',   'weekday', 'evening',  89,  2),
  ('classic', 'weekday', 'morning',  79,  3),
  ('classic', 'weekday', 'evening', 109,  3),
  ('deluxe',  'weekday', 'morning',  99,  4),
  ('deluxe',  'weekday', 'evening', 135,  4),
  ('big',     'weekday', 'morning', 139,  6),
  ('big',     'weekday', 'evening', 219,  6),
  -- T7-CN/lễ sáng/tối
  ('cine',    'weekend', 'morning',  89,  1),
  ('cine',    'weekend', 'evening', 129,  1),
  ('suite',   'weekend', 'morning', 109,  1),
  ('suite',   'weekend', 'evening', 159,  1),
  ('small',   'weekend', 'morning',  65,  2),
  ('small',   'weekend', 'evening', 109,  2),
  ('classic', 'weekend', 'morning',  89,  3),
  ('classic', 'weekend', 'evening', 129,  3),
  ('deluxe',  'weekend', 'morning', 119,  4),
  ('deluxe',  'weekend', 'evening', 169,  4),
  ('big',     'weekend', 'morning', 149,  6),
  ('big',     'weekend', 'evening', 249,  6)
ON CONFLICT (room_type, day_type, time_slot) DO NOTHING;

--4. MENU ITEMS
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tab           TEXT    NOT NULL,  -- 'drink' | 'food'
  category      TEXT    NOT NULL,  -- 'tra','soda','khoang','topping','chinh','chien','snack'
  name          TEXT    NOT NULL,
  price         INT     NOT NULL,  -- nghìn đồng
  variants      TEXT    DEFAULT NULL, -- 'Bò · Gà' (chỉ dùng cho display)
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_tab   CHECK (tab   IN ('drink','food')),
  CONSTRAINT valid_price CHECK (price > 0)
);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 5. CUSTOMERS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL UNIQUE,     -- định danh chính
  source      TEXT DEFAULT 'walk-in',   -- 'call'|'walk-in'|'facebook'|'zalo'|'website'
  note        TEXT,                     -- ghi chú nội bộ
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_phone  CHECK (phone ~ '^0\d{9}$'),
  CONSTRAINT valid_source CHECK (source IN ('call','walk-in','facebook','zalo','website'))
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 6. BOOKINGS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID    NOT NULL REFERENCES customers(id),
  room_id       TEXT    NOT NULL REFERENCES rooms(id),
  booking_date  DATE    NOT NULL,
  start_time    TIME    NOT NULL,
  end_time      TIME    NOT NULL,
  is_overnight  BOOLEAN NOT NULL DEFAULT FALSE, -- TRUE nếu end_time qua 0h hôm sau
  people        INT     NOT NULL DEFAULT 1,
  status        TEXT    NOT NULL DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  channel       TEXT    DEFAULT 'website',
  -- 'website' | 'call' | 'facebook' | 'zalo' | 'walk-in'
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status  CHECK (status  IN ('pending','confirmed','in_use','cancelled','completed')),
  CONSTRAINT valid_channel CHECK (channel IN ('website','call','facebook','zalo','walk-in')),
  CONSTRAINT valid_people  CHECK (people >= 1 AND people <= 10),
  CONSTRAINT valid_times   CHECK (start_time <> end_time)
);

CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT NEW.is_overnight THEN
    IF EXISTS (
      SELECT 1 FROM bookings
      WHERE room_id      = NEW.room_id
        AND booking_date = NEW.booking_date
        AND id          != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND status      NOT IN ('cancelled')
        AND NOT is_overnight
        AND start_time   < NEW.end_time
        AND end_time     > NEW.start_time
    ) THEN
      RAISE EXCEPTION 'Phòng đã được đặt trong khung giờ này';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_overlap_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 7. ORDERS (Lượt gọi món) ──────────────────────────────
-- Mỗi booking có thể có nhiều lượt (gọi thêm sau)
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  note        TEXT,                         -- VD: 'gọi thêm lần 2', 'sau 30p'
  created_by  UUID DEFAULT NULL REFERENCES admin_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_order_status CHECK (status IN ('open','closed'))
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 8. ORDER ITEMS (Món trong từng lượt gọi) ──────────────
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES menu_items(id),
  quantity      INT  NOT NULL DEFAULT 1,
  unit_price    INT  NOT NULL, -- snapshot giá tại thời điểm gọi
  variant       TEXT DEFAULT NULL, -- VD: 'Bò', 'Gà'
  note          TEXT,             -- VD: 'ít đá', 'không hành'
  amount        INT  GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_quantity   CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price > 0)
);

-- ── 9. INVOICES (Hoá đơn) ─────────────────────────────────
-- Tạo khi kết ca — tổng hợp tiền phòng + tiền đồ + phụ thu
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL UNIQUE REFERENCES bookings(id),
  room_amount    INT  NOT NULL DEFAULT 0,
  food_amount    INT  NOT NULL DEFAULT 0, -- SUM từ order_items khi xuất hoá đơn
  surcharge      INT  NOT NULL DEFAULT 0, -- phụ thu (người thêm, đồ ngoài...)
  discount       INT  NOT NULL DEFAULT 0,
  total_amount   INT  GENERATED ALWAYS AS (room_amount + food_amount + surcharge - discount) STORED,
  payment_method TEXT DEFAULT NULL,       -- 'cash' | 'transfer' | 'mixed'
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid' | 'deposit' | 'paid'
  deposit_amount INT  NOT NULL DEFAULT 0,
  paid_at        TIMESTAMPTZ DEFAULT NULL,
  created_by     UUID DEFAULT NULL REFERENCES admin_users(id),
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_payment_method CHECK (payment_method IS NULL OR payment_method IN ('cash','transfer','mixed')),
  CONSTRAINT valid_payment_status CHECK (payment_status IN ('unpaid','deposit','paid')),
  CONSTRAINT non_negative_amounts CHECK (room_amount >= 0 AND food_amount >= 0 AND surcharge >= 0 AND discount >= 0)
);

CREATE TRIGGER invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 10. INVOICE ITEMS (Chi tiết dòng hoá đơn) ─────────────
-- Snapshot hoàn chỉnh khi xuất — không đổi dù giá/menu thay đổi sau
CREATE TABLE IF NOT EXISTS invoice_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type      TEXT         NOT NULL,  -- 'room' | 'food' | 'surcharge' | 'discount'
  description    TEXT         NOT NULL,  -- VD: 'Cine 1 (09:00–11:00)', 'Trà Đào x2'
  quantity       NUMERIC(6,2) NOT NULL DEFAULT 1,
  unit_price     INT          NOT NULL,
  amount         INT          GENERATED ALWAYS AS (ROUND(quantity * unit_price)::INT) STORED,
  order_item_id  UUID         DEFAULT NULL REFERENCES order_items(id) ON DELETE SET NULL,
  -- trace back về lượt gọi món gốc nếu cần
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_item_type  CHECK (item_type IN ('room','food','surcharge','discount')),
  CONSTRAINT valid_quantity   CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0)
);

-- ── 11. REVIEWS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID    DEFAULT NULL REFERENCES customers(id),
  room_id     TEXT    DEFAULT NULL REFERENCES rooms(id),
  rating      INT     NOT NULL,
  visit_type  TEXT    DEFAULT NULL, -- 'couple'|'group'|'party'|'solo'|'work'
  source      TEXT    DEFAULT NULL, -- 'TikTok'|'Facebook'|'Google'|...
  content     TEXT    NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_rating  CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_content CHECK (LENGTH(content) >= 10)
);

-- ══ Row Level Security ══════════════════════════════════════
ALTER TABLE admin_users   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing       ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers     ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews       ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "rooms_public_read"   ON rooms      FOR SELECT USING (is_active = TRUE);
CREATE POLICY "pricing_public_read" ON pricing    FOR SELECT USING (TRUE);
CREATE POLICY "menu_public_read"    ON menu_items FOR SELECT USING (is_available = TRUE);
CREATE POLICY "reviews_public_read" ON reviews    FOR SELECT USING (is_approved = TRUE);

-- Customers & bookings: public INSERT, service key toàn quyền
CREATE POLICY "customers_public_insert" ON customers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "bookings_public_insert"  ON bookings  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "customers_service_all"   ON customers FOR ALL USING (TRUE);
CREATE POLICY "bookings_service_all"    ON bookings  FOR ALL USING (TRUE);

-- Orders, invoices, admin: chỉ service key
CREATE POLICY "orders_service_all"        ON orders        FOR ALL USING (TRUE);
CREATE POLICY "order_items_service_all"   ON order_items   FOR ALL USING (TRUE);
CREATE POLICY "invoices_service_all"      ON invoices      FOR ALL USING (TRUE);
CREATE POLICY "invoice_items_service_all" ON invoice_items FOR ALL USING (TRUE);
CREATE POLICY "admin_service_only"        ON admin_users   FOR ALL USING (TRUE);

-- ══ Indexes ════════════════════════════════════════════════
CREATE INDEX idx_bookings_room_date   ON bookings(room_id, booking_date);
CREATE INDEX idx_bookings_date        ON bookings(booking_date);
CREATE INDEX idx_bookings_status      ON bookings(status);
CREATE INDEX idx_bookings_customer    ON bookings(customer_id);
CREATE INDEX idx_customers_phone      ON customers(phone);
CREATE INDEX idx_orders_booking       ON orders(booking_id);
CREATE INDEX idx_order_items_order    ON order_items(order_id);
CREATE INDEX idx_order_items_menu     ON order_items(menu_item_id);
CREATE INDEX idx_invoices_booking     ON invoices(booking_id);
CREATE INDEX idx_invoice_items_inv    ON invoice_items(invoice_id);
CREATE INDEX idx_menu_tab_cat         ON menu_items(tab, category);
CREATE INDEX idx_reviews_created      ON reviews(created_at DESC);
CREATE INDEX idx_pricing_lookup       ON pricing(room_type, day_type, time_slot);
