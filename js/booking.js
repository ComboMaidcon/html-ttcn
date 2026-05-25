/* ── Booking page logic — v2 ── */

document.addEventListener('DOMContentLoaded', () => {
  injectShared({ ticker: false });
  initPage();
  initForm();
});

/* ── Init form ──────────────────────────────── */
function initForm() {
  // Populate giờ bắt đầu
  const startSel = document.getElementById('f-start');
  const HALF_HOURS = Array.from({ length: 34 }, (_, i) => 9 + i * 0.5);
  HALF_HOURS.forEach(h => startSel.insertAdjacentHTML('beforeend',
    `<option value="${h}">${formatHour(h)}</option>`));
  startSel.value = 14;

  // Ngày mặc định = hôm nay
  document.getElementById('f-date').value = todayStr();

  // Duration options
  const durSel = document.getElementById('f-duration');
  durSel.innerHTML = '';
  const DURATIONS = [
    [0.5,'30 phút'],[1,'1 giờ'],[1.5,'1 tiếng 30'],
    [2,'2 giờ'],[2.5,'2 tiếng 30'],[3,'3 giờ'],
    [3.5,'3 tiếng 30'],[4,'4 giờ'],[5,'5 giờ'],
    [6,'6 giờ'],[7,'7 giờ'],[8,'8 giờ'],
  ];
  DURATIONS.forEach(([val, label]) =>
    durSel.insertAdjacentHTML('beforeend',
      `<option value="${val}"${val === 3 ? ' selected' : ''}>${label}</option>`));

  // URL params pre-fill
  const params  = new URLSearchParams(location.search);
  const preRoom = params.get('room');
  const preDate = params.get('date');
  const preStart= params.get('start');
  if (preDate)  document.getElementById('f-date').value = preDate;
  if (preStart) startSel.value = preStart;
  if (preStart && params.get('end')) {
    const dur = parseFloat(params.get('end')) - parseFloat(preStart);
    if (dur > 0 && dur <= 8) durSel.value = dur;
  }

  // Populate room select + sidebar
  const roomSel   = document.getElementById('f-room');
  const quickList = document.getElementById('roomQuickList');

  ROOMS.forEach(r => {
    const typeKey = r.type || 'small';
    const basePrice = PRICING_TABLE[typeKey]?.weekday[0] || r.price || 0;
    roomSel.insertAdjacentHTML('beforeend',
      `<option value="${r.id}">${r.name} (T${r.floor}) — từ ${basePrice}K/h</option>`);
    quickList.insertAdjacentHTML('beforeend', `
      <div class="selected-room ${r.id === preRoom ? 'active' : ''}"
           data-rid="${r.id}" onclick="selectRoom('${r.id}')">
        <div class="sr-icon">${r.type?.slice(0,2).toUpperCase() || 'RM'}</div>
        <div>
          <div class="sr-name">${r.name}</div>
          <div class="sr-price">Từ ${basePrice}K/giờ</div>
          <div class="sr-cap">${r.capacity_min || 1}–${r.capacity_max || 2} người</div>
        </div>
      </div>`);
  });

  if (preRoom) {
    roomSel.value = preRoom;
    selectRoom(preRoom, false);
  }

  // Event listeners
  roomSel.addEventListener('change', () => {
    document.querySelectorAll('.selected-room').forEach(el =>
      el.classList.toggle('active', el.dataset.rid === roomSel.value));
    updatePrice(); checkConflict();
  });

  ['f-start','f-duration','f-people','f-date'].forEach(id =>
    document.getElementById(id)?.addEventListener('change', () => {
      updatePrice(); checkConflict();
    }));

  // Real-time validation
  document.getElementById('f-name')?.addEventListener('input', function() {
    this.value.trim().length >= 2
      ? fieldOk('grp-name','msg-name','✓ Hợp lệ')
      : fieldErr('grp-name','msg-name','Tối thiểu 2 ký tự');
  });
  document.getElementById('f-phone')?.addEventListener('input', function() {
    /^0\d{9}$/.test(this.value.trim())
      ? fieldOk('grp-phone','msg-phone','✓ Số hợp lệ')
      : fieldErr('grp-phone','msg-phone','Phải đúng 10 số, bắt đầu bằng 0');
  });
  document.getElementById('f-people')?.addEventListener('input', function() {
    const roomId = document.getElementById('f-room').value;
    const room   = ROOMS.find(r => r.id === roomId);
    const maxP   = room?.capacity_max || 10;
    const val    = parseInt(this.value);
    if (!val || val < 1)       fieldErr('grp-people','msg-people','Tối thiểu 1 người');
    else if (val > maxP)       fieldErr('grp-people','msg-people',`Phòng này tối đa ${maxP} người`);
    else                       fieldOk('grp-people','msg-people',`✓ Hợp lệ (tối đa ${maxP} người)`);
    updatePrice();
  });

  updatePrice();
  checkConflict();

  // Clear lỗi khi sửa
  ['f-name','f-phone','f-room','f-people','f-date'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {
      document.getElementById('formAlert')?.classList.remove('visible');
    });
  });
}

/* ── Select room ────────────────────────────── */
function selectRoom(id, triggerUpdate = true) {
  const roomSel = document.getElementById('f-room');
  roomSel.value = id;
  document.querySelectorAll('.selected-room').forEach(el =>
    el.classList.toggle('active', el.dataset.rid === id));

  // Cập nhật max người
  const room  = ROOMS.find(r => r.id === id);
  const maxP  = room?.capacity_max || 10;
  const pInput= document.getElementById('f-people');
  pInput.max  = maxP;
  if (parseInt(pInput.value) > maxP) pInput.value = maxP;

  if (triggerUpdate) { updatePrice(); checkConflict(); }
}

/* ── Tính giá — XỬ LÝ VẮT KHUNG GIỜ ────────── */
function updatePrice() {
  const roomSel  = document.getElementById('f-room');
  const durSel   = document.getElementById('f-duration');
  const startSel = document.getElementById('f-start');

  const room     = ROOMS.find(r => r.id === roomSel.value);
  const duration = parseFloat(durSel.value) || 1;
  const start    = parseFloat(startSel.value) || 14;
  const date     = document.getElementById('f-date').value || todayStr();
  const people   = parseInt(document.getElementById('f-people').value) || 1;
  const calc     = document.getElementById('priceCalc');

  if (!room) {
    calc.innerHTML = '<p style="color:var(--muted);font-size:.85rem">Chọn phòng để xem giá.</p>';
    return;
  }

  const roomType = room.type || 'small';
  const end      = start + duration;

  // Tính giá có xét vắt khung giờ
  const { total, breakdown, dayType } = calcRoomPrice(roomType, date, start, duration);

  // Phụ thu Big Room
  const surcharge = calcBigRoomSurcharge(roomType, people);
  const grandTotal = total + surcharge;

  // Nhãn loại ngày
  const dayLabel = dayType === 'weekend' ? '🎉 Cuối tuần / Lễ' : '📅 Ngày thường';

  // Breakdown rows — chỉ hiện khi vắt 2 khung
  const breakdownHtml = breakdown.length > 1
    ? breakdown.map(b => `
        <div class="price-row">
          <span style="font-size:.75rem;color:var(--muted)">
            ${b.slot === 'morning' ? 'Sáng' : 'Tối'} ${b.label} (${b.hours}h × ${b.rate}K)
          </span>
          <span>${b.amount}K</span>
        </div>`).join('')
    : `<div class="price-row">
        <span>Đơn giá</span>
        <span>${breakdown[0]?.rate || 0}K/giờ</span>
       </div>`;

  const surchargeHtml = surcharge > 0
    ? `<div class="price-row" style="color:#fb923c">
        <span>Phụ thu (${people - 6} người thêm)</span>
        <span>+${surcharge}K</span>
       </div>`
    : '';

  calc.innerHTML = `
    <div class="price-row">
      <span>Phòng</span>
      <span style="color:var(--white)">${room.name} — Tầng ${room.floor}</span>
    </div>
    <div class="price-row">
      <span>Loại ngày</span>
      <span>${dayLabel}</span>
    </div>
    <div class="price-row">
      <span>Thời gian</span>
      <span>${formatHour(start)} → ${formatHour(end)} (${duration}h)</span>
    </div>
    ${breakdownHtml}
    ${surchargeHtml}
    <div class="price-total">
      <span>Ước tính</span>
      <span>${grandTotal}K</span>
    </div>
    <p style="font-size:.68rem;color:var(--muted);margin-top:.5rem;font-family:var(--font-condensed);letter-spacing:1px">
      * Giá chính xác tính khi check-out
    </p>`;
}

/* ── Conflict check ─────────────────────────── */
async function checkConflict() {
  const roomSel  = document.getElementById('f-room');
  const durSel   = document.getElementById('f-duration');
  const startSel = document.getElementById('f-start');

  const roomId  = roomSel.value;
  const date    = document.getElementById('f-date').value;
  const start   = parseFloat(startSel.value);
  const duration= parseFloat(durSel.value) || 1;
  const end     = start + duration;
  const warn    = document.getElementById('conflictWarn');

  if (!roomId || !date) { warn.style.display = 'none'; return; }

  try {
    const free = await apiIsRoomFree(roomId, date, start, end);
    if (!free) {
      warn.style.display = 'block';
      warn.innerHTML = `Phòng <strong>${ROOMS.find(r=>r.id===roomId)?.name}</strong>
        đã có người đặt trong khung giờ này.
        <a href="rooms.html" style="color:var(--gold);font-weight:700">Xem lịch phòng</a>`;
    } else {
      warn.style.display = 'none';
    }
  } catch { warn.style.display = 'none'; }
}

/* ── Submit ─────────────────────────────────── */
async function submitBooking() {
  clearErrors();

  const roomSel  = document.getElementById('f-room');
  const durSel   = document.getElementById('f-duration');
  const startSel = document.getElementById('f-start');

  const name    = document.getElementById('f-name').value.trim();
  const phone   = document.getElementById('f-phone').value.trim();
  const date    = document.getElementById('f-date').value;
  const start   = parseFloat(startSel.value);
  const duration= parseFloat(durSel.value) || 1;
  const end     = start + duration;
  const people  = parseInt(document.getElementById('f-people').value) || 1;
  const roomId  = roomSel.value;
  const note    = document.getElementById('f-note').value.trim();

  let hasError = false;

  if (!name) {
    showFieldError('f-name','err-name','Vui lòng nhập họ tên');
    hasError = true;
  }
  if (!/^0\d{9}$/.test(phone)) {
    showFieldError('f-phone','err-phone','Số điện thoại phải 10 số, bắt đầu bằng 0');
    hasError = true;
  }
  if (!date) {
    showFormAlert('Vui lòng chọn ngày đến');
    hasError = true;
  }
  if (!roomId) {
    showFieldError('f-room','err-room','Vui lòng chọn phòng');
    hasError = true;
  }
  if (roomId) {
    const room = ROOMS.find(r => r.id === roomId);
    const maxP = room?.capacity_max || 10;
    if (people < 1) {
      showFieldError('f-people','err-people','Số người tối thiểu là 1');
      hasError = true;
    } else if (people > maxP) {
      showFieldError('f-people','err-people',`Phòng này chỉ chứa tối đa ${maxP} người`);
      hasError = true;
    }
  }

  if (hasError) {
    showFormAlert('Vui lòng kiểm tra lại thông tin bên trên');
    document.querySelector('.invalid')?.scrollIntoView({ behavior:'smooth', block:'center' });
    return;
  }

  const btn = document.querySelector('.btn-submit');
  btn.disabled    = true;
  btn.textContent = 'Đang kiểm tra...';

  try {
    // Kiểm tra trùng lịch lần cuối
    const free = await apiIsRoomFree(roomId, date, start, end);
    if (!free) {
      showFormAlert('Phòng đã có người đặt trong khung giờ này. Vui lòng chọn giờ khác!');
      return;
    }

    btn.textContent = 'Đang đặt phòng...';

    // Convert float hour → HH:MM cho API mới
    const startTime = formatHour(start).replace(' (+1)','');
    const endTime   = formatHour(end).replace(' (+1)','');
    const isOvernight = end >= 24;

    const room = ROOMS.find(r => r.id === roomId);

    await apiCreateBooking({
      customerName:  name,
      customerPhone: phone,
      roomId,
      bookingDate:   date,
      startTime,
      endTime,
      isOvernight,
      people,
      note,
      channel: 'website',
    });

    // Success modal
    document.getElementById('bookingDetails').innerHTML = `
      <div class="md-row"><span>Phòng</span><span class="md-val">${room.name} — Tầng ${room.floor}</span></div>
      <div class="md-row"><span>Ngày</span><span class="md-val">${parseLocalDate(date).toLocaleDateString('vi-VN',{weekday:'long',day:'numeric',month:'numeric'})}</span></div>
      <div class="md-row"><span>Giờ</span><span class="md-val">${formatHour(start)} – ${formatHour(end)}</span></div>
      <div class="md-row"><span>Số người</span><span class="md-val">${people} người</span></div>
      <div class="md-row"><span>Liên hệ</span><span class="md-val">${phone}</span></div>`;
    document.getElementById('successModal').classList.add('visible');

  } catch(err) {
    showFormAlert(err.message || 'Đặt phòng thất bại, vui lòng thử lại!');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Xác nhận đặt phòng';
  }
}

/* ── Validation helpers ─────────────────────── */
function showFieldError(inputId, errId, msg) {
  document.getElementById(inputId)?.classList.add('invalid');
  const el = document.getElementById(errId);
  if (el) { el.textContent = `⚠ ${msg}`; el.classList.add('visible'); }
}
function showFormAlert(msg) {
  const el = document.getElementById('formAlert');
  if (!el) return;
  el.textContent = `⚠ ${msg}`;
  el.classList.add('visible','error');
}
function clearErrors() {
  document.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('visible'));
  const al = document.getElementById('formAlert');
  if (al) al.classList.remove('visible','error','success');
}
function fieldOk(grpId, msgId, msg) {
  const grp = document.getElementById(grpId);
  if (grp) grp.className = grp.className.replace(/field-error|field-ok/g,'').trim() + ' field-ok';
  const m = document.getElementById(msgId);
  if (m) m.textContent = msg;
}
function fieldErr(grpId, msgId, msg) {
  const grp = document.getElementById(grpId);
  if (grp) grp.className = grp.className.replace(/field-error|field-ok/g,'').trim() + ' field-error';
  const m = document.getElementById(msgId);
  if (m) m.textContent = msg;
}