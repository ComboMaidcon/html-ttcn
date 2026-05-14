/* ── Booking page logic ── */

injectShared({ ticker: false });
initPage();

/* ── Time helpers ── */
// Generate half-hour slots from 9:00 to 25:30 (1:30 AM +1)
const HALF_HOURS = Array.from({length: 34}, (_, i) => 9 + i * 0.5);

const startSel = document.getElementById('f-start');
HALF_HOURS.forEach(h => startSel.insertAdjacentHTML('beforeend',
  `<option value="${h}">${formatHour(h)}</option>`));
startSel.value = 14;
document.getElementById('f-date').value = todayStr();

// Duration options: 0.5 → 8h in 0.5 steps
const durSel = document.getElementById('f-duration');
durSel.innerHTML = '';
const DURATIONS = [
  [0.5, '30 phút'], [1, '1 giờ'], [1.5, '1 tiếng 30'],
  [2, '2 giờ'], [2.5, '2 tiếng 30'], [3, '3 giờ'],
  [3.5, '3 tiếng 30'], [4, '4 giờ'], [5, '5 giờ'],
  [6, '6 giờ'], [7, '7 giờ'], [8, '8 giờ'],
];
DURATIONS.forEach(([val, label]) =>
  durSel.insertAdjacentHTML('beforeend',
    `<option value="${val}"${val === 3 ? ' selected' : ''}>${label}</option>`));

/* ── URL params pre-fill ── */
const params   = new URLSearchParams(location.search);
const preRoom  = params.get('room');
const preDate  = params.get('date');
const preStart = params.get('start');

if (preDate)  document.getElementById('f-date').value  = preDate;
if (preStart) startSel.value = preStart;
if (preStart && params.get('end')) {
  const dur = parseFloat(params.get('end')) - parseFloat(preStart);
  if (dur > 0 && dur <= 8) durSel.value = dur;
}

/* ── Populate room select + sidebar ── */
const roomSel   = document.getElementById('f-room');
const quickList = document.getElementById('roomQuickList');

ROOMS.forEach(r => {
  roomSel.insertAdjacentHTML('beforeend',
    `<option value="${r.id}">${r.name} (${r.badge}) – từ ${r.price}K/h</option>`);
  quickList.insertAdjacentHTML('beforeend', `
    <div class="selected-room ${r.id === preRoom ? 'active' : ''}"
         data-rid="${r.id}" onclick="selectRoom('${r.id}')">
      <span class="sr-emoji">${r.emoji}</span>
      <span class="sr-name">${r.name} <small style="color:var(--muted);font-weight:400">T${r.floor}</small></span>
      <span class="sr-price">${r.price}K/h</span>
    </div>`);
});

if (preRoom) roomSel.value = preRoom;

/* ── Room select ── */
function selectRoom(id) {
  roomSel.value = id;
  document.querySelectorAll('.selected-room').forEach(el =>
    el.classList.toggle('active', el.dataset.rid === id));
  updatePrice(); checkConflict();
}

roomSel.addEventListener('change', () => {
  document.querySelectorAll('.selected-room').forEach(el =>
    el.classList.toggle('active', el.dataset.rid === roomSel.value));
  updatePrice(); checkConflict();
});

['f-start','f-duration','f-people','f-date'].forEach(id =>
  document.getElementById(id).addEventListener('change', () => {
    updatePrice(); checkConflict();
  }));

/* ── Price calculation — real pricing table ── */
function updatePrice() {
  const room     = ROOMS.find(r => r.id === roomSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const start    = parseFloat(startSel.value) || 14;
  const date     = document.getElementById('f-date').value || todayStr();
  const calc     = document.getElementById('priceCalc');

  if (!room) {
    calc.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Chọn phòng để xem giá.</p>';
    return;
  }

  const pricePerH  = getRoomPrice(room.type, date, start);
  const weekend    = isWeekend(date);
  const evening    = start >= 17;
  const periodLabel = weekend
    ? (evening ? '🎉 Cuối tuần tối' : '🎉 Cuối tuần sáng')
    : (evening ? '🌙 Cao điểm'      : '☀️ Bình thường');

  // Tính theo nửa tiếng
  const total = Math.round(pricePerH * duration);

  // Big Room note nếu > 6 người
  const people  = parseInt(document.getElementById('f-people').value) || 1;
  const bigNote = (room.type === 'big' && people > 6)
    ? `<div class="price-row" style="color:#f97316"><span>Phụ thu người thứ 7+</span><span>+${(people-6)*40}K</span></div>`
    : '';

  calc.innerHTML = `
    <div class="price-row"><span>Phòng</span>
      <span style="color:var(--white)">${room.name}</span></div>
    <div class="price-row"><span>Khung giờ</span>
      <span>${periodLabel}</span></div>
    <div class="price-row"><span>Đơn giá</span>
      <span>${pricePerH}K/giờ</span></div>
    <div class="price-row"><span>Thời gian</span>
      <span>${formatHour(start)} → ${formatHour(start + duration)} (${duration}h)</span></div>
    ${bigNote}
    <div class="price-total"><span>Ước tính</span><span>${total + (room.type==='big'&&people>6?(people-6)*40:0)}K</span></div>
    <p style="font-size:.7rem;color:var(--muted);margin-top:.5rem">
      *Giá chính xác tính khi check-out theo giờ thực tế
    </p>`;
}

/* ── Conflict check ── */
function checkConflict() {
  const roomId   = roomSel.value;
  const date     = document.getElementById('f-date').value;
  const start    = parseFloat(startSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const end      = start + duration;
  const warn     = document.getElementById('conflictWarn');

  if (!roomId || !date) { warn.style.display = 'none'; return; }

  if (!isRoomFree(roomId, date, start, end)) {
    warn.style.display = 'block';
    warn.innerHTML = `⚠️ Phòng <strong>${ROOMS.find(r=>r.id===roomId)?.name}</strong>
      đã có người đặt trong khung giờ này. Vui lòng chọn giờ khác hoặc
      <a href="rooms.html" style="color:var(--gold)">xem lịch phòng</a>.`;
  } else {
    warn.style.display = 'none';
  }
}

updatePrice();
checkConflict();

/* ── Submit ── */
function submitBooking() {
  const name     = document.getElementById('f-name').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const date     = document.getElementById('f-date').value;
  const start    = parseFloat(startSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const end      = start + duration;
  const people   = parseInt(document.getElementById('f-people').value) || 1;
  const roomId   = roomSel.value;
  const note     = document.getElementById('f-note').value.trim();

  if (!name)   { alert('Vui lòng nhập tên.'); return; }
  if (!phone)  { alert('Vui lòng nhập số điện thoại.'); return; }
  if (!date)   { alert('Vui lòng chọn ngày.'); return; }
  if (!roomId) { alert('Vui lòng chọn phòng.'); return; }

  if (!isRoomFree(roomId, date, start, end)) {
    alert('Phòng đã có người đặt trong khung giờ này!');
    return;
  }

  const room = ROOMS.find(r => r.id === roomId);
  addBooking({ roomId, date, start, end, name, people, phone, note });

  const dateStr = parseLocalDate(date).toLocaleDateString('vi-VN',
    { weekday:'long', day:'numeric', month:'numeric', year:'numeric' });

  document.getElementById('bookingDetails').innerHTML = `
    <div class="md-row"><span>Phòng</span>
      <span class="md-val">${room.name} ${room.emoji}</span></div>
    <div class="md-row"><span>Tầng</span>
      <span class="md-val">Tầng ${room.floor}</span></div>
    <div class="md-row"><span>Ngày</span>
      <span class="md-val">${dateStr}</span></div>
    <div class="md-row"><span>Giờ</span>
      <span class="md-val">${formatHour(start)} – ${formatHour(end)}</span></div>
    <div class="md-row"><span>Thời gian</span>
      <span class="md-val">${duration}h</span></div>
    <div class="md-row"><span>Số người</span>
      <span class="md-val">${people} người</span></div>
    <div class="md-row"><span>Liên hệ</span>
      <span class="md-val">${phone}</span></div>`;

  document.getElementById('successModal').classList.add('visible');
}

document.getElementById('successModal').addEventListener('click', e => {
  if (e.target === e.currentTarget) e.currentTarget.classList.remove('visible');
});
