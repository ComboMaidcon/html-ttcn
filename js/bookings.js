/* ── Booking management (localStorage) ── */
const BOOKINGS_KEY = "nox_bookings_v2";

function getBookings() {
  try { return JSON.parse(localStorage.getItem(BOOKINGS_KEY)) || seedBookings(); }
  catch { return seedBookings(); }
}
function saveBookings(b) { localStorage.setItem(BOOKINGS_KEY, JSON.stringify(b)); }

function addBooking(b) {
  const all = getBookings();
  const nb = { ...b, id: genId() };
  all.push(nb); saveBookings(all); return nb;
}

function seedBookings() {
  const today    = formatDate(new Date());
  const tomorrow = formatDate(new Date(Date.now() + 86400000));
  const d = [
    { id:genId(), roomId:"t6-room1", date:today,    start:10,   end:13,   name:"Minh Khang", people:2 },
    { id:genId(), roomId:"t6-room2", date:today,    start:14,   end:17,   name:"Thu Hằng",   people:4 },
    { id:genId(), roomId:"t5-room1", date:today,    start:18.5, end:21,   name:"Nhóm bạn",   people:4 },
    { id:genId(), roomId:"t6-big",   date:today,    start:19,   end:23,   name:"Sinh nhật",  people:8 },
    { id:genId(), roomId:"cine-1",   date:today,    start:15,   end:17.5, name:"Cặp đôi",    people:2 },
    { id:genId(), roomId:"suite-1",  date:today,    start:20,   end:22.5, name:"Hẹn hò",     people:2 },
    { id:genId(), roomId:"t5-room3", date:tomorrow, start:10,   end:12,   name:"Nhóm game",  people:2 },
    { id:genId(), roomId:"t5-big",   date:tomorrow, start:14.5, end:18,   name:"Nhóm chill", people:6 },
  ];
  saveBookings(d); return d;
}

function getRoomBookings(roomId, date) {
  return getBookings().filter(b => b.roomId === roomId && b.date === date);
}

// Works with decimal hours (9.5 = 9:30)
function isRoomFree(roomId, date, start, end) {
  return !getRoomBookings(roomId, date).some(b => start < b.end && end > b.start);
}

function getFreeSlots(roomId, date) {
  const OPEN = 9, CLOSE = 26;
  const booked = getRoomBookings(roomId, date).sort((a,b) => a.start - b.start);
  const free = []; let cursor = OPEN;
  for (const b of booked) {
    if (cursor < b.start) free.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < CLOSE) free.push({ start: cursor, end: CLOSE });
  return free;
}

function getAvailableRooms(date, start, end) {
  return ROOMS.filter(r => isRoomFree(r.id, date, start, end));
}
