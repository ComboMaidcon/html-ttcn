/* ════════════════════════════════════════
   STATE
   ════════════════════════════════════════ */
let activeFloor  = '';
let activeType   = '';
let checkResult  = null;
const HOURS      = Array.from({length:18}, (_,i) => 9 + i);

/* ── Rooms page logic ── */

injectShared({ ticker: true });
initPage();
boot();

/* ════════════════════════════════════════
   BOOT — read URL params (như nhom7 ?category=)
   ════════════════════════════════════════ */
function boot() {
  const p = new URLSearchParams(location.search);
  activeFloor = p.get('floor') || '';
  activeType  = p.get('type')  || '';

  buildSelects();
  buildFloorTabs();
  buildTypeFilters();     // dynamic từ ROOMS data
  buildCheckerTypeOpts(); // đồng bộ checker dropdown
  showSkeleton();         // skeleton trước

  // Render thật sau 1 frame (perceived performance)
  requestAnimationFrame(() => renderAll());

  // Guided tour nếu lần đầu vào
  if (!localStorage.getItem('nox_toured')) {
    setTimeout(startTour, 800);
  }

  // Events
  document.getElementById('btnCheck').addEventListener('click', runCheck);
  document.getElementById('btnReset').addEventListener('click', resetCheck);
  document.getElementById('checkDate').addEventListener('change', () => renderAll());
  document.getElementById('floorTabs').addEventListener('click', onFloorTab);
  document.getElementById('typeFilters').addEventListener('click', onTypeFilter);
}

/* ════════════════════════════════════════
   SELECTS & FILTERS
   ════════════════════════════════════════ */
function buildSelects() {
  const s = document.getElementById('checkStart');
  const e = document.getElementById('checkEnd');
  HOURS.forEach(h => {
    s.insertAdjacentHTML('beforeend', `<option value="${h}">${formatHour(h)}</option>`);
    e.insertAdjacentHTML('beforeend', `<option value="${h}">${formatHour(h)}</option>`);
  });
  s.value = 14; e.value = 17;
  document.getElementById('checkDate').value = todayStr();
}

/* Dynamic floor tabs — generated from ROOMS (không hardcode) */
function buildFloorTabs() {
  const floors = [...new Set(ROOMS.map(r => r.floor))].sort((a,b) => b-a);
  const wrap = document.getElementById('floorTabs');
  const allCount = ROOMS.length;
  let html = `<button class="floor-tab${activeFloor===''?' active':''}" data-floor="">
    Tất cả <span class="ftcount">${allCount}</span></button>`;
  floors.forEach(f => {
    const count = ROOMS.filter(r => r.floor === f).length;
    const icon  = f === 4 ? '🎬' : '🏢';
    const label = f === 4 ? `${icon} Tầng ${f} – Cine Box` : `${icon} Tầng ${f}`;
    html += `<button class="floor-tab${activeFloor==f?' active':''}" data-floor="${f}">
      ${label} <span class="ftcount">${count}</span></button>`;
  });
  wrap.innerHTML = html;
}

/* Dynamic type filters — generated from ROOMS data (như nhom7 brand filter) */
function buildTypeFilters() {
  const types = [...new Set(ROOMS.map(r => r.type))];
  const wrap  = document.getElementById('typeFilters');
  let html = `<button class="type-btn${activeType===''?' active':''}" data-type="">Tất cả loại</button>`;
  types.forEach(t => {
    html += `<button class="type-btn${activeType===t?' active':''}" data-type="${t}">
      ${TYPE_LABELS[t] || t}</button>`;
  });
  wrap.innerHTML = html;
}

/* Sync checker dropdown loại phòng */
function buildCheckerTypeOpts() {
  const sel = document.getElementById('checkType');
  const types = [...new Set(ROOMS.map(r => r.type))];
  types.forEach(t => {
    sel.insertAdjacentHTML('beforeend',
      `<option value="${t}">${TYPE_LABELS[t] || t}</option>`);
  });
}

/* ════════════════════════════════════════
   URL PARAMS — push state khi filter thay đổi
   ════════════════════════════════════════ */
function pushParams() {
  const p = new URLSearchParams();
  if (activeFloor) p.set('floor', activeFloor);
  if (activeType)  p.set('type',  activeType);
  const qs = p.toString();
  history.replaceState({}, '', qs ? '?' + qs : location.pathname);
}

/* ════════════════════════════════════════
   EVENT HANDLERS
   ════════════════════════════════════════ */
function onFloorTab(e) {
  const btn = e.target.closest('.floor-tab'); if (!btn) return;
  activeFloor = btn.dataset.floor;
  document.querySelectorAll('.floor-tab').forEach(b =>
    b.classList.toggle('active', b === btn));
  pushParams();
  renderAll();
}

function onTypeFilter(e) {
  const btn = e.target.closest('.type-btn'); if (!btn) return;
  activeType = btn.dataset.type;
  document.querySelectorAll('.type-btn').forEach(b =>
    b.classList.toggle('active', b === btn));
  pushParams();
  renderAll();
}

/* ════════════════════════════════════════
   SKELETON LOADER
   ════════════════════════════════════════ */
function skeletonCard() {
  return `<div class="room-card skeleton-card">
    <div class="room-thumb skeleton" style="height:155px;border-radius:0"></div>
    <div class="room-body">
      <div class="skeleton" style="height:14px;width:55%;border-radius:4px;margin-bottom:8px"></div>
      <div class="skeleton" style="height:11px;width:35%;border-radius:4px;margin-bottom:14px"></div>
      <div class="skeleton" style="height:11px;width:90%;border-radius:4px;margin-bottom:6px"></div>
      <div class="skeleton" style="height:11px;width:75%;border-radius:4px;margin-bottom:14px"></div>
      <div class="skeleton" style="height:36px;border-radius:6px"></div>
    </div>
  </div>`;
}

function showSkeleton() {
  document.getElementById('roomsWrap').innerHTML =
    `<div class="floor-section">
       <div class="rooms-grid">${Array(6).fill(skeletonCard()).join('')}</div>
     </div>`;
}

/* ════════════════════════════════════════
   CHECKER
   ════════════════════════════════════════ */
function runCheck() {
  const date  = document.getElementById('checkDate').value;
  const start = parseInt(document.getElementById('checkStart').value);
  const end   = parseInt(document.getElementById('checkEnd').value);
  const type  = document.getElementById('checkType').value;

  if (!date) { showStatus('⚠️ Vui lòng chọn ngày.', false); return; }
  if (start >= end) { showStatus('⚠️ Giờ kết thúc phải sau giờ bắt đầu.', false); return; }

  let avail = getAvailableRooms(date, start, end);
  if (type) avail = avail.filter(r => r.type === type);
  checkResult = new Set(avail.map(r => r.id));

  const scope = type ? ROOMS.filter(r => r.type === type) : ROOMS;
  showStatus(
    checkResult.size === 0
      ? `Không có phòng trống ${formatHour(start)}–${formatHour(end)}. Thử giờ khác!`
      : `✅ Còn <strong>${checkResult.size}/${scope.length} phòng trống</strong> từ ${formatHour(start)} → ${formatHour(end)}.`,
    checkResult.size > 0
  );

  if (type) {
    activeType = type;
    document.querySelectorAll('.type-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.type === type));
  }
  renderAll();
  document.getElementById('roomsWrap').scrollIntoView({ behavior:'smooth', block:'start' });
}

function resetCheck() {
  checkResult = null;
  document.getElementById('checkerStatus').className = 'checker-status';
  renderAll();
}

function showStatus(html, ok) {
  const el = document.getElementById('checkerStatus');
  el.innerHTML = html;
  el.className = 'checker-status visible';
  el.style.color = ok ? '#4ade80' : '#f87171';
}

/* ════════════════════════════════════════
   RENDER — map().join('') pattern
   ════════════════════════════════════════ */
function renderAll() {
  const date   = document.getElementById('checkDate').value || todayStr();
  const floors = activeFloor ? [parseInt(activeFloor)] : [6, 5, 4];
  const wrap   = document.getElementById('roomsWrap');

  const html = floors.map(floor => {
    let rooms = ROOMS.filter(r => r.floor === floor);
    if (activeType) rooms = rooms.filter(r => r.type === activeType);
    if (!rooms.length) return '';

    return `<div class="floor-section">
      <div class="floor-header">
        <span class="floor-lbl">${FLOOR_META[floor].label}</span>
        <span class="floor-name">${FLOOR_META[floor].desc}</span>
        <span class="floor-count">${rooms.length} phòng</span>
      </div>
      <div class="rooms-grid">
        ${rooms.map(r => renderRoomCard(r, date)).join('')}
      </div>
    </div>`;
  }).join('');

  wrap.innerHTML = html ||
    `<div class="empty-state">
       <span class="ei">🔍</span>
       <h3>Không tìm thấy phòng</h3>
       <p>Thử bỏ bộ lọc hoặc chọn loại khác.</p>
     </div>`;

  // Scroll reveal cho elements mới inject
  document.querySelectorAll('.rev:not(.on)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('on');
  });
}

function renderRoomCard(room, date) {
  const booked  = getRoomBookings(room.id, date);
  const freeH   = getFreeSlots(room.id, date).reduce((s,sl) => s + sl.end - sl.start, 0);

  let cardCls = '', dotCls = '', lbl = '';
  if (checkResult !== null) {
    if (checkResult.has(room.id)) { cardCls='avail-ok'; dotCls='free'; lbl='Còn trống'; }
    else                          { cardCls='unavailable'; dotCls='busy'; lbl='Đã có khách'; }
  } else {
    if (freeH >= 17*.8)      { dotCls='free';    lbl='Còn nhiều chỗ'; }
    else if (freeH >= 17*.3) { dotCls='partial'; lbl='Còn vài khung'; }
    else                     { dotCls='busy';    lbl='Gần kín'; }
  }

  const tags = room.features.map(f => `<span class="rtag">${f}</span>`).join('');


  return `
  <div class="room-card ${cardCls}" onclick="openRoomModal('${room.id}')" style="cursor:pointer">
    <div class="room-top">
      <div class="room-thumb" style="background:${room.gradient}">${room.emoji}</div>
      <div class="room-badges"><span class="badge ${room.badgeClass}">${room.badge}</span></div>
      <div class="avail-indicator">
        <span class="avail-dot ${dotCls}"></span>
        <span class="avail-label ${dotCls}">${lbl}</span>
      </div>
    </div>
    <div class="room-body">
      <div class="room-name">${room.name} <small style="color:var(--muted);font-weight:400;font-size:.7rem">Tầng ${room.floor}</small></div>
      <div class="room-cap">👥 ${room.capacity}</div>
      <p class="room-desc">${room.desc}</p>
      <div class="room-tags">${tags}</div>
      <div class="room-footer2">
        <div class="room-price">${room.price}K <sub>/ giờ (từ)</sub></div>
        <button class="btn-sm" onclick="goBook('${room.id}')">Đặt ngay →</button>
      </div>
    </div>
  </div>`;
}

function goBook(id) {
  const date  = document.getElementById('checkDate').value || todayStr();
  const start = document.getElementById('checkStart').value;
  const end   = document.getElementById('checkEnd').value;
  location.href = `booking.html?room=${id}&date=${date}&start=${start}&end=${end}`;
}

/* ════════════════════════════════════════
   GUIDED TOUR — Driver.js (như nhom7)
   ════════════════════════════════════════ */
function startTour() {
  if (typeof window.driver === 'undefined') return;
  const d = window.driver.js.driver({
    showProgress: true,
    steps: [
      {
        element: '.checker-wrap',
        popover: {
          title: '🔍 Bước 1: Kiểm tra phòng trống',
          description: 'Chọn ngày, khung giờ và loại phòng để xem phòng nào còn trống.',
          side: 'bottom',
        }
      },
      {
        element: '#floorTabs',
        popover: {
          title: '🏢 Bước 2: Chọn tầng',
          description: 'Tầng 4 là Cine Box (phim + Netflix). Tầng 5–6 là Game Rooms (PS5 + Boardgame).',
          side: 'bottom',
        }
      },
      {
        element: '#typeFilters',
        popover: {
          title: '🎮 Bước 3: Lọc theo loại phòng',
          description: 'Small (1–2 người) · Medium Classic/Deluxe (3–4 người) · Big Room (đến 8 người).',
          side: 'bottom',
        }
      },
      {
        element: '.room-card',
        popover: {
          title: '📅 Timeline đặt phòng',
          description: 'Thanh màu xanh = trống · đỏ = đã đặt. Hover để xem giờ cụ thể.',
          side: 'top',
        }
      },
    ],
    onDestroyed: () => localStorage.setItem('nox_toured', '1'),
  });
  d.drive();
}

/* ════════════════════════════════
   ROOM DETAIL MODAL
   ════════════════════════════════ */
function openRoomModal(roomId) {
  const room = ROOMS.find(r => r.id === roomId);
  if (!room) return;

  document.getElementById('rmTitle').textContent =
    `${room.emoji} ${room.name} — Tầng ${room.floor}`;

  document.getElementById('rmInfoRow').innerHTML = `
    <span class="rm-badge gold">${room.badge}</span>
    <span class="rm-badge">👥 ${room.capacity}</span>
    <span class="rm-badge">💰 Từ ${room.price}K/giờ</span>
    <span class="rm-badge" style="margin-left:auto;display:flex;gap:.6rem;align-items:center">
      <span style="display:inline-block;width:12px;height:12px;background:rgba(74,222,128,.4);border:1px solid #4ade80;border-radius:2px"></span> Còn trống
      <span style="display:inline-block;width:12px;height:12px;background:rgba(248,113,113,.3);border:1px solid #f87171;border-radius:2px;margin-left:.4rem"></span> Đã đặt
    </span>`;

  // Hide old timeline elements
  const tlLabel = document.querySelector('.rm-timeline-label');
  const tlLabels = document.querySelector('.rm-tl-labels');
  if (tlLabel)  tlLabel.style.display = 'none';
  if (tlLabels) tlLabels.style.display = 'none';
  document.getElementById('rmTlBar').innerHTML = '';

  // Build 7-day calendar grid
  const days = Array.from({length: 7}, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const DAY_NAMES  = ['CN','T2','T3','T4','T5','T6','T7'];
  const todayStr_  = formatDate(new Date());

  const headCols = days.map(d => {
    const ds   = formatDate(d);
    const isT  = ds === todayStr_;
    return `<th class="${isT ? 'today' : ''}">
      <span class="day-name">${DAY_NAMES[d.getDay()]}</span>
      <span class="day-date">${d.getDate()}/${d.getMonth()+1}</span>
    </th>`;
  }).join('');

  const bodyRows = Array.from({length: 17}, (_, i) => {
    const h = 9 + i;
    const cells = days.map(d => {
      const ds   = formatDate(d);
      const busy = getRoomBookings(roomId, ds).some(b => h >= b.start && h < b.end);
      return busy
        ? `<td class="busy"></td>`
        : `<td class="sched-cell-free-td"></td>`;
    }).join('');
    return `<tr><td class="time-lbl">${formatHour(h)}</td>${cells}</tr>`;
  }).join('');

  document.getElementById('rmSlotList').innerHTML = `
    <div class="sched-grid-wrap">
      <table class="sched-grid">
        <thead><tr><th class="time-col">Giờ</th>${headCols}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;

  document.getElementById('rmPrice').innerHTML =
    `${room.price}K <sub>/ giờ (từ)</sub>`;
  document.getElementById('rmBookBtn').onclick = () => {
    closeRoomModal();
    location.href = `booking.html?room=${roomId}`;
  };

  document.getElementById('roomModalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}


function closeRoomModal() {
  document.getElementById('roomModalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function fmtDisplayDate(str) {
  if (!str) return '';
  return parseLocalDate(str).toLocaleDateString('vi-VN',
    { weekday:'short', day:'numeric', month:'numeric' });
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeRoomModal();
});
