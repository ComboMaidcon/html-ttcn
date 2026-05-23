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

// Group rooms by floor
const floors = [6, 5, 4];
floors.forEach(floor => {
  const floorRooms = ROOMS.filter(r => r.floor === floor);
  if (!floorRooms.length) return;
  
  const optGroup = document.createElement('optgroup');
  optGroup.label = FLOOR_META[floor]?.label || `Tầng ${floor}`;
  
  floorRooms.forEach(r => {
    optGroup.insertAdjacentHTML('beforeend',
      `<option value="${r.id}">${r.name} (${r.badge}) – từ ${r.price}K/h</option>`);
      
    quickList.insertAdjacentHTML('beforeend', `
      <div class="selected-room ${r.id === preRoom ? 'active' : ''}"
           data-rid="${r.id}" onclick="selectRoom('${r.id}')">
        <span class="sr-emoji">${r.emoji}</span>
        <div>
          <div class="sr-name">T${r.floor} - ${r.name}</div>
          <div class="sr-price">Từ ${r.price}K/giờ</div>
          <div class="sr-cap">👥 ${r.capacity}</div>
        </div>
      </div>`);
  });
  roomSel.appendChild(optGroup);
});

if (preRoom) roomSel.value = preRoom;

/* ── Room select ── */
function selectRoom(id) {
  roomSel.value = id;
  document.querySelectorAll('.selected-room').forEach(el =>
    el.classList.toggle('active', el.dataset.rid === id));

  // Cập nhật max người theo loại phòng
  const room = ROOMS.find(r => r.id === id);
  const maxP = { small:2, 'medium-classic':4, 'medium-deluxe':4, big:8, cine:3, suite:4 }[room?.type] || 10;
  const peopleInput = document.getElementById('f-people');
  peopleInput.max = maxP;
  if (parseInt(peopleInput.value) > maxP) peopleInput.value = maxP;

  updatePrice();
  checkConflict();
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
async function checkConflict() {
  const roomId   = roomSel.value;
  const date     = document.getElementById('f-date').value;
  const start    = parseFloat(startSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const end      = start + duration;
  const warn     = document.getElementById('conflictWarn');

  if (!roomId || !date) { warn.style.display = 'none'; return; }

  const free = await apiIsRoomFree(roomId, date, start, end);
  if (!free) {
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
async function submitBooking() {
  // Reset errors
  clearErrors();

  const name     = document.getElementById('f-name').value.trim();
  const phone    = document.getElementById('f-phone').value.trim();
  const date     = document.getElementById('f-date').value;
  const start    = parseFloat(startSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const end      = start + duration;
  const people   = parseInt(document.getElementById('f-people').value) || 1;
  const roomId   = roomSel.value;
  const note     = document.getElementById('f-note').value.trim();

  // Validate từng field
  let hasError = false;

  if (!name) {
    showFieldError('f-name', 'err-name', 'Vui lòng nhập họ tên');
    hasError = true;
  }

  if (!/^\d{10}$/.test(phone)) {
    showFieldError('f-phone', 'err-phone', 'Số điện thoại phải đúng 10 chữ số');
    hasError = true;
  }

  const room = ROOMS.find(r => r.id === roomId);
  const maxPeople = {
    'small':          2,
    'medium-classic': 4,
    'medium-deluxe':  4,
    'big':            8,
    'cine':           3,
    'suite':          4,
  }[room?.type] || 10;

  if (people > maxPeople) {
    alert(`Phòng ${room?.badge} chỉ chứa tối đa ${maxPeople} người!`);
    return;
  }

  if (!date) {
    showFormAlert('Vui lòng chọn ngày đến');
    hasError = true;
  }

  if (!roomId) {
    showFieldError('f-room', 'err-room', 'Vui lòng chọn phòng');
    hasError = true;
  }

  if (roomId) {
    const room   = ROOMS.find(r => r.id === roomId);
    const maxP   = { small:2, 'medium-classic':4, 'medium-deluxe':4, big:8, cine:3, suite:4 }[room?.type] || 10;
    if (people < 1) {
      showFieldError('f-people', 'err-people', 'Số người tối thiểu là 1');
      hasError = true;
    } else if (people > maxP) {
      showFieldError('f-people', 'err-people', `Phòng ${room?.badge} chỉ chứa tối đa ${maxP} người`);
      hasError = true;
    }
  }

  if (hasError) {
    showFormAlert('Vui lòng kiểm tra lại thông tin bên trên');
    // Scroll lên chỗ lỗi đầu tiên
    document.querySelector('.invalid')?.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  // Check trùng lịch
  const btn = document.querySelector('.btn-submit');
  btn.disabled = true;
  btn.textContent = 'Đang kiểm tra...';

  try {
    const free = await apiIsRoomFree(roomId, date, start, end);
    if (!free) {
      showFormAlert('Phòng đã có người đặt trong khung giờ này. Vui lòng chọn giờ khác!');
      btn.disabled = false;
      btn.textContent = '🎮 Xác nhận đặt phòng';
      return;
    }

    btn.textContent = 'Đang đặt phòng...';
    const room = ROOMS.find(r => r.id === roomId);
    await apiCreateBooking({ roomId, date, startHour: start, endHour: end, name, phone, people, note });

    // Success
    document.getElementById('bookingDetails').innerHTML = `
      <div class="md-row"><span>Phòng</span><span class="md-val">${room.name} ${room.emoji}</span></div>
      <div class="md-row"><span>Tầng</span><span class="md-val">Tầng ${room.floor}</span></div>
      <div class="md-row"><span>Ngày</span><span class="md-val">${parseLocalDate(date).toLocaleDateString('vi-VN', { weekday:'long', day:'numeric', month:'numeric' })}</span></div>
      <div class="md-row"><span>Giờ</span><span class="md-val">${formatHour(start)} – ${formatHour(end)}</span></div>
      <div class="md-row"><span>Số người</span><span class="md-val">${people} người</span></div>
      <div class="md-row"><span>Liên hệ</span><span class="md-val">${phone}</span></div>`;
    document.getElementById('successModal').classList.add('visible');

  } catch (err) {
    showFormAlert(err.message || 'Đặt phòng thất bại, vui lòng thử lại!');
  } finally {
    btn.disabled = false;
    btn.textContent = '🎮 Xác nhận đặt phòng';
  }
}

/* ── Validation helpers ── */
function showFieldError(inputId, errId, msg) {
  const input = document.getElementById(inputId);
  const err   = document.getElementById(errId);
  if (input) { input.classList.add('invalid'); input.classList.remove('valid'); }
  if (err)   { err.textContent = `⚠ ${msg}`; err.classList.add('visible'); }
}

function showFormAlert(msg) {
  const el = document.getElementById('formAlert');
  if (!el) return;
  el.textContent = `⚠ ${msg}`;
  el.classList.add('visible', 'error');
}

function clearErrors() {
  document.querySelectorAll('.invalid').forEach(el => {
    el.classList.remove('invalid');
    el.classList.add('valid');
  });
  document.querySelectorAll('.field-error').forEach(el =>
    el.classList.remove('visible'));
  const alert = document.getElementById('formAlert');
  if (alert) alert.classList.remove('visible','error','success');
}

// Clear lỗi khi user bắt đầu sửa
['f-name','f-phone','f-room','f-people','f-date'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    el.classList.remove('invalid');
    el.classList.add('valid');
    const errId = 'err-' + id.replace('f-','');
    document.getElementById(errId)?.classList.remove('visible');
    document.getElementById('formAlert')?.classList.remove('visible');
  });
});

/* ── Inline validation helpers ── */
function fieldOk(grpId, msgId, msg = '✓') {
  const grp = document.getElementById(grpId);
  const msg_el = document.getElementById(msgId);
  if (!grp) return;
  grp.className = grp.className.replace(/field-error|field-ok/g,'').trim() + ' field-ok';
  if (msg_el) { msg_el.textContent = msg; }
}

function fieldErr(grpId, msgId, msg) {
  const grp = document.getElementById(grpId);
  const msg_el = document.getElementById(msgId);
  if (!grp) return;
  grp.className = grp.className.replace(/field-error|field-ok/g,'').trim() + ' field-error';
  if (msg_el) { msg_el.textContent = msg; }
}

function fieldReset(grpId) {
  const grp = document.getElementById(grpId);
  if (!grp) return;
  grp.className = grp.className.replace(/field-error|field-ok/g,'').trim();
}

/* ── Real-time validation ── */
document.getElementById('f-name').addEventListener('input', function() {
  this.value.trim().length >= 2
    ? fieldOk('grp-name',  'msg-name',  '✓ Hợp lệ')
    : fieldErr('grp-name', 'msg-name',  'Vui lòng nhập tên (tối thiểu 2 ký tự)');
});

document.getElementById('f-phone').addEventListener('input', function() {
  /^\d{10}$/.test(this.value.trim())
    ? fieldOk('grp-phone',  'msg-phone',  '✓ Số hợp lệ')
    : fieldErr('grp-phone', 'msg-phone',  'Số điện thoại phải đúng 10 chữ số');
});

document.getElementById('f-people').addEventListener('input', function() {
  const roomId = document.getElementById('f-room').value;
  const room   = ROOMS.find(r => r.id === roomId);
  const maxP   = { small:2, 'medium-classic':4, 'medium-deluxe':4, big:8, cine:3, suite:4 }[room?.type] || 10;
  const val    = parseInt(this.value);
  if (!val || val < 1) {
    fieldErr('grp-people', 'msg-people', 'Số người phải ít nhất 1');
  } else if (val > maxP) {
    fieldErr('grp-people', 'msg-people', `Phòng này tối đa ${maxP} người`);
  } else {
    fieldOk('grp-people', 'msg-people', `✓ Hợp lệ (tối đa ${maxP} người)`);
  }
});

document.getElementById('f-room').addEventListener('change', function() {
  this.value
    ? fieldOk('grp-room',  'msg-room', '✓ Đã chọn phòng')
    : fieldErr('grp-room', 'msg-room', 'Vui lòng chọn phòng');
});