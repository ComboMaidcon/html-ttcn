-- ════════════════════════════════════════════════════════════
-- UPDATE DATABASE SCRIPT
-- Chạy file này trên Supabase SQL Editor để cập nhật DB
-- Hỗ trợ: Mã giảm giá (Voucher), Giảm giá trực tiếp (VNĐ), 
-- và Gộp nhiều Booking (Phòng) vào 1 Hoá đơn.
-- ════════════════════════════════════════════════════════════

-- 1. THÊM BẢNG QUẢN LÝ MÃ GIẢM GIÁ (DISCOUNTS)
CREATE TABLE IF NOT EXISTS discounts (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code           TEXT         UNIQUE NOT NULL,   -- Ví dụ: 'SALE50K', 'VIP_ROOM1'
  description    TEXT,                           -- Ghi chú cho mã giảm giá
  discount_type  TEXT         NOT NULL,          -- 'percent' (phần trăm) hoặc 'fixed' (số tiền VNĐ)
  discount_value INT          NOT NULL,          -- Nếu percent thì là %, nếu fixed thì là ngàn VNĐ
  target_type    TEXT         NOT NULL DEFAULT 'all', -- 'all' (áp dụng mọi nơi), 'room' (chỉ phòng cụ thể), 'customer' (chỉ khách cụ thể)
  target_id      TEXT         DEFAULT NULL,      -- ID của phòng hoặc UUID của khách hàng tương ứng
  max_uses       INT          DEFAULT NULL,      -- Giới hạn số lượng áp dụng (áp dụng theo số lượng)
  used_count     INT          NOT NULL DEFAULT 0,
  valid_from     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  valid_until    TIMESTAMPTZ  DEFAULT NULL,      -- Thời hạn của mã
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_discount_type CHECK (discount_type IN ('percent', 'fixed')),
  CONSTRAINT valid_discount_value CHECK (
    (discount_type = 'percent' AND discount_value > 0 AND discount_value <= 100) OR
    (discount_type = 'fixed' AND discount_value > 0)
  ),
  CONSTRAINT valid_target_type CHECK (target_type IN ('all', 'room', 'customer'))
);

CREATE TRIGGER discounts_updated_at
  BEFORE UPDATE ON discounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- 2. SỬA ĐỔI BẢNG HOÁ ĐƠN (INVOICES) ĐỂ HỖ TRỢ GỘP NHIỀU PHÒNG
-- Bỏ ràng buộc 1 Booking = 1 Invoice cũ
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_fkey;
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_booking_id_key;

-- Thêm cột customer_id vào hoá đơn (vì 1 hoá đơn giờ thuộc về 1 khách thay vì 1 booking)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id) ON DELETE SET NULL;

-- Cập nhật dữ liệu customer_id cho các hoá đơn cũ (nếu có)
UPDATE invoices
SET customer_id = bookings.customer_id
FROM bookings
WHERE invoices.booking_id = bookings.id;

-- Bây giờ có thể xoá cột booking_id khỏi bảng invoices
ALTER TABLE invoices DROP COLUMN IF EXISTS booking_id;


-- 3. THÊM MỐI LIÊN KẾT TỪ BOOKING ĐẾN INVOICE
-- Thêm cột invoice_id vào bookings để biết phòng này đã thanh toán ở bill nào
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS invoice_id UUID DEFAULT NULL REFERENCES invoices(id) ON DELETE SET NULL;


-- 4. THÊM LỊCH SỬ ÁP DỤNG MÃ GIẢM GIÁ (Tuỳ chọn để lưu vết)
CREATE TABLE IF NOT EXISTS invoice_discounts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id    UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  discount_id   UUID NOT NULL REFERENCES discounts(id),
  applied_value INT  NOT NULL, -- Số tiền thực tế được giảm
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- 5. BẬT ROW LEVEL SECURITY CHO BẢNG MỚI
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "discounts_public_read" ON discounts FOR SELECT USING (is_active = TRUE);
CREATE POLICY "discounts_service_all" ON discounts FOR ALL USING (TRUE);
CREATE POLICY "invoice_discounts_service_all" ON invoice_discounts FOR ALL USING (TRUE);
