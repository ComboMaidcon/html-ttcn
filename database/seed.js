/**
 * Seed: tạo dữ liệu mẫu vào Supabase
 * Chạy: node database/seed.js
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function seed() {
  console.log('🌱 Seeding NOX database...\n');

  // ── 1. Rooms ──
  const rooms = [
    { id:'t6-room1', name:'Room 1', floor:6, type:'small',          badge:'Small',          emoji:'🎮', capacity:'1–2 người', price:59,  description:'Phòng Small private tầng 6 — ấm cúng cho 1–2 người.', features:['Small','1–2 người','Boardgame free','Tầng 6'] },
    { id:'t6-room2', name:'Room 2', floor:6, type:'medium-deluxe',  badge:'Medium Deluxe',  emoji:'⭐', capacity:'1–4 người', price:99,  description:'Phòng Medium Deluxe tầng 6 — rộng rãi cho 1–4 người. Phổ biến nhất!', features:['Medium Deluxe','1–4 người','Boardgame free','Tầng 6'] },
    { id:'t6-room3', name:'Room 3', floor:6, type:'small',          badge:'Small',          emoji:'🎮', capacity:'1–2 người', price:59,  description:'Phòng Small private tầng 6 — riêng tư cho 1–2 người hẹn hò.', features:['Small','1–2 người','Boardgame free','Tầng 6'] },
    { id:'t6-room4', name:'Room 4', floor:6, type:'medium-classic', badge:'Medium Classic', emoji:'🕹️', capacity:'1–3 người', price:79,  description:'Phòng Medium Classic tầng 6 — cân bằng không gian & giá cho nhóm 3.', features:['Medium Classic','1–3 người','Boardgame free','Tầng 6'] },
    { id:'t6-big',   name:'Big Room',floor:6,type:'big',            badge:'Big Room',       emoji:'🎉', capacity:'1–8 người', price:139, description:'Phòng lớn nhất tầng 6 — sinh nhật, nhóm đông tới 8 người.', features:['Big Room','1–8 người','Boardgame free','Tầng 6'] },
    { id:'t5-room1', name:'Room 1', floor:5, type:'medium-deluxe',  badge:'Medium Deluxe',  emoji:'⭐', capacity:'1–4 người', price:99,  description:'Phòng Medium Deluxe tầng 5 — rộng, thoải mái cho 1–4 người.', features:['Medium Deluxe','1–4 người','Boardgame free','Tầng 5'] },
    { id:'t5-room2', name:'Room 2', floor:5, type:'medium-classic', badge:'Medium Classic', emoji:'🕹️', capacity:'1–3 người', price:79,  description:'Phòng Medium Classic tầng 5 — lựa chọn tốt cho nhóm 3 người.', features:['Medium Classic','1–3 người','Boardgame free','Tầng 5'] },
    { id:'t5-room3', name:'Room 3', floor:5, type:'small',          badge:'Small',          emoji:'🎮', capacity:'1–2 người', price:59,  description:'Phòng Small private tầng 5 — nhỏ gọn, riêng tư cho 1–2 người.', features:['Small','1–2 người','Boardgame free','Tầng 5'] },
    { id:'t5-room4', name:'Room 4', floor:5, type:'small',          badge:'Small',          emoji:'🎮', capacity:'1–2 người', price:59,  description:'Phòng Small private tầng 5 — hoàn hảo cho couple hoặc solo chill.', features:['Small','1–2 người','Boardgame free','Tầng 5'] },
    { id:'t5-big',   name:'Big Room',floor:5,type:'big',            badge:'Big Room',       emoji:'🎉', capacity:'1–8 người', price:139, description:'Phòng lớn nhất tầng 5 — party game cho nhóm đến 8 người.', features:['Big Room','1–8 người','Boardgame free','Tầng 5'] },
    { id:'cine-1',   name:'Cine 1', floor:4, type:'cine',           badge:'Cine',           emoji:'🎬', capacity:'1–3 người', price:75,  description:'Phòng Cine tầng 4 — màn chiếu lớn, âm thanh chuẩn rạp.', features:['Cine Box','Màn chiếu lớn','Netflix/Disney+','Tầng 4'] },
    { id:'cine-2',   name:'Cine 2', floor:4, type:'cine',           badge:'Cine',           emoji:'🎬', capacity:'1–3 người', price:75,  description:'Phòng Cine tầng 4 — xem phim riêng tư, loa surround.', features:['Cine Box','Loa Surround','Netflix/Disney+','Tầng 4'] },
    { id:'cine-3',   name:'Cine 3', floor:4, type:'cine',           badge:'Cine',           emoji:'🎬', capacity:'1–3 người', price:75,  description:'Phòng Cine tầng 4 — trải nghiệm phim 100% riêng tư.', features:['Cine Box','Màn chiếu lớn','Netflix/Disney+','Tầng 4'] },
    { id:'suite-1',  name:'Suite 1',floor:4, type:'suite',          badge:'Suite',          emoji:'🌟', capacity:'1–4 người', price:99,  description:'Suite Cine tầng 4 — màn chiếu lớn + sofa đôi cao cấp.', features:['Suite Cine','Sofa đôi','Netflix/Disney+','Tầng 4'] },
    { id:'suite-2',  name:'Suite 2',floor:4, type:'suite',          badge:'Suite',          emoji:'🌟', capacity:'1–4 người', price:99,  description:'Suite Cine tầng 4 — sang trọng nhất, ghế recliner cao cấp.', features:['Suite Cine','Ghế Recliner','Netflix/Disney+','Tầng 4'] },
  ];

  const { error: roomErr } = await supabase.from('rooms').upsert(rooms, { onConflict: 'id' });
  if (roomErr) console.error('❌ rooms:', roomErr.message);
  else console.log(`✅ Rooms: ${rooms.length} rows`);

  // ── 2. Menu Items ──
  const menu = [
    // Trà
    { tab:'drink', category:'tra',    name:'Trà Đào',           price:25 },
    { tab:'drink', category:'tra',    name:'Trà Tắc',           price:20 },
    { tab:'drink', category:'tra',    name:'Trà Dâu',           price:25 },
    { tab:'drink', category:'tra',    name:'Trà Xoài',          price:25 },
    { tab:'drink', category:'tra',    name:'Trà Dứa',           price:25 },
    { tab:'drink', category:'tra',    name:'Trà Ổi Hồng',       price:25 },
    { tab:'drink', category:'tra',    name:'Trà Đào Cam Sả',    price:30 },
    // Soda
    { tab:'drink', category:'soda',   name:'Soda Dâu',          price:25 },
    { tab:'drink', category:'soda',   name:'Soda Ổi Hồng',      price:25 },
    { tab:'drink', category:'soda',   name:'Soda Cam Đào',      price:30 },
    { tab:'drink', category:'soda',   name:'Soda Dứa',          price:25 },
    { tab:'drink', category:'soda',   name:'Soda Xoài Đào',     price:30 },
    // Khoáng
    { tab:'drink', category:'khoang', name:'Khoáng Xí Muội',    price:20 },
    { tab:'drink', category:'khoang', name:'Khoáng Chanh Local', price:20 },
    { tab:'drink', category:'khoang', name:'Khoáng Chanh Leo',  price:20 },
    // Topping
    { tab:'drink', category:'topping',name:'Trân Châu Trắng',   price:5 },
    { tab:'drink', category:'topping',name:'Nha Đam',           price:5 },
    { tab:'drink', category:'topping',name:'Thạch Nổ',          price:5 },
    { tab:'drink', category:'topping',name:'Thạch Dừa',         price:5 },
    // Món chính
    { tab:'food', category:'chinh',  name:'Pizza',              price:50, variants:'Bò · Gà' },
    { tab:'food', category:'chinh',  name:'Mỳ Trộn',           price:25, description:'Đặc biệt +10K', variants:'Đầy đủ · Đặc biệt' },
    { tab:'food', category:'chinh',  name:'Bổng Ngô',          price:30, variants:'Phô mai · Trứng muối · BBQ' },
    { tab:'food', category:'chinh',  name:'Khoai Chiên',       price:30, variants:'Nox · Phô mai · Tê cay' },
    { tab:'food', category:'chinh',  name:'Mỳ Ý',              price:35 },
    { tab:'food', category:'chinh',  name:'Mì Hảo Hảo',       price:15 },
    { tab:'food', category:'chinh',  name:'Mì Modern',         price:15 },
    // Đồ chiên
    { tab:'food', category:'chien',  name:'Mẹt Ăn Vặt',       price:50, description:'Size lớn 100K' },
    { tab:'food', category:'chien',  name:'Gà Viên',           price:35 },
    { tab:'food', category:'chien',  name:'Cá Viên Chiên Mắm', price:40 },
    { tab:'food', category:'chien',  name:'Nem Chua Rán',      price:35 },
    { tab:'food', category:'chien',  name:'Xúc Xích',          price:15 },
    { tab:'food', category:'chien',  name:'Gà Xiên',           price:8 },
    { tab:'food', category:'chien',  name:'Khoai Lang Kén',    price:30 },
    { tab:'food', category:'chien',  name:'Ngô Chiên',         price:30 },
    // Snack
    { tab:'food', category:'snack',  name:'Mì Trẻ Em HQ',     price:7 },
    { tab:'food', category:'snack',  name:'Mix Thái',          price:15 },
    { tab:'food', category:'snack',  name:'Snack Khoai Tây',   price:12 },
    { tab:'food', category:'snack',  name:'Khô Bò / Gà',      price:20, description:'Giá từ 20–25K' },
  ];

  const { error: menuErr } = await supabase.from('menu_items').insert(menu);
  if (menuErr) console.error('❌ menu_items:', menuErr.message);
  else console.log(`✅ Menu: ${menu.length} items`);

  // ── 3. Admin user ──
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'nox2025', 12);
  const { error: adminErr } = await supabase.from('admin_users').upsert([{
    email:         process.env.ADMIN_EMAIL || 'admin@noxjoystation.com',
    password_hash: hash,
    name:          'NOX Admin',
    role:          'superadmin',
  }], { onConflict: 'email' });
  if (adminErr) console.error('❌ admin_users:', adminErr.message);
  else console.log('✅ Admin user created');

  console.log('\n🎉 Seed complete!');
}

seed().catch(console.error);
