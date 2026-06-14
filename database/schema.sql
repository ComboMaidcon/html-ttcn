-- ════════════════════════════════════════════════════════════
-- NOX JOY STATION — Database Schema (Full + Extensions)
-- ════════════════════════════════════════════════════════════

-- ── Shared: tự cập nhật updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- Alias để tương thích trigger cũ
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;


-- ════════════════════════════════════════════════════════════
-- 1. ADMIN USERS
--    Tài khoản nhân viên & quản trị viên đăng nhập Dashboard
--    role: staff (nhận đơn, gọi món) | admin | superadmin
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT    UNIQUE NOT NULL,
  password_hash TEXT    NOT NULL,
  name          TEXT,
  role          TEXT    NOT NULL DEFAULT 'staff',  -- 'staff'|'admin'|'superadmin'
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  last_login    TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_role CHECK (role IN ('staff','admin','superadmin'))
);


-- ════════════════════════════════════════════════════════════
-- 2. ROOMS
--    Danh mục phòng — loại, sức chứa, phụ thu người thêm
--    discount_percent: giảm giá riêng cho từng phòng (0 = không giảm)
--    panorama: URL ảnh 360° equirectangular (Supabase Storage)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rooms (
  id                    TEXT    PRIMARY KEY,        -- 't6-room1', 'cine-1', ...
  name                  TEXT    NOT NULL,           -- 'Room 1', 'Cine 1', ...
  floor                 INT     NOT NULL,           -- 4, 5, 6
  type                  TEXT    NOT NULL,           -- 'small'|'classic'|'deluxe'|'big'|'cine'|'suite'
  capacity_min          INT     NOT NULL DEFAULT 1,
  capacity_max          INT     NOT NULL,
  surcharge_per_person  INT     NOT NULL DEFAULT 0, -- phụ thu/người (k VNĐ)
  surcharge_from_person INT     DEFAULT NULL,       -- áp từ người thứ mấy
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  discount_percent      NUMERIC(5,2) NOT NULL DEFAULT 0, -- % giảm giá riêng của phòng này
  panorama              TEXT    DEFAULT NULL,        -- URL ảnh 360° để xem trực tuyến
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_type     CHECK (type IN ('small','classic','deluxe','big','cine','suite')),
  CONSTRAINT valid_floor    CHECK (floor IN (4,5,6)),
  CONSTRAINT valid_capacity CHECK (capacity_max >= capacity_min AND capacity_min >= 1),
  CONSTRAINT valid_discount CHECK (discount_percent >= 0 AND discount_percent <= 100)
);


-- ════════════════════════════════════════════════════════════
-- 3. PRICING
--    Bảng giá theo loại phòng × khung giờ × loại ngày
--    Dùng khi tính tiền phòng trong invoices.js
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pricing (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type      TEXT NOT NULL,
  day_type       TEXT NOT NULL,  -- 'weekday' (T2-T6) | 'weekend' (T7-CN/lễ)
  time_slot      TEXT NOT NULL,  -- 'morning' (09-17h) | 'evening' (17-02h)
  price_per_hour INT  NOT NULL,  -- k VNĐ/giờ
  base_people    INT  NOT NULL DEFAULT 1,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_day_type  CHECK (day_type  IN ('weekday','weekend')),
  CONSTRAINT valid_time_slot CHECK (time_slot IN ('morning','evening')),
  CONSTRAINT valid_room_type CHECK (room_type IN ('small','classic','deluxe','big','cine','suite')),
  CONSTRAINT valid_price     CHECK (price_per_hour > 0),
  UNIQUE (room_type, day_type, time_slot)
);

INSERT INTO pricing (room_type, day_type, time_slot, price_per_hour, base_people) VALUES
  ('cine',    'weekday', 'morning',  75, 1), ('cine',    'weekday', 'evening', 109, 1),
  ('suite',   'weekday', 'morning',  99, 1), ('suite',   'weekday', 'evening', 135, 1),
  ('small',   'weekday', 'morning',  59, 2), ('small',   'weekday', 'evening',  89, 2),
  ('classic', 'weekday', 'morning',  79, 3), ('classic', 'weekday', 'evening', 109, 3),
  ('deluxe',  'weekday', 'morning',  99, 4), ('deluxe',  'weekday', 'evening', 135, 4),
  ('big',     'weekday', 'morning', 139, 6), ('big',     'weekday', 'evening', 219, 6),
  ('cine',    'weekend', 'morning',  89, 1), ('cine',    'weekend', 'evening', 129, 1),
  ('suite',   'weekend', 'morning', 109, 1), ('suite',   'weekend', 'evening', 159, 1),
  ('small',   'weekend', 'morning',  65, 2), ('small',   'weekend', 'evening', 109, 2),
  ('classic', 'weekend', 'morning',  89, 3), ('classic', 'weekend', 'evening', 129, 3),
  ('deluxe',  'weekend', 'morning', 119, 4), ('deluxe',  'weekend', 'evening', 169, 4),
  ('big',     'weekend', 'morning', 149, 6), ('big',     'weekend', 'evening', 249, 6)
ON CONFLICT (room_type, day_type, time_slot) DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- 4. MENU ITEMS
--    Thực đơn đồ ăn & đồ uống — phân tab/category
--    image_url: ảnh minh hoạ từ Supabase Storage (bucket: menu-images)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS menu_items (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tab           TEXT    NOT NULL,   -- 'drink' | 'food'
  category      TEXT    NOT NULL,   -- 'tra'|'soda'|'khoang'|'topping'|'chinh'|'chien'|'snack'
  name          TEXT    NOT NULL,
  price         INT     NOT NULL,   -- k VNĐ
  variants      TEXT    DEFAULT NULL, -- hiển thị tuỳ chọn: 'Size M · Size L'
  is_available  BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order    INT     NOT NULL DEFAULT 0,
  image_url     TEXT    DEFAULT NULL, -- URL ảnh từ Supabase Storage
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_tab   CHECK (tab   IN ('drink','food')),
  CONSTRAINT valid_price CHECK (price > 0)
);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 5. CUSTOMERS
--    Thông tin khách đặt phòng — định danh bằng SĐT
--
--    VIP tự động:
--      total_hours          : tổng giờ chơi tích lũy (tự cộng sau mỗi booking completed)
--      is_vip               : TRUE khi đủ ngưỡng giờ (xem trigger trg_auto_vip)
--      vip_since            : thời điểm được gắn VIP (auto hoặc admin thủ công)
--      vip_discount_percent : % giảm áp lên tiền phòng + tiền đồ (mặc định 10%)
--
--    Admin có thể gắn VIP thủ công bất cứ lúc nào qua PATCH /api/customers/:id/vip
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS customers (
  id                   UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT    NOT NULL,
  phone                TEXT    NOT NULL UNIQUE,      -- định danh chính
  source               TEXT    DEFAULT 'walk-in',    -- 'call'|'walk-in'|'facebook'|'zalo'|'website'
  note                 TEXT,                         -- ghi chú nội bộ
  total_hours          NUMERIC(8,1) NOT NULL DEFAULT 0,  -- tổng giờ đã chơi (tự cập nhật)
  is_vip               BOOLEAN NOT NULL DEFAULT FALSE,
  vip_since            TIMESTAMPTZ DEFAULT NULL,
  vip_discount_percent NUMERIC(5,2) NOT NULL DEFAULT 10, -- % giảm giá VIP
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_phone       CHECK (phone ~ '^0\d{9}$'),
  CONSTRAINT valid_source      CHECK (source IN ('call','walk-in','facebook','zalo','website')),
  CONSTRAINT valid_vip_discount CHECK (vip_discount_percent >= 0 AND vip_discount_percent <= 100)
);

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_vip ON customers(is_vip) WHERE is_vip = TRUE;


-- ════════════════════════════════════════════════════════════
-- 6. BOOKINGS
--    Lịch đặt phòng — kiểm tra xung đột qua trigger + API
-- ════════════════════════════════════════════════════════════
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
  -- 'pending' | 'confirmed' | 'in_use' | 'cancelled' | 'completed'
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

-- Trigger kiểm tra xung đột lịch khi INSERT/UPDATE
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


-- ════════════════════════════════════════════════════════════
-- AUTO VIP TRIGGER
--    Tự động chạy sau mỗi lần booking chuyển → 'completed'
--    1. Cộng dồn total_hours của khách
--    2. Nếu total_hours >= 20 và chưa VIP → gắn VIP 10%
--    Ngưỡng: thay VIP_THRESHOLD nếu muốn đổi (mặc định 20h)
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION auto_update_customer_vip()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id   UUID;
  v_total_hours   NUMERIC;
  v_already_vip   BOOLEAN;
  VIP_THRESHOLD   CONSTANT NUMERIC := 20;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  v_customer_id := NEW.customer_id;
  IF v_customer_id IS NULL THEN RETURN NEW; END IF;

  SELECT is_vip INTO v_already_vip
  FROM customers WHERE id = v_customer_id;

  SELECT COALESCE(SUM(
    CASE
      WHEN end_time <= start_time OR is_overnight = TRUE
        THEN EXTRACT(EPOCH FROM (end_time::TIME - start_time::TIME + INTERVAL '24 hours')) / 3600
      ELSE
        EXTRACT(EPOCH FROM (end_time::TIME - start_time::TIME)) / 3600
    END
  ), 0)
  INTO v_total_hours
  FROM bookings
  WHERE customer_id = v_customer_id AND status = 'completed';

  UPDATE customers SET total_hours = v_total_hours WHERE id = v_customer_id;

  IF NOT v_already_vip AND v_total_hours >= VIP_THRESHOLD THEN
    UPDATE customers
    SET is_vip = TRUE, vip_since = NOW(), vip_discount_percent = 10
    WHERE id = v_customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_vip ON bookings;
CREATE TRIGGER trg_auto_vip
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_update_customer_vip();


-- ════════════════════════════════════════════════════════════
-- 7. ORDERS — Lượt gọi món
--    1 booking có thể có nhiều lượt (gọi thêm sau)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS orders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'open', -- 'open' | 'closed'
  note        TEXT,
  created_by  UUID DEFAULT NULL REFERENCES admin_users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_order_status CHECK (status IN ('open','closed'))
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ════════════════════════════════════════════════════════════
-- 8. ORDER ITEMS — Chi tiết món trong từng lượt gọi
--    amount tự tính = quantity × unit_price (Generated Column)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES menu_items(id),
  quantity      INT  NOT NULL DEFAULT 1,
  unit_price    INT  NOT NULL,  -- snapshot giá tại thời điểm gọi
  variant       TEXT DEFAULT NULL,
  note          TEXT,
  amount        INT  GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_quantity   CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price > 0)
);


-- ════════════════════════════════════════════════════════════
-- 9. INVOICES — Hoá đơn kết ca
--    Tổng hợp tiền phòng + đồ + phụ thu - giảm giá
--    discount gồm: giảm phòng (%) + giảm VIP (%) + thủ công
--    total_amount tự tính (Generated Column)
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     UUID NOT NULL UNIQUE REFERENCES bookings(id),
  room_amount    INT  NOT NULL DEFAULT 0,
  food_amount    INT  NOT NULL DEFAULT 0,
  surcharge      INT  NOT NULL DEFAULT 0,
  discount       INT  NOT NULL DEFAULT 0,  -- tổng tất cả giảm giá (phòng + VIP + tay)
  total_amount   INT  GENERATED ALWAYS AS (room_amount + food_amount + surcharge - discount) STORED,
  payment_method TEXT DEFAULT NULL,        -- 'cash'|'transfer'|'mixed'
  payment_status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid'|'deposit'|'paid'
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


-- ════════════════════════════════════════════════════════════
-- 10. INVOICE ITEMS — Dòng chi tiết hoá đơn
--     Snapshot tại thời điểm xuất — không thay đổi dù giá sau đổi
--     item_type 'discount' ghi rõ: 'Giảm giá phòng (10%)', 'Giảm VIP (10%)'...
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoice_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id     UUID         NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type      TEXT         NOT NULL,  -- 'room'|'food'|'surcharge'|'discount'
  description    TEXT         NOT NULL,
  quantity       NUMERIC(6,2) NOT NULL DEFAULT 1,
  unit_price     INT          NOT NULL,
  amount         INT          GENERATED ALWAYS AS (ROUND(quantity * unit_price)::INT) STORED,
  order_item_id  UUID         DEFAULT NULL REFERENCES order_items(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_item_type  CHECK (item_type IN ('room','food','surcharge','discount')),
  CONSTRAINT valid_quantity   CHECK (quantity > 0),
  CONSTRAINT valid_unit_price CHECK (unit_price >= 0)
);


-- ════════════════════════════════════════════════════════════
-- 11. REVIEWS — Đánh giá từ khách
--     is_approved: admin duyệt trước khi hiện công khai
-- ════════════════════════════════════════════════════════════
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


-- ════════════════════════════════════════════════════════════
-- 12. ROOM PROMOTIONS — Giảm giá theo ngày / hạng phòng
--     Dành cho bạn kia mở rộng logic tính giá
--
--     room_type = NULL  → áp dụng tất cả hạng phòng
--     room_type = 'big' → chỉ phòng Big
--     day_of_week = NULL       → mọi ngày
--     day_of_week = '[1]'      → chỉ thứ 2
--     day_of_week = '[0,6]'    → cuối tuần (CN=0, T7=6)
--     day_of_week = '[1,2,3,4,5]' → ngày thường
--
--     Khi tính giá: query promotion active theo booking_date + room_type,
--     lấy mức giảm cao nhất rồi áp vào room_amount.
-- ════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS room_promotions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT         NOT NULL,       -- 'Flash Sale Thứ 2', 'Giảm Big cuối tuần'...
  room_type        TEXT         DEFAULT NULL,   -- NULL = tất cả hạng phòng
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  valid_from       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  valid_until      TIMESTAMPTZ  DEFAULT NULL,   -- NULL = không hết hạn
  day_of_week      JSONB        DEFAULT NULL,   -- [0,6] = cuối tuần, NULL = mọi ngày
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_by       UUID         DEFAULT NULL REFERENCES admin_users(id),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_promo_discount CHECK (discount_percent >= 0 AND discount_percent <= 100),
  CONSTRAINT valid_promo_room_type CHECK (
    room_type IS NULL OR
    room_type IN ('small','classic','deluxe','big','cine','suite')
  )
);

CREATE TRIGGER room_promotions_updated_at
  BEFORE UPDATE ON room_promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_room_promotions_active
  ON room_promotions(is_active, valid_from, valid_until);

ALTER TABLE room_promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "room_promotions_service_only"
  ON room_promotions FOR ALL USING (false);

-- Seed mẫu
INSERT INTO room_promotions (name, room_type, discount_percent, day_of_week)
VALUES
  ('Flash Sale Thứ 2', NULL,    15, '[1]'  ),
  ('Giảm Big cuối tuần', 'big', 10, '[0,6]')
ON CONFLICT DO NOTHING;


-- ════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ════════════════════════════════════════════════════════════
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

-- Public: xem phòng, giá, menu, review đã duyệt
CREATE POLICY "rooms_public_read"   ON rooms      FOR SELECT USING (is_active = TRUE);
CREATE POLICY "pricing_public_read" ON pricing    FOR SELECT USING (TRUE);
CREATE POLICY "menu_public_read"    ON menu_items FOR SELECT USING (is_available = TRUE);
CREATE POLICY "reviews_public_read" ON reviews    FOR SELECT USING (is_approved = TRUE);

-- Khách đặt phòng online: INSERT customers + bookings không cần đăng nhập
CREATE POLICY "customers_public_insert" ON customers FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "bookings_public_insert"  ON bookings  FOR INSERT WITH CHECK (TRUE);

-- Service key toàn quyền
CREATE POLICY "customers_service_all"     ON customers     FOR ALL USING (TRUE);
CREATE POLICY "bookings_service_all"      ON bookings      FOR ALL USING (TRUE);
CREATE POLICY "orders_service_all"        ON orders        FOR ALL USING (TRUE);
CREATE POLICY "order_items_service_all"   ON order_items   FOR ALL USING (TRUE);
CREATE POLICY "invoices_service_all"      ON invoices      FOR ALL USING (TRUE);
CREATE POLICY "invoice_items_service_all" ON invoice_items FOR ALL USING (TRUE);
CREATE POLICY "admin_service_only"        ON admin_users   FOR ALL USING (TRUE);


-- ════════════════════════════════════════════════════════════
-- INDEXES
-- ════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_bookings_room_date  ON bookings(room_id, booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_date       ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_status     ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_customer   ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_vip       ON customers(is_vip) WHERE is_vip = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_booking      ON orders(booking_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu    ON order_items(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_invoices_booking    ON invoices(booking_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_inv   ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_menu_tab_cat        ON menu_items(tab, category);
CREATE INDEX IF NOT EXISTS idx_reviews_created     ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pricing_lookup      ON pricing(room_type, day_type, time_slot);
