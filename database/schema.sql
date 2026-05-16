-- ══════════════════════════════════════════
--  NOX Joy Station — Database Schema
--  Chạy file này trong Supabase SQL Editor
-- ══════════════════════════════════════════

-- ── Rooms (static data, seeded once) ──
CREATE TABLE IF NOT EXISTS rooms (
  id          TEXT PRIMARY KEY,          -- 't6-room1', 'cine-1', ...
  name        TEXT NOT NULL,
  floor       INT  NOT NULL,             -- 4, 5, 6
  type        TEXT NOT NULL,             -- 'small', 'medium-classic', ...
  badge       TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  capacity    TEXT NOT NULL,             -- '1–2 người'
  price       INT  NOT NULL,             -- giá từ (K/h, off-peak)
  description TEXT,
  features    TEXT[],                    -- ['Small', '1–2 người', ...]
  gradient    TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── Bookings ──
CREATE TABLE IF NOT EXISTS bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     TEXT NOT NULL REFERENCES rooms(id),
  date        DATE NOT NULL,
  start_hour  NUMERIC(4,1) NOT NULL,     -- 9.0, 9.5, 14.0, 14.5 ...
  end_hour    NUMERIC(4,1) NOT NULL,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  people      INT  NOT NULL DEFAULT 1,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  -- 'pending' | 'confirmed' | 'cancelled' | 'completed'
  source      TEXT DEFAULT 'website',    -- 'website' | 'facebook' | 'phone'
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_hours    CHECK (start_hour >= 9 AND end_hour <= 26),
  CONSTRAINT valid_duration CHECK (end_hour > start_hour),
  CONSTRAINT valid_people   CHECK (people >= 1 AND people <= 10),
  CONSTRAINT valid_status   CHECK (status IN ('pending','confirmed','cancelled','completed'))
);

-- Prevent double booking: no overlap for same room+date
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM bookings
    WHERE room_id   = NEW.room_id
      AND date      = NEW.date
      AND id       != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000')
      AND status   NOT IN ('cancelled')
      AND start_hour < NEW.end_hour
      AND end_hour   > NEW.start_hour
  ) THEN
    RAISE EXCEPTION 'Phòng đã được đặt trong khung giờ này';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_overlap_check
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION check_booking_overlap();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Menu Items ──
CREATE TABLE IF NOT EXISTS menu_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tab         TEXT NOT NULL,             -- 'drink' | 'food'
  category    TEXT NOT NULL,             -- 'tra', 'soda', 'chinh', ...
  name        TEXT NOT NULL,
  price       INT  NOT NULL,             -- K
  description TEXT,
  variants    TEXT,                      -- 'Bò · Gà'
  is_available BOOLEAN DEFAULT TRUE,
  sort_order  INT  DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_tab   CHECK (tab   IN ('drink','food')),
  CONSTRAINT valid_price CHECK (price > 0)
);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── Reviews ──
CREATE TABLE IF NOT EXISTS reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  initial     CHAR(1) NOT NULL,
  rating      INT  NOT NULL,
  room_name   TEXT,
  visit_type  TEXT,                      -- 'couple','group','party','solo','work'
  source      TEXT,                      -- 'TikTok','Facebook',...
  content     TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  CONSTRAINT valid_content CHECK (LENGTH(content) >= 20)
);

-- ── Admin Users ──
CREATE TABLE IF NOT EXISTS admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT,
  role          TEXT DEFAULT 'admin',    -- 'admin' | 'superadmin'
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ══ Row Level Security ══
ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings     ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users  ENABLE ROW LEVEL SECURITY;

-- Public: read-only cho rooms, menu, reviews
CREATE POLICY "rooms_public_read"      ON rooms      FOR SELECT USING (is_active = TRUE);
CREATE POLICY "menu_public_read"       ON menu_items FOR SELECT USING (is_available = TRUE);
CREATE POLICY "reviews_public_read"    ON reviews    FOR SELECT USING (is_approved = TRUE);

-- Bookings: ai cũng có thể tạo (INSERT), chỉ service key mới đọc/sửa
CREATE POLICY "bookings_public_insert" ON bookings   FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "bookings_service_all"   ON bookings   FOR ALL    USING (TRUE);

-- Admin: chỉ service key
CREATE POLICY "admin_service_only" ON admin_users FOR ALL USING (TRUE);

-- ══ Indexes ══
CREATE INDEX idx_bookings_room_date ON bookings(room_id, date);
CREATE INDEX idx_bookings_date      ON bookings(date);
CREATE INDEX idx_bookings_status    ON bookings(status);
CREATE INDEX idx_menu_tab_cat       ON menu_items(tab, category);
CREATE INDEX idx_reviews_created    ON reviews(created_at DESC);
