require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ─────────────────────────────────────────────
// Helper: log kết quả từng bước
// ─────────────────────────────────────────────
function log(label, error, count) {
  if (error) {
    console.error(`❌  ${label}:`, error.message);
    process.exit(1); // dừng ngay nếu lỗi — tránh seed dữ liệu thiếu
  }
  console.log(`✅  ${label}${count != null ? `: ${count} rows` : ''}`);
}

// ─────────────────────────────────────────────
async function seed() {
  console.log('Seeding NOX Joy Station \n');

  // ══════════════════════════════════════════
  // 1. ADMIN USERS
  // ══════════════════════════════════════════
  // Hash password từ .env — KHÔNG hardcode password thật vào đây
  const adminPassword = process.env.ADMIN_PASSWORD;
  const staffPassword = process.env.STAFF_PASSWORD;

  if (!adminPassword || !staffPassword) {
    console.error('  Thiếu ADMIN_PASSWORD hoặc STAFF_PASSWORD trong .env');
    process.exit(1);
  }

  const [adminHash, staffHash] = await Promise.all([
    bcrypt.hash(adminPassword, 12),
    bcrypt.hash(staffPassword, 12),
  ]);

  const admins = [
    {
      email:         process.env.ADMIN_EMAIL || 'admin@noxjoystation.com',
      password_hash: adminHash,
      name:          'NOX Admin',
      role:          'superadmin',
      is_active:     true,
    },
    {
      email:         process.env.STAFF_EMAIL || 'staff@noxjoystation.com',
      password_hash: staffHash,
      name:          'NOX Staff',
      role:          'staff',
      is_active:     true,
    },
  ];

  const { error: adminErr } = await supabase
    .from('admin_users')
    .upsert(admins, { onConflict: 'email' });
  log('admin_users', adminErr, admins.length);

  // ══════════════════════════════════════════
  // 2. ROOMS
  // Chỉ lưu thông tin nghiệp vụ — không có badge/emoji/gradient/features
  // Tầng 6: Room 1–4 + Big Room (game)
  // Tầng 5: Room 1–4 + Big Room (game)
  // Tầng 4: Cine 1–3 + Suite 1–2 (cine box)
  // Big Room: phụ thu 40k/người từ người thứ 7
  // ══════════════════════════════════════════
  const rooms = [
    // ── Tầng 6 ──
    {
      id:                    't6-room1',
      name:                  'Room 1',
      floor:                 6,
      type:                  'small',
      capacity_min:          1,
      capacity_max:          2,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't6-room2',
      name:                  'Room 2',
      floor:                 6,
      type:                  'deluxe',
      capacity_min:          1,
      capacity_max:          4,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't6-room3',
      name:                  'Room 3',
      floor:                 6,
      type:                  'small',
      capacity_min:          1,
      capacity_max:          2,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't6-room4',
      name:                  'Room 4',
      floor:                 6,
      type:                  'classic',
      capacity_min:          1,
      capacity_max:          3,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't6-big',
      name:                  'Big Room',
      floor:                 6,
      type:                  'big',
      capacity_min:          1,
      capacity_max:          8,
      surcharge_per_person:  40,  // 40k/người
      surcharge_from_person: 7,   // từ người thứ 7
    },
    // ── Tầng 5 ──
    {
      id:                    't5-room1',
      name:                  'Room 1',
      floor:                 5,
      type:                  'deluxe',
      capacity_min:          1,
      capacity_max:          4,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't5-room2',
      name:                  'Room 2',
      floor:                 5,
      type:                  'classic',
      capacity_min:          1,
      capacity_max:          3,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't5-room3',
      name:                  'Room 3',
      floor:                 5,
      type:                  'small',
      capacity_min:          1,
      capacity_max:          2,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't5-room4',
      name:                  'Room 4',
      floor:                 5,
      type:                  'small',
      capacity_min:          1,
      capacity_max:          2,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    't5-big',
      name:                  'Big Room',
      floor:                 5,
      type:                  'big',
      capacity_min:          1,
      capacity_max:          8,
      surcharge_per_person:  40,
      surcharge_from_person: 7,
    },
    // ── Tầng 4 (Cine Box) ──
    {
      id:                    'cine-1',
      name:                  'Cine 1',
      floor:                 4,
      type:                  'cine',
      capacity_min:          1,
      capacity_max:          3,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    'cine-2',
      name:                  'Cine 2',
      floor:                 4,
      type:                  'cine',
      capacity_min:          1,
      capacity_max:          3,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    'cine-3',
      name:                  'Cine 3',
      floor:                 4,
      type:                  'cine',
      capacity_min:          1,
      capacity_max:          3,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    'suite-1',
      name:                  'Suite 1',
      floor:                 4,
      type:                  'suite',
      capacity_min:          1,
      capacity_max:          4,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
    {
      id:                    'suite-2',
      name:                  'Suite 2',
      floor:                 4,
      type:                  'suite',
      capacity_min:          1,
      capacity_max:          4,
      surcharge_per_person:  0,
      surcharge_from_person: null,
    },
  ];

  const { error: roomErr } = await supabase
    .from('rooms')
    .upsert(rooms, { onConflict: 'id' });
  log('rooms', roomErr, rooms.length);

  // ══════════════════════════════════════════
  // 3. MENU ITEMS
  // Data từ 2 ảnh menu thực tế
  // sort_order dùng để giữ thứ tự hiển thị đúng như menu gốc
  // Mẹt ăn vặt có 2 size → lưu variants, price là giá thấp nhất
  // ══════════════════════════════════════════
  const menu = [
    // ── DRINK: Trà ──
    { tab: 'drink', category: 'tra', sort_order: 1,  name: 'Trà Đào',          price: 25, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 2,  name: 'Trà Tắc',          price: 20, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 3,  name: 'Trà Dâu',          price: 25, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 4,  name: 'Trà Xoài',         price: 25, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 5,  name: 'Trà Dứa',          price: 25, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 6,  name: 'Trà Ổi Hồng',      price: 25, variants: null },
    { tab: 'drink', category: 'tra', sort_order: 7,  name: 'Trà Đào Cam Sả',   price: 30, variants: null },

    // ── DRINK: Soda ──
    { tab: 'drink', category: 'soda', sort_order: 1, name: 'Soda Dâu',         price: 25, variants: null },
    { tab: 'drink', category: 'soda', sort_order: 2, name: 'Soda Ổi Hồng',     price: 25, variants: null },
    { tab: 'drink', category: 'soda', sort_order: 3, name: 'Soda Cam Đào',     price: 30, variants: null },
    { tab: 'drink', category: 'soda', sort_order: 4, name: 'Soda Dứa',         price: 25, variants: null },
    { tab: 'drink', category: 'soda', sort_order: 5, name: 'Soda Xoài Đào',    price: 30, variants: null },

    // ── DRINK: Khoáng ──
    { tab: 'drink', category: 'khoang', sort_order: 1, name: 'Khoáng Xí Muội',     price: 20, variants: null },
    { tab: 'drink', category: 'khoang', sort_order: 2, name: 'Khoáng Chanh Local',  price: 20, variants: null },
    { tab: 'drink', category: 'khoang', sort_order: 3, name: 'Khoáng Chanh Leo',    price: 20, variants: null },

    // ── DRINK: Topping (add-on, tính thêm vào đồ uống) ──
    { tab: 'drink', category: 'topping', sort_order: 1, name: 'Trân Châu Trắng', price: 5, variants: null },
    { tab: 'drink', category: 'topping', sort_order: 2, name: 'Nha Đam',         price: 5, variants: null },
    { tab: 'drink', category: 'topping', sort_order: 3, name: 'Thạch Nổ',        price: 5, variants: null },
    { tab: 'drink', category: 'topping', sort_order: 4, name: 'Thạch Dừa',       price: 5, variants: null },

    // ── FOOD: Món chính ──
    { tab: 'food', category: 'chinh', sort_order: 1, name: 'Pizza',       price: 50, variants: 'Bò · Gà' },
    { tab: 'food', category: 'chinh', sort_order: 2, name: 'Mỳ Trộn',    price: 25, variants: 'Đầy đủ · Đặc biệt' },
    // Mỳ Trộn Đặc biệt giá 35k — lưu vào variants, xử lý ở order_items.unit_price khi gọi
    { tab: 'food', category: 'chinh', sort_order: 3, name: 'Bỏng Ngô',   price: 30, variants: 'Phô mai · Trứng muối · BBQ' },
    { tab: 'food', category: 'chinh', sort_order: 4, name: 'Khoai Chiên', price: 30, variants: 'Nox · Phô mai · Tê cay' },
    { tab: 'food', category: 'chinh', sort_order: 5, name: 'Mỳ Ý',       price: 35, variants: null },
    { tab: 'food', category: 'chinh', sort_order: 6, name: 'Hảo Hảo',    price: 15, variants: null },
    { tab: 'food', category: 'chinh', sort_order: 7, name: 'Modern',      price: 15, variants: null },

    // ── FOOD: Đồ chiên ──
    { tab: 'food', category: 'chien', sort_order: 1, name: 'Mẹt Ăn Vặt',        price: 50,  variants: 'Nhỏ · Lớn' },
    // Size lớn 100k — nhân viên chọn variant và nhập unit_price đúng khi tạo order_item
    { tab: 'food', category: 'chien', sort_order: 2, name: 'Gà Viên',            price: 35,  variants: null },
    { tab: 'food', category: 'chien', sort_order: 3, name: 'Cá Viên Chiên Mắm',  price: 40,  variants: null },
    { tab: 'food', category: 'chien', sort_order: 4, name: 'Nem Chua Rán',       price: 35,  variants: null },
    { tab: 'food', category: 'chien', sort_order: 5, name: 'Xúc Xích',           price: 15,  variants: null },
    { tab: 'food', category: 'chien', sort_order: 6, name: 'Gà Xiên',            price: 8,   variants: null },
    { tab: 'food', category: 'chien', sort_order: 7, name: 'Khoai Lang Kén',     price: 30,  variants: null },
    { tab: 'food', category: 'chien', sort_order: 8, name: 'Ngô Chiên',          price: 30,  variants: null },

    // ── FOOD: Snack ──
    { tab: 'food', category: 'snack', sort_order: 1, name: 'Mì Trẻ Em HQ',   price: 7,  variants: null },
    { tab: 'food', category: 'snack', sort_order: 2, name: 'Mix Thái',        price: 15, variants: null },
    { tab: 'food', category: 'snack', sort_order: 3, name: 'Snack Khoai Tây', price: 12, variants: null },
    { tab: 'food', category: 'snack', sort_order: 4, name: 'Khô Bò / Gà',    price: 20, variants: 'Bò · Gà' },
    // Khô Bò/Gà giá 20–25k — nhân viên nhập unit_price thực tế khi gọi món
  ];

  // Dùng insert thay vì upsert vì menu_items không có natural key duy nhất
  // Nếu chạy seed lại, cần xoá menu cũ trước
  const { count: existingMenu } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true });

  if (existingMenu > 0) {
    console.log(`⚠️   menu_items đã có ${existingMenu} rows — bỏ qua để tránh duplicate`);
    console.log('    Nếu muốn seed lại: DELETE FROM menu_items; rồi chạy lại seed');
  } else {
    const { error: menuErr } = await supabase.from('menu_items').insert(menu);
    log('menu_items', menuErr, menu.length);
  }

  console.log('\n🎉  Seed hoàn tất!\n');
  console.log('Bước tiếp theo:');
  console.log('  → Đăng nhập admin tại /admin với email/password trong .env');
  console.log('  → Kiểm tra bảng giá: SELECT * FROM pricing ORDER BY room_type, day_type, time_slot;');
}

seed().catch((err) => {
  console.error('💥  Seed thất bại:', err.message);
  process.exit(1);
});
