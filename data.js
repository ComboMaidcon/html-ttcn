/* ═══════════════════════════════════════
   NOX Joy Station — Shared Data & Logic
   ═══════════════════════════════════════ */

// ── Room definitions ──────────────────────────────────────────────
const ROOMS = [
  {
    id: 'ps5-1',
    name: 'PS5 Room A',
    type: 'ps5',
    emoji: '🎮',
    badge: 'Hot nhất', badgeClass: 'badge-gold',
    desc: 'Phòng riêng tư với PlayStation 5, kho game đồ sộ và TV 55" 4K. Lý tưởng cho 2–4 người chill hoặc hẹn hò.',
    capacity: '2–4 người',
    features: ['PS5', 'TV 55" 4K', 'Boardgame free', '2–4 người'],
    price: 30, priceUnit: '/ người / giờ',
    gradient: 'linear-gradient(135deg,#1a1000,#0c0c0c)',
  },
  {
    id: 'ps5-2',
    name: 'PS5 Room B',
    type: 'ps5',
    emoji: '🎮',
    badge: 'PS5', badgeClass: 'badge-gold',
    desc: 'Phòng PS5 thứ hai, không gian hơi lớn hơn, thích hợp cho 3–5 người. Đầy đủ tựa game mới nhất.',
    capacity: '3–5 người',
    features: ['PS5', 'TV 65" 4K', 'Boardgame free', '3–5 người'],
    price: 30, priceUnit: '/ người / giờ',
    gradient: 'linear-gradient(135deg,#1a0a00,#0c0c0c)',
  },
  {
    id: 'nintendo-1',
    name: 'Nintendo Room',
    type: 'nintendo',
    emoji: '🕹️',
    badge: 'Chill', badgeClass: 'badge-white',
    desc: 'Phòng vui nhộn nhất với Nintendo Switch và hàng trăm tựa game party. Cười rớt hàm từ Mario Kart đến Overcooked!',
    capacity: '2–6 người',
    features: ['Nintendo Switch', 'TV 50"', 'Party Games', '2–6 người'],
    price: 30, priceUnit: '/ người / giờ',
    gradient: 'linear-gradient(135deg,#0c1a00,#0c0c0c)',
  },
  {
    id: 'cine-1',
    name: 'Cine Private',
    type: 'cine',
    emoji: '🎬',
    badge: 'Netflix', badgeClass: 'badge-red',
    desc: 'Màn chiếu lớn, loa surround cực đỉnh, sofa êm ái — xem phim hay Netflix với người ấy hoặc cả nhóm.',
    capacity: '2–8 người',
    features: ['Netflix', 'Màn chiếu', 'Surround', '2–8 người'],
    price: 35, priceUnit: '/ người / giờ',
    gradient: 'linear-gradient(135deg,#1a0010,#0c0c0c)',
  },
  {
    id: 'boardgame-1',
    name: 'Boardgame Lounge',
    type: 'boardgame',
    emoji: '🎲',
    badge: 'Free game', badgeClass: 'badge-gold',
    desc: 'Hơn 30 boardgame đa dạng từ Uno đến Catan, dành cho nhóm từ 3–10 người. Boardgame hoàn toàn miễn phí!',
    capacity: '3–10 người',
    features: ['30+ game', 'Miễn phí', 'Snack bar', '3–10 người'],
    price: 25, priceUnit: '/ người / giờ',
    gradient: 'linear-gradient(135deg,#001a15,#0c0c0c)',
  },
  {
    id: 'couple-1',
    name: 'Couple Box',
    type: 'couple',
    emoji: '💑',
    badge: 'Couple', badgeClass: 'badge-red',
    desc: 'Phòng lãng mạn thiết kế riêng cho các cặp đôi — không gian ấm cúng, PS5 + Netflix + boardgame riêng cho 2.',
    capacity: '2 người',
    features: ['2 người', 'PS5 + Nintendo', 'Netflix', 'Cực riêng tư'],
    price: 80, priceUnit: '/ cặp / giờ',
    gradient: 'linear-gradient(135deg,#1a0c00,#0c0c0c)',
  },
  {
    id: 'party-1',
    name: 'Party Room',
    type: 'party',
    emoji: '🎉',
    badge: 'VIP Party', badgeClass: 'badge-gold',
    desc: 'Phòng lớn nhất cho cả hội từ 5–10 người. PS5 + Nintendo + boardgame + màn chiếu — quẩy hết mình!',
    capacity: '5–10 người',
    features: ['5–10 người', 'PS5 + Nintendo', 'Màn chiếu', 'Cách âm'],
    price: 200, priceUnit: '/ phòng / giờ',
    gradient: 'linear-gradient(135deg,#1a1500,#0c0c0c)',
  },
];

// ── Booking data (fake / in-memory) ───────────────────────────────
// Format: { roomId, date: 'YYYY-MM-DD', start: 9, end: 12 }  (hours, 9=9h, 23=23h)
const BOOKINGS_KEY = 'nox_bookings';

function getBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || getDefaultBookings(); }
  catch { return getDefaultBookings(); }
}

function saveBookings(bookings) {
  localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
}

function getDefaultBookings() {
  // Generate some realistic sample bookings for today & tomorrow
  const today     = formatDate(new Date());
  const tomorrow  = formatDate(new Date(Date.now() + 86400000));
  const dayAfter  = formatDate(new Date(Date.now() + 2 * 86400000));

  const defaults = [
    { id: genId(), roomId:'ps5-1',      date:today,    start:10, end:13, name:'Minh Khang',    people:3, phone:'0912xxx' },
    { id: genId(), roomId:'ps5-1',      date:today,    start:18, end:21, name:'Thu Hằng',      people:2, phone:'0934xxx' },
    { id: genId(), roomId:'couple-1',   date:today,    start:14, end:17, name:'Anh Tuấn',      people:2, phone:'0978xxx' },
    { id: genId(), roomId:'nintendo-1', date:today,    start:9,  end:11, name:'Nhóm bạn',      people:4, phone:'0901xxx' },
    { id: genId(), roomId:'party-1',    date:today,    start:19, end:23, name:'Sinh nhật Linh',people:8, phone:'0966xxx' },
    { id: genId(), roomId:'cine-1',     date:today,    start:15, end:18, name:'Cặp đôi',       people:2, phone:'0922xxx' },
    { id: genId(), roomId:'ps5-2',      date:tomorrow, start:10, end:13, name:'Nhóm game',     people:4, phone:'0944xxx' },
    { id: genId(), roomId:'boardgame-1',date:tomorrow, start:14, end:17, name:'Nhóm chill',    people:6, phone:'0955xxx' },
    { id: genId(), roomId:'couple-1',   date:dayAfter, start:18, end:21, name:'Hẹn hò',        people:2, phone:'0988xxx' },
  ];
  saveBookings(defaults);
  return defaults;
}

function addBooking(booking) {
  const bookings = getBookings();
  const newBooking = { ...booking, id: genId() };
  bookings.push(newBooking);
  saveBookings(bookings);
  return newBooking;
}

// ── Availability helpers ──────────────────────────────────────────
/** Returns array of booked {start,end} for a specific room on a date */
function getRoomBookings(roomId, date) {
  return getBookings().filter(b => b.roomId === roomId && b.date === date);
}

/** Check if a room is free for an entire [start, end) range */
function isRoomFree(roomId, date, start, end) {
  const bookings = getRoomBookings(roomId, date);
  return !bookings.some(b => start < b.end && end > b.start);
}

/** Get free slots (array of {start,end}) for a room on a date within operating hours 9–2 (26) */
function getFreeSlots(roomId, date) {
  const OPEN = 9, CLOSE = 26; // 26 = 2:00 next day (index)
  const booked = getRoomBookings(roomId, date).sort((a,b) => a.start - b.start);
  const free = [];
  let cursor = OPEN;
  for (const b of booked) {
    if (cursor < b.start) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < CLOSE) free.push({ start: cursor, end: CLOSE });
  return free;
}

/** Get all available rooms for a date + time range */
function getAvailableRooms(date, start, end) {
  return ROOMS.filter(r => isRoomFree(r.id, date, start, end));
}

// ── Utilities ────────────────────────────────────────────────────
function formatDate(d) {
  return d.toISOString().split('T')[0];
}

function formatHour(h) {
  if (h < 24) return `${String(h).padStart(2,'0')}:00`;
  return `0${h - 24}:00 (+1)`;
}

function formatHourShort(h) {
  if (h <= 24) return `${String(h % 24).padStart(2,'0')}h`;
  return `0${h-24}h+1`;
}

function genId() {
  return Math.random().toString(36).slice(2,10);
}

function todayStr() { return formatDate(new Date()); }

function parseLocalDate(str) {
  const [y,m,d] = str.split('-').map(Number);
  return new Date(y, m-1, d);
}

// ── Nav & Cursor init (call on every page) ───────────────────────
function initPage() {
  // Cursor
  const cur  = document.getElementById('cur');
  const cur2 = document.getElementById('cur2');
  if (cur && cur2) {
    document.addEventListener('mousemove', e => {
      cur.style.left  = e.clientX + 'px';
      cur.style.top   = e.clientY + 'px';
      setTimeout(() => {
        cur2.style.left = e.clientX + 'px';
        cur2.style.top  = e.clientY + 'px';
      }, 80);
    });
    document.querySelectorAll('a,button,.card,.room-card').forEach(el => {
      el.addEventListener('mouseenter', () => { cur.style.transform = 'translate(-50%,-50%) scale(2)'; });
      el.addEventListener('mouseleave', () => { cur.style.transform = 'translate(-50%,-50%) scale(1)'; });
    });
  }

  // Nav scroll
  const nav = document.querySelector('nav');
  if (nav) {
    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 60));
    // Active link
    const path = location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav-links a').forEach(a => {
      if (a.getAttribute('href') === path) a.classList.add('active');
    });
  }

  // Scroll reveal
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('on');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.rev').forEach(el => obs.observe(el));
}
