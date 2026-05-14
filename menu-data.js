/* ══════════════════════════════════════
   NOX — Menu Data (localStorage-backed)
   ══════════════════════════════════════ */

const MENU_KEY = 'nox_menu_v1';

// Category definitions — tab + display metadata
const MENU_CATS = [
  { id:'tra',    tab:'drink', icon:'🍵', name:'Trà' },
  { id:'soda',   tab:'drink', icon:'🫧', name:'Soda' },
  { id:'khoang', tab:'drink', icon:'💧', name:'Khoáng' },
  { id:'topping',tab:'drink', icon:'✨', name:'Topping' },
  { id:'chinh',  tab:'food',  icon:'🍕', name:'Món chính' },
  { id:'chien',  tab:'food',  icon:'🍗', name:'Đồ chiên' },
  { id:'snack',  tab:'food',  icon:'🍿', name:'Snack' },
];

// Default items (seeded on first load)
const DEFAULT_ITEMS = [
  // ── Trà
  { id:'d1',  tab:'drink', cat:'tra',    name:'Trà Đào',         price:25, available:true },
  { id:'d2',  tab:'drink', cat:'tra',    name:'Trà Tắc',         price:20, available:true },
  { id:'d3',  tab:'drink', cat:'tra',    name:'Trà Dâu',         price:25, available:true },
  { id:'d4',  tab:'drink', cat:'tra',    name:'Trà Xoài',        price:25, available:true },
  { id:'d5',  tab:'drink', cat:'tra',    name:'Trà Dứa',         price:25, available:true },
  { id:'d6',  tab:'drink', cat:'tra',    name:'Trà Ổi Hồng',     price:25, available:true },
  { id:'d7',  tab:'drink', cat:'tra',    name:'Trà Đào Cam Sả',  price:30, available:true },
  // ── Soda
  { id:'d8',  tab:'drink', cat:'soda',   name:'Soda Dâu',        price:25, available:true },
  { id:'d9',  tab:'drink', cat:'soda',   name:'Soda Ổi Hồng',    price:25, available:true },
  { id:'d10', tab:'drink', cat:'soda',   name:'Soda Cam Đào',    price:30, available:true },
  { id:'d11', tab:'drink', cat:'soda',   name:'Soda Dứa',        price:25, available:true },
  { id:'d12', tab:'drink', cat:'soda',   name:'Soda Xoài Đào',   price:30, available:true },
  // ── Khoáng
  { id:'d13', tab:'drink', cat:'khoang', name:'Khoáng Xí Muội',      price:20, available:true },
  { id:'d14', tab:'drink', cat:'khoang', name:'Khoáng Chanh Local',   price:20, available:true },
  { id:'d15', tab:'drink', cat:'khoang', name:'Khoáng Chanh Leo',     price:20, available:true },
  // ── Topping
  { id:'d16', tab:'drink', cat:'topping', name:'Trân Châu Trắng', price:5, available:true },
  { id:'d17', tab:'drink', cat:'topping', name:'Nha Đam',          price:5, available:true },
  { id:'d18', tab:'drink', cat:'topping', name:'Thạch Nổ',         price:5, available:true },
  { id:'d19', tab:'drink', cat:'topping', name:'Thạch Dừa',        price:5, available:true },
  // ── Món chính
  { id:'f1',  tab:'food',  cat:'chinh',  name:'Pizza',            price:50, variants:'Bò · Gà',                    available:true },
  { id:'f2',  tab:'food',  cat:'chinh',  name:'Mỳ Trộn',          price:25, desc:'Đặc biệt +10K', variants:'Đầy đủ · Đặc biệt', available:true },
  { id:'f3',  tab:'food',  cat:'chinh',  name:'Bổng Ngô',         price:30, variants:'Phô mai · Trứng muối · BBQ', available:true },
  { id:'f4',  tab:'food',  cat:'chinh',  name:'Khoai Chiên',      price:30, variants:'Nox · Phô mai · Tê cay',     available:true },
  { id:'f5',  tab:'food',  cat:'chinh',  name:'Mỳ Ý',             price:35, available:true },
  { id:'f6',  tab:'food',  cat:'chinh',  name:'Mì Hảo Hảo',       price:15, available:true },
  { id:'f7',  tab:'food',  cat:'chinh',  name:'Mì Modern',        price:15, available:true },
  // ── Đồ chiên
  { id:'f8',  tab:'food',  cat:'chien',  name:'Mẹt Ăn Vặt',           price:50, desc:'Size lớn 100K', available:true },
  { id:'f9',  tab:'food',  cat:'chien',  name:'Gà Viên',               price:35, available:true },
  { id:'f10', tab:'food',  cat:'chien',  name:'Cá Viên Chiên Mắm',     price:40, available:true },
  { id:'f11', tab:'food',  cat:'chien',  name:'Nem Chua Rán',          price:35, available:true },
  { id:'f12', tab:'food',  cat:'chien',  name:'Xúc Xích',              price:15, available:true },
  { id:'f13', tab:'food',  cat:'chien',  name:'Gà Xiên',               price:8,  available:true },
  { id:'f14', tab:'food',  cat:'chien',  name:'Khoai Lang Kén',        price:30, available:true },
  { id:'f15', tab:'food',  cat:'chien',  name:'Ngô Chiên',             price:30, available:true },
  // ── Snack
  { id:'f16', tab:'food',  cat:'snack',  name:'Mì Trẻ Em HQ',         price:7,  available:true },
  { id:'f17', tab:'food',  cat:'snack',  name:'Mix Thái',              price:15, available:true },
  { id:'f18', tab:'food',  cat:'snack',  name:'Snack Khoai Tây',       price:12, available:true },
  { id:'f19', tab:'food',  cat:'snack',  name:'Khô Bò / Gà',          price:20, desc:'Giá từ 20K–25K', available:true },
];

function getMenuItems() {
  try {
    const raw = localStorage.getItem(MENU_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed defaults on first load
  saveMenuItems(DEFAULT_ITEMS);
  return DEFAULT_ITEMS;
}

function saveMenuItems(items) {
  localStorage.setItem(MENU_KEY, JSON.stringify(items));
}

function addMenuItem(item) {
  const items = getMenuItems();
  item.id = 'item_' + Date.now();
  items.push(item);
  saveMenuItems(items);
  return item;
}

function updateMenuItem(id, changes) {
  const items = getMenuItems();
  const idx = items.findIndex(i => i.id === id);
  if (idx === -1) return false;
  items[idx] = { ...items[idx], ...changes };
  saveMenuItems(items);
  return true;
}

function deleteMenuItem(id) {
  const items = getMenuItems().filter(i => i.id !== id);
  saveMenuItems(items);
}

function resetMenuToDefault() {
  saveMenuItems(DEFAULT_ITEMS);
}
