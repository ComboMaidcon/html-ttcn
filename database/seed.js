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

  console.log('\n🎉  Seed hoàn tất!\n');
  console.log('Bước tiếp theo:');
  console.log('  → Đăng nhập admin tại /admin với email/password trong .env');
  console.log('  → Kiểm tra bảng giá: SELECT * FROM pricing ORDER BY room_type, day_type, time_slot;');
}

seed().catch((err) => {
  console.error('💥  Seed thất bại:', err.message);
  process.exit(1);
});
