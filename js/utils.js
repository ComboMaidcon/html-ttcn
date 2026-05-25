/* ── Shared utilities — NOX Joy Station v2 ── */

/* Guard: nếu đã load rồi thì bỏ qua, tránh redeclaration */
if (typeof PRICING_TABLE === 'undefined') {

// ── Date / Time helpers ──────────────────────
function formatDate(d) { return d.toISOString().split('T')[0]; }
function todayStr()     { return formatDate(new Date()); }
function genId()        { return Math.random().toString(36).slice(2,10); }

function parseLocalDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

// Số thập phân → HH:MM  (9.5 → "09:30", 25.0 → "01:00 (+1)")
function formatHour(h) {
  const hour = Math.floor(h);
  const mins = (h % 1 >= 0.4) ? '30' : '00';
  if (hour < 24) return `${String(hour).padStart(2,'0')}:${mins}`;
  return `0${hour - 24}:${mins} (+1)`;
}

// Float giờ → phút
function floatHourToMins(h) { return Math.round(h * 60); }

// HH:MM → phút
function timeToMins(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

// Cuối tuần?
function isWeekend(dateStr) {
  const d = parseLocalDate(dateStr);
  return d.getDay() === 0 || d.getDay() === 6;
}

// ── Bảng giá ─────────────────────────────────
// Đồng bộ với bảng pricing trong DB
// [sáng 09-17h, tối 17-02h] — đơn vị K/giờ
var PRICING_TABLE = {
  small:            { weekday: [59,  89],  weekend: [65,  109] },
  classic:          { weekday: [79,  109], weekend: [89,  129] },
  deluxe:           { weekday: [99,  135], weekend: [119, 169] },
  big:              { weekday: [139, 219], weekend: [149, 249] },
  cine:             { weekday: [75,  109], weekend: [89,  129] },
  suite:            { weekday: [99,  135], weekend: [109, 159] },
  // Alias tương thích data cũ
  'medium-classic': { weekday: [79,  109], weekend: [89,  129] },
  'medium-deluxe':  { weekday: [99,  135], weekend: [119, 169] },
};

var MORNING_START = 9  * 60;  // 540  phút = 09:00
var MORNING_END   = 17 * 60;  // 1020 phút = 17:00
var EVENING_END   = 26 * 60;  // 1560 phút = 02:00 hôm sau

/**
 * Tính tiền phòng — xử lý vắt khung giờ sáng/tối
 * VD: 15:00→19:00 = 2h×sáng + 2h×tối, không tính hết theo 1 khung
 */
function calcRoomPrice(roomType, dateStr, startFloat, durationH) {
  const table = PRICING_TABLE[roomType];
  if (!table) return { total: 0, breakdown: [], dayType: 'weekday' };

  const weekend = isWeekend(dateStr);
  const dayType = weekend ? 'weekend' : 'weekday';
  const prices  = table[dayType]; // [morningRate, eveningRate]

  const startMins = floatHourToMins(startFloat);
  const endMins   = startMins + floatHourToMins(durationH);
  const breakdown = [];

  // Phần trong khung SÁNG
  const mStart = Math.max(startMins, MORNING_START);
  const mEnd   = Math.min(endMins,   MORNING_END);
  if (mEnd > mStart) {
    const hours = (mEnd - mStart) / 60;
    breakdown.push({ slot:'morning', label:'09:00–17:00', hours, rate:prices[0], amount:Math.round(hours*prices[0]) });
  }

  // Phần trong khung TỐI
  const eStart = Math.max(startMins, MORNING_END);
  const eEnd   = Math.min(endMins,   EVENING_END);
  if (eEnd > eStart) {
    const hours = (eEnd - eStart) / 60;
    breakdown.push({ slot:'evening', label:'17:00–02:00', hours, rate:prices[1], amount:Math.round(hours*prices[1]) });
  }

  return { total: breakdown.reduce((s,b)=>s+b.amount,0), breakdown, dayType };
}

/** Phụ thu Big Room: 40K/người từ người thứ 7 */
function calcBigRoomSurcharge(roomType, people) {
  if (roomType !== 'big') return 0;
  return Math.max(0, people - 6) * 40;
}

/** Lấy đơn giá 1 khung (dùng cho display đơn giản, giữ tương thích) */
function getRoomPrice(roomType, dateStr, startFloat) {
  const table = PRICING_TABLE[roomType];
  if (!table) return 0;
  const slot = isWeekend(dateStr) ? table.weekend : table.weekday;
  return startFloat >= 17 ? slot[1] : slot[0];
}

} // end guard