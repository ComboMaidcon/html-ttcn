/* ── Admin page logic ── */

/* ── Auth ── */
async function doLogin() {
  const email    = document.getElementById('emailInput')?.value || 'admin@noxjoystation.com';
  const password = document.getElementById('pwInput').value;

  try {
    await apiLogin(email, password);
    sessionStorage.setItem('nox_admin', '1');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').style.display    = 'block';
    setupAdminUI();
    buildCatSelects();
    await render();
  } catch (err) {
    document.getElementById('loginErr').style.display = 'block';
    document.getElementById('loginErr').textContent   = `❌ ${err.message}`;
    document.getElementById('pwInput').value = '';
    document.getElementById('pwInput').focus();
  }
}

function logout() {
  apiLogout();
  sessionStorage.removeItem('nox_admin');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminApp').style.display    = 'none';
  document.getElementById('pwInput').value = '';
}

document.getElementById('pwInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') doLogin();
});

/* ── Cat selects ── */
let filterCat  = '';
let editingId  = null;

function catsFor(tab) { return MENU_CATS.filter(c => c.tab === tab); }

function buildCatSelects() {
  ['aCat','eCat'].forEach(id => syncCatSelect(id, document.getElementById('aTab')?.value || 'drink'));
  document.getElementById('aTab').addEventListener('change', e => syncCatSelect('aCat', e.target.value));
  document.getElementById('eTab').addEventListener('change', e => syncCatSelect('eCat', e.target.value));
}

function syncCatSelect(selId, tab) {
  const sel  = document.getElementById(selId);
  const cats = catsFor(tab);
  sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

/* ── Stats ── */
async function renderStats() {
  let items = [];
  try { items = await apiGetMenuAdmin(); } catch { items = getMenuItems(); }

  const total  = items.length;
  const avail  = items.filter(i => i.available !== false).length;
  const drinks = items.filter(i => i.tab === 'drink').length;
  const foods  = items.filter(i => i.tab === 'food').length;

  document.getElementById('statsBar').innerHTML = `
    <div class="stat-card"><div class="stat-num">${total}</div><div class="stat-label">Tổng số món</div></div>
    <div class="stat-card"><div class="stat-num">${avail}</div><div class="stat-label">Đang có sẵn</div></div>
    <div class="stat-card"><div class="stat-num">${drinks}</div><div class="stat-label">Đồ uống</div></div>
    <div class="stat-card"><div class="stat-num">${foods}</div><div class="stat-label">Đồ ăn</div></div>`;
}

/* ── Cat filter chips ── */
async function renderCatFilter() {
  let items = [];
  try { items = await apiGetMenuAdmin(); } catch { items = getMenuItems(); }

  const usedCats = [...new Set(items.map(i => i.cat))];
  const cats     = MENU_CATS.filter(c => usedCats.includes(c.id));
  let html = `<button class="cf-btn ${filterCat===''?'active':''}" onclick="setFilter('')">Tất cả</button>`;
  cats.forEach(c => {
    html += `<button class="cf-btn ${filterCat===c.id?'active':''}" onclick="setFilter('${c.id}')">${c.icon} ${c.name}</button>`;
  });
  document.getElementById('catFilter').innerHTML = html;
}

function setFilter(cat) { filterCat = cat; render(); }

/* ── Items list ── */
async function renderList() {
  let items = [];
  try { items = await apiGetMenuAdmin(); } catch { items = getMenuItems(); }
  if (filterCat) items = items.filter(i => i.cat === filterCat);

  const wrap = document.getElementById('itemsList');
  if (!items.length) {
    wrap.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--muted)">Không có món nào.</div>`;
    return;
  }

  wrap.innerHTML = items.map(item => {
    const cat   = MENU_CATS.find(c => c.id === item.cat);
    const avail = item.available !== false;
    return `
    <div class="item-row ${avail?'':'unavail'}">
      <div>
        <div class="ir-name">${item.name}</div>
        ${item.desc||item.variants?`<div class="ir-sub">${[item.desc,item.variants].filter(Boolean).join(' · ')}</div>`:''}
      </div>
      <div class="ir-price">${item.price}K</div>
      <div class="ir-cat col-cat">${cat?cat.icon+' '+cat.name:item.cat}</div>
      <div class="ir-tab">${item.tab==='drink'?'🧃 Uống':'🍕 Ăn'}</div>
      <div class="ir-avail">
        <button class="avail-toggle ${avail?'on':'off'}"
          onclick="toggleAvail('${item.id}',${!avail})"></button>
        <span style="color:${avail?'#4ade80':'#f87171'}">${avail?'Có':'Hết'}</span>
      </div>
      <div class="ir-actions">
        <button class="btn-edit" onclick="openEdit('${item.id}')">Sửa</button>
        <button class="btn-del"  onclick="doDelete('${item.id}','${item.name}')">Xóa</button>
      </div>
    </div>`;
  }).join('');
}

async function render() {
  await Promise.all([renderStats(), renderCatFilter(), renderList()]);
}

/* ── Add ── */
async function doAdd() {
  const name     = document.getElementById('aName').value.trim();
  const price    = parseInt(document.getElementById('aPrice').value);
  const tab      = document.getElementById('aTab').value;
  const cat      = document.getElementById('aCat').value;
  const desc     = document.getElementById('aDesc').value.trim();
  const variants = document.getElementById('aVariants').value.trim();

  if (!name)           { showToast('Chưa nhập tên món!', true); return; }
  if (!price || price < 1) { showToast('Giá không hợp lệ!', true); return; }

  try {
    await apiAddMenuItem({ name, price, tab, cat: cat, desc: desc||undefined, variants: variants||undefined, available: true });
    ['aName','aDesc','aVariants'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('aPrice').value = '';
    await render();
    showToast(`✅ Đã thêm "${name}"`);
  } catch (err) {
    showToast(err.message || 'Thêm thất bại', true);
  }
}

/* ── Toggle available ── */
async function toggleAvail(id, val) {
  try {
    await apiUpdateMenuItem(id, { available: val });
    await render();
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ── Delete ── */
async function doDelete(id, name) {
  if (!confirm(`Xóa "${name}"? Không thể hoàn tác.`)) return;
  try {
    await apiDeleteMenuItem(id);
    await render();
    showToast(`🗑 Đã xóa "${name}"`);
  } catch (err) {
    showToast(err.message, true);
  }
}

/* ── Edit modal ── */
async function openEdit(id) {
  let items = [];
  try { items = await apiGetMenuAdmin(); } catch { items = getMenuItems(); }
  const item = items.find(i => i.id === id);
  if (!item) return;

  editingId = id;
  document.getElementById('eName').value     = item.name;
  document.getElementById('ePrice').value    = item.price;
  document.getElementById('eTab').value      = item.tab;
  syncCatSelect('eCat', item.tab);
  document.getElementById('eCat').value      = item.cat;
  document.getElementById('eDesc').value     = item.desc || '';
  document.getElementById('eVariants').value = item.variants || '';
  document.getElementById('editModal').classList.add('open');
}

function closeModal() {
  document.getElementById('editModal').classList.remove('open');
  editingId = null;
}

async function doSaveEdit() {
  if (!editingId) return;
  const name     = document.getElementById('eName').value.trim();
  const price    = parseInt(document.getElementById('ePrice').value);
  const tab      = document.getElementById('eTab').value;
  const cat      = document.getElementById('eCat').value;
  const desc     = document.getElementById('eDesc').value.trim();
  const variants = document.getElementById('eVariants').value.trim();

  if (!name || !price) { showToast('Thiếu tên hoặc giá!', true); return; }

  try {
    await apiUpdateMenuItem(editingId, {
      name, price, tab, cat,
      desc: desc||undefined, variants: variants||undefined
    });
    closeModal();
    await render();
    showToast(`✅ Đã cập nhật "${name}"`);
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById('editModal').addEventListener('click', e => {
  if (e.target === document.getElementById('editModal')) closeModal();
});

/* ── Export ── */
async function exportData() {
  let items = [];
  try { items = await apiGetMenuAdmin(); } catch { items = getMenuItems(); }
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const a    = Object.assign(document.createElement('a'), {
    href:     URL.createObjectURL(blob),
    download: `nox-menu-${new Date().toISOString().split('T')[0]}.json`,
  });
  a.click();
  showToast('📥 Đã export JSON');
}

/* ── Toast ── */
function showToast(msg, err = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className   = `toast show${err?' err':''}`;
  setTimeout(() => t.className = 'toast', 2600);
}

function setupAdminUI() {
  const role = sessionStorage.getItem('nox_admin_role') || 'admin';
  const name = sessionStorage.getItem('nox_admin_name') || 'Admin';
  
  const ui = document.getElementById('userInfo');
  if (ui) {
    ui.textContent = `Xin chào, ${name} (${role === 'admin' ? 'Owner' : 'Staff'})`;
  }

  if (role === 'staff') {
    // Hide tabs not for staff
    document.querySelectorAll('.sidebar-tab[data-tab="reports"], .sidebar-tab[data-tab="menu"], .sidebar-tab[data-tab="rooms"], .sidebar-tab[data-tab="reviews"]').forEach(el => el.style.display = 'none');
  }
}

/* ── Auto-login if session active ── */
if (apiIsLoggedIn() && sessionStorage.getItem('nox_admin') === '1') {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'block';
  setupAdminUI();
  buildCatSelects();
  render();
  initAdminTabs();
}

/* ══════════════════════════════════════
   ADMIN TABS & NEW MODULES
   ══════════════════════════════════════ */

function initAdminTabs() {
  document.querySelectorAll('.sidebar-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sidebar-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      
      if (btn.dataset.tab === 'bookings') renderBookingsTab();
      if (btn.dataset.tab === 'rooms')    renderRoomsTab();
      if (btn.dataset.tab === 'reviews')  renderReviewsTab();
      if (btn.dataset.tab === 'reports')  renderReportsTab();
      if (btn.dataset.tab === 'invoices') renderInvoicesTab();
      if (btn.dataset.tab === 'kitchen')  renderKitchenTab();
      if (btn.dataset.tab === 'pos')      initPosTab();
    });
  });
  renderBookingsTab(); // Default tab
}

/* ── Bookings Tab ── */
async function renderBookingsTab() {
  const wrap = document.getElementById('bookingsList');
  wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Đang tải...</div>';
  try {
    const res = await apiGetBookingsAdmin();
    if (!res.bookings || !res.bookings.length) {
      wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Chưa có đơn đặt phòng nào.</div>';
      return;
    }
    wrap.innerHTML = res.bookings.map(b => {
      const isNight = b.is_overnight ? ' (Qua đêm)' : '';
      return `<div class="item-row booking-row">
        <div>${b.booking_date}</div>
        <div>${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}${isNight}</div>
        <div style="font-weight:700;color:var(--gold)">
          T${b.rooms?.floor || '?'} - ${b.rooms?.name || b.room_id}
          ${b.status === 'confirmed' ? `<br><a href="/UI/qr-order.html?room=${b.room_id}" target="_blank" style="font-size:.7rem;color:#4ade80;text-decoration:none;display:inline-block;margin-top:4px;">🛒 Đặt món ngay</a>` : ''}
        </div>
        <div>
          <div class="ir-name">${b.customers?.name || 'Khách'}</div>
          <div class="ir-sub">${b.customers?.phone || ''}</div>
        </div>
        <div><span class="status-badge ${b.status}">${b.status}</span></div>
        <div class="ir-actions" style="flex-wrap:wrap;">
          ${b.status==='pending' ? `<button class="btn-edit" onclick="updateBooking('${b.id}', 'confirmed')">Nhận</button>` : ''}
          ${b.status==='confirmed' ? `<button class="btn-edit" style="color:#eab308;border-color:#eab308" onclick="updateBooking('${b.id}', 'in_use')">Check-in</button>` : ''}
          ${b.status==='in_use' ? `<span style="font-size:0.8rem; color:#4ade80">👉 Sang tab Bán hàng để Thanh toán</span>` : ''}
          ${b.status!=='cancelled' && b.status!=='completed' && b.status!=='in_use' ? `<button class="btn-del" onclick="updateBooking('${b.id}', 'cancelled')">Hủy</button>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171">Lỗi: ${err.message}</div>`;
  }
}

async function updateBooking(id, status) {
  try {
    await apiUpdateBookingStatus(id, status);
    showToast('✅ Đã cập nhật trạng thái');
    renderBookingsTab();
  } catch(err) {
    showToast(err.message, true);
  }
}

/* ── Rooms Tab ── */
async function renderRoomsTab() {
  const wrap = document.getElementById('roomsList');
  wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Đang tải...</div>';
  try {
    const res = await apiGetRoomsAdmin();
    wrap.innerHTML = res.rooms.map(r => {
      return `<div class="item-row room-row ${r.is_active?'':'unavail'}">
        <div class="ir-name">${r.name}</div>
        <div>Tầng ${r.floor}</div>
        <div style="text-transform:uppercase;font-size:.7rem;color:var(--gold)">${r.type}</div>
        <div>
          <span style="color:${r.is_active?'#4ade80':'#f87171'}">${r.is_active?'Hoạt động':'Bảo trì'}</span>
        </div>
        <div class="ir-actions">
          <button class="avail-toggle ${r.is_active?'on':'off'}" onclick="toggleRoom('${r.id}', ${!r.is_active})"></button>
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171">Lỗi: ${err.message}</div>`;
  }
}

async function toggleRoom(id, isActive) {
  try {
    await apiUpdateRoom(id, { is_active: isActive });
    renderRoomsTab();
  } catch(err) {
    showToast(err.message, true);
  }
}

/* ── Reviews Tab ── */
async function renderReviewsTab() {
  const wrap = document.getElementById('reviewsList');
  wrap.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--muted)">Đang tải...</div>';
  try {
    const res = await apiGetReviewsAdmin();
    wrap.innerHTML = res.reviews.map(r => {
      const stars = '⭐'.repeat(r.rating);
      return `<div class="item-row review-row ${r.is_approved?'':'unavail'}" style="opacity:${r.is_approved?1:.6}">
        <div class="ir-name">${r.name}</div>
        <div class="ir-sub">${r.room_name || '-'}</div>
        <div>${stars}</div>
        <div style="font-size:.8rem;line-height:1.4">${r.content}</div>
        <div>
          <span style="color:${r.is_approved?'#4ade80':'var(--gold)'}">${r.is_approved?'Đã duyệt':'Chờ duyệt'}</span>
        </div>
        <div class="ir-actions" style="flex-wrap:wrap;">
          <button class="avail-toggle ${r.is_approved?'on':'off'}" style="margin-right:10px" onclick="toggleReview('${r.id}', ${!r.is_approved})"></button>
          <button class="btn-del" onclick="deleteReview('${r.id}')">Xóa</button>
        </div>
      </div>`;
    }).join('');
  } catch(err) {
    wrap.innerHTML = `<div style="padding:2rem;text-align:center;color:#f87171">Lỗi: ${err.message}</div>`;
  }
}

async function toggleReview(id, isApproved) {
  try {
    await apiApproveReview(id, isApproved);
    renderReviewsTab();
  } catch(err) {
    showToast(err.message, true);
  }
}

async function deleteReview(id) {
  if(!confirm('Xóa vĩnh viễn đánh giá này?')) return;
  try {
    await apiDeleteReview(id);
    showToast('🗑 Đã xóa đánh giá');
    renderReviewsTab();
  } catch(err) {
    showToast(err.message, true);
  }
}

/* ── Reports Tab ── */
let chartInstances = {};
async function renderReportsTab() {
  const startInput = document.getElementById('repStart');
  const endInput   = document.getElementById('repEnd');
  
  // Set default to last 30 days if empty
  if (!startInput.value || !endInput.value) {
    const today = new Date();
    endInput.value = today.toISOString().split('T')[0];
    const past30 = new Date(today);
    past30.setDate(past30.getDate() - 30);
    startInput.value = past30.toISOString().split('T')[0];
  }

  try {
    const res = await apiGetReportsDashboard(startInput.value, endInput.value);
    
    // 1. Overview Stats
    const statsWrap = document.getElementById('reportStats');
    statsWrap.innerHTML = `
      <div class="stat-card">
        <div class="stat-num">${(res.overview.totalRevenue / 1000000).toFixed(1)}M</div>
        <div class="stat-label">TỔNG DOANH THU</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${res.overview.totalBookings}</div>
        <div class="stat-label">LƯỢT ĐẶT PHÒNG</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${res.overview.totalReviews}</div>
        <div class="stat-label">ĐÁNH GIÁ</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${res.overview.avgRating} <span style="font-size:1rem;color:var(--gold)">⭐</span></div>
        <div class="stat-label">ĐIỂM TRUNG BÌNH</div>
      </div>
    `;

    // Helper to destroy old charts to prevent overlapping when re-rendering
    const setupChart = (ctxId, config) => {
      if (chartInstances[ctxId]) chartInstances[ctxId].destroy();
      const ctx = document.getElementById(ctxId).getContext('2d');
      chartInstances[ctxId] = new Chart(ctx, config);
    };

    // Chart Global Config for dark theme
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.borderColor = 'rgba(245, 197, 24, 0.05)';

    // 2. Revenue Line Chart
    setupChart('revenueChart', {
      type: 'line',
      data: {
        labels: res.revenueLine.labels,
        datasets: [{
          label: 'Doanh thu (VND)',
          data: res.revenueLine.data,
          borderColor: '#f5c518',
          backgroundColor: 'rgba(245, 197, 24, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 3. Menu Bar Chart
    setupChart('menuChart', {
      type: 'bar',
      data: {
        labels: res.menuPerformance.labels,
        datasets: [{
          label: 'Lượt gọi',
          data: res.menuPerformance.data,
          backgroundColor: '#4ade80',
          borderRadius: 4
        }]
      },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });

    // 4. Rooms Doughnut Chart
    setupChart('roomsChart', {
      type: 'doughnut',
      data: {
        labels: res.roomsPerformance.labels,
        datasets: [{
          data: res.roomsPerformance.data,
          backgroundColor: ['#f5c518', '#f87171', '#4ade80', '#60a5fa', '#a78bfa'],
          borderWidth: 0
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'right' } } }
    });

  } catch(err) {
    showToast('Lỗi tải báo cáo: ' + err.message, true);
  }
}

/* ── Invoices Tab ── */
async function renderInvoicesTab() {
  const wrap = document.getElementById('invoicesList');
  const sort = document.getElementById('invSort').value;
  wrap.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Đang tải...</td></tr>';
  
  try {
    const res = await apiGetInvoicesAdmin(sort);
    if (!res.invoices || !res.invoices.length) {
      wrap.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--muted)">Chưa có hoá đơn nào.</td></tr>';
      return;
    }

    wrap.innerHTML = res.invoices.map(inv => {
      const b = inv.bookings;
      const c = b?.customers;
      const r = b?.rooms;
      
      const timeStr = b ? `${b.start_time.slice(0,5)} - ${b.end_time.slice(0,5)}` : 'N/A';
      const custStr = c ? `<strong style="color:var(--gold)">${c.name}</strong><br><small style="color:var(--muted)">${c.phone}</small>` : 'Khách vãng lai';
      const roomStr = r ? r.name : (b ? b.room_id : 'N/A');
      
      // Lấy danh sách đồ ăn từ invoice_items
      const foodItems = inv.invoice_items ? inv.invoice_items.filter(i => i.item_type === 'food') : [];
      let foodHtml = '<span style="color:var(--muted)">Không có</span>';
      if (foodItems.length > 0) {
        foodHtml = foodItems.map(f => `<span style="display:inline-block;background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;font-size:.8rem;margin-right:4px;margin-bottom:4px;">${f.quantity}x ${f.description}</span>`).join('');
      }
      
      return `
        <tr>
          <td>${custStr}<br><span style="font-size:.85rem;color:#f87171">${roomStr}</span></td>
          <td style="color:var(--muted)">${timeStr}</td>
          <td style="max-width:200px">${foodHtml}</td>
          <td style="color:var(--muted)">${(inv.room_amount||0).toLocaleString()}đ</td>
          <td style="color:var(--muted)">${(inv.food_amount||0).toLocaleString()}đ</td>
          <td style="color:#4ade80;font-weight:600">${(inv.total_amount||0).toLocaleString()}đ</td>
          <td style="color:var(--muted)">${new Date(inv.created_at).toLocaleString('vi-VN')}<br><span class="status-badge completed" style="margin-top:4px;font-size:.7rem">Đã thu</span></td>
        </tr>
      `;
    }).join('');
  } catch(err) {
    wrap.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#f87171">${err.message}</td></tr>`;
  }
}

/* ── Kitchen Tab (Orders) ── */
async function renderKitchenTab() {
  const wrap = document.getElementById('kitchenList');
  wrap.innerHTML = '<div style="padding:2rem;color:var(--muted)">Đang tải...</div>';
  
  try {
    const res = await apiGetOrdersAdmin();
    if (!res.orders || !res.orders.length) {
      wrap.innerHTML = '<div style="padding:2rem;color:var(--muted)">Chưa có đơn gọi món mới nào.</div>';
      return;
    }

    wrap.innerHTML = res.orders.map(o => {
      const roomStr = `T${o.bookings?.rooms?.floor || '?'} - ${o.bookings?.rooms?.name || o.bookings?.room_id || 'N/A'}`;
      const itemsHtml = o.order_items.map(i => `
        <div style="display:flex; justify-content:space-between; margin-bottom:.5rem; border-bottom:1px dashed rgba(255,255,255,.1); padding-bottom:.2rem">
          <span>${i.quantity}x ${i.menu_items?.name || 'Món'}</span>
          <span style="color:var(--gold)">${(i.unit_price * i.quantity / 1000).toLocaleString()}k</span>
        </div>
      `).join('');

      return `
        <div class="add-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem">
            <h3 style="color:var(--gold); margin:0">${roomStr}</h3>
            <span class="status-badge pending">Chờ làm</span>
          </div>
          <div style="margin-bottom:1rem; font-size:.9rem">
            ${itemsHtml}
          </div>
          <p style="font-size:.85rem; color:var(--muted); margin-bottom:1rem">
            Ghi chú: ${o.note || 'Không có'}
          </p>
          <button class="btn-edit" style="width:100%; color:#4ade80; border-color:#4ade80" onclick="approveOrder('${o.id}')">Đã giao / Hoàn tất</button>
        </div>
      `;
    }).join('');
  } catch(err) {
    wrap.innerHTML = `<div style="color:#f87171">${err.message}</div>`;
  }
}

async function approveOrder(id) {
  try {
    await apiApproveOrder(id);
    showToast('Đã xác nhận đơn hàng');
    renderKitchenTab();
  } catch(err) {
    showToast(err.message, true);
  }
}

/* ══════════════════════════════════════
   POS SYSTEM LOGIC
   ══════════════════════════════════════ */

let posState = {
  cart: [],
  carts: {}, // Multi-session cart persistence: { roomId: [...] }
  pastOrders: [],
  selectedRoom: null,
  activeBooking: null,
  activeBookings: [],
  menuItems: [],
  rooms: [],
  currentCat: 'all',
  floorFilter: 'all',
  statusFilter: 'all'
};

async function initPosTab() {
  if (posState.menuItems.length === 0) {
    try {
      posState.menuItems = await apiGetMenuAdmin();
    } catch {
        posState.menuItems = getMenuItems(); // fallback to static data
    }
  }
  if (posState.rooms.length === 0) {
    try {
      const rRes = await apiGetRoomsAdmin();
      posState.rooms = rRes.rooms;
    } catch {
      posState.rooms = [];
    }
  }

  try {
    const bRes = await apiGetBookingsAdmin({ status: 'in_use' });
    posState.activeBookings = bRes.bookings || [];
  } catch {
    posState.activeBookings = [];
  }

  setupPosEvents();
  renderPosMenu();
  renderPosRooms();
  renderPosOrder();
}

function setupPosEvents() {
  // Main tabs: Thực đơn / Phòng bàn
  document.querySelectorAll('.pos-main-tab').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.pos-main-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.posTab;
      document.querySelectorAll('.pos-view').forEach(v => v.classList.remove('active'));
      document.getElementById(`pos-view-${tab}`).classList.add('active');
    };
  });

  // Category filter
  document.querySelectorAll('.pos-cat-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.pos-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      posState.currentCat = btn.dataset.cat;
      renderPosMenu();
    };
  });

  // Search input
  const posSearch = document.getElementById('posSearchInput');
  if (posSearch) {
    posSearch.addEventListener('input', (e) => {
      posState.searchQuery = e.target.value.toLowerCase();
      renderPosMenu();
    });
  }
}

function renderPosMenu() {
  const grid = document.getElementById('posItemsGrid');
  let items = posState.menuItems;
  
  if (posState.currentCat !== 'all') {
    if (posState.currentCat === 'time') {
      items = items.filter(i => i.cat === 'time');
    } else {
      items = items.filter(i => i.tab === posState.currentCat);
    }
  }

  if (posState.searchQuery) {
    items = items.filter(i => i.name.toLowerCase().includes(posState.searchQuery));
  }

  grid.innerHTML = items.map(item => `
    <div class="pos-item-card" ${item.available ? `onclick="posAddItem('${item.id}')"` : 'style="opacity: 0.5; pointer-events: none;"'}>
      <div class="pos-item-name">${item.name}</div>
      <span class="pos-item-price">${item.price.toLocaleString()}</span>
      ${!item.available ? '<span style="position:absolute;top:5px;right:5px;background:#ef4444;color:white;font-size:0.7rem;padding:2px 4px;border-radius:4px;">Hết hàng</span>' : ''}
    </div>
  `).join('');
}

function posSetFloorFilter(f) { posState.floorFilter = f; renderPosRooms(); }
function posSetStatusFilter(s) { posState.statusFilter = s; renderPosRooms(); }

function renderPosRooms() {
  const grid = document.getElementById('posRoomsGrid');
  const floorTabs = document.getElementById('posFloorTabs');
  const statusContainer = document.getElementById('posStatusFilters');

  const floors = [...new Set(posState.rooms.map(r => r.floor))].sort((a,b)=>b-a);
  
  if (floorTabs) {
    let floorHtml = `<button class="${posState.floorFilter === 'all' ? 'active' : ''}" onclick="posSetFloorFilter('all')">Tất cả</button>`;
    floors.forEach(f => {
      floorHtml += `<button class="${posState.floorFilter == f ? 'active' : ''}" onclick="posSetFloorFilter(${f})">Tầng ${f}</button>`;
    });
    floorTabs.innerHTML = floorHtml;
  }

  let filtered = posState.rooms;
  if (posState.floorFilter !== 'all') {
    filtered = filtered.filter(r => r.floor == posState.floorFilter);
  }

  const isRoomInUse = (roomId) => posState.activeBookings.some(b => b.room_id === roomId);

  const countAll = filtered.length;
  const countUsed = filtered.filter(r => isRoomInUse(r.id)).length;
  const countFree = countAll - countUsed;

  if (statusContainer) {
    statusContainer.innerHTML = `
      <button class="pos-filter-pill ${posState.statusFilter === 'all' ? 'active' : ''}" onclick="posSetStatusFilter('all')">
        <span class="dot bg-blue"></span> Tất cả (${countAll})
      </button>
      <button class="pos-filter-pill ${posState.statusFilter === 'used' ? 'active' : ''}" onclick="posSetStatusFilter('used')">
        <span class="dot bg-red"></span> Sử dụng (${countUsed})
      </button>
      <button class="pos-filter-pill ${posState.statusFilter === 'free' ? 'active' : ''}" onclick="posSetStatusFilter('free')">
        <span class="dot bg-green"></span> Còn trống (${countFree})
      </button>
    `;
  }

  if (posState.statusFilter === 'used') {
    filtered = filtered.filter(r => isRoomInUse(r.id));
  } else if (posState.statusFilter === 'free') {
    filtered = filtered.filter(r => !isRoomInUse(r.id));
  }

  grid.innerHTML = filtered.map(room => {
    const inUse = isRoomInUse(room.id);
    return `
      <div class="pos-room-card ${posState.selectedRoom?.id === room.id ? 'active' : ''} ${inUse ? 'in-use' : ''}" 
           onclick="posSelectRoom('${room.id}')">
        <div class="pos-room-name">${room.name}</div>
        <div class="pos-room-status">${inUse ? 'Đang dùng' : 'Trống'}</div>
      </div>
    `;
  }).join('');
}

async function posSelectRoom(roomId) {
  const room = posState.rooms.find(r => r.id === roomId);
  posState.selectedRoom = room;
  posState.activeBooking = posState.activeBookings.find(b => b.room_id === roomId) || null;
  posState.cart = posState.carts[roomId] || [];
  posState.pastOrders = [];
  
  if (room) {
    document.getElementById('posOrderTitle').innerText = `Phòng ${room.name} / Tầng ${room.floor}`;
    if (posState.activeBooking) {
      try {
        const res = await apiGetBookingOrders(posState.activeBooking.id);
        posState.pastOrders = res.orders || [];
      } catch(e) {}
    } else {
      // Room is free -> show walk-in modal
      document.getElementById('wRoomId').value = room.id;
      document.getElementById('wRoomName').value = `Phòng ${room.name} (Tầng ${room.floor})`;
      document.getElementById('wCustomerName').value = '';
      document.getElementById('wCustomerPhone').value = '';
      document.getElementById('wPeople').value = '2';
      document.getElementById('wHours').value = '2';
      document.getElementById('walkinModal').classList.add('active');
    }
  } else {
    document.getElementById('posOrderTitle').innerText = 'Chưa chọn phòng';
  }
  
  renderPosRooms();
  renderPosOrder();
}

async function doCreateWalkin() {
  const roomId = document.getElementById('wRoomId').value;
  const name = document.getElementById('wCustomerName').value || 'Khách vãng lai';
  const phone = document.getElementById('wCustomerPhone').value || '0000000000';
  const people = parseInt(document.getElementById('wPeople').value);
  const hours = parseFloat(document.getElementById('wHours').value);
  
  if (!roomId || isNaN(people) || isNaN(hours)) {
    return showToast('Vui lòng nhập đầy đủ thông tin hợp lệ!', true);
  }
  
  let now = new Date();
  let startHour = now.getHours() + now.getMinutes()/60;
  
  // Handling late-night walk-ins (Midnight to 6 AM is considered part of the previous business day)
  if (startHour < 6) {
    startHour += 24;
    now.setDate(now.getDate() - 1); // Shift date back by 1 day
  }
  
  const pad = n => n.toString().padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const endHour = startHour + hours;

  try {
    const res = await apiCreateBooking({
      roomId, date: dateStr, startHour, endHour, name, phone, people, note: 'Khách đến trực tiếp', channel: 'walk-in'
    });
    // Convert status to in_use immediately
    const checkinRes = await apiUpdateBookingStatus(res.booking.id, 'in_use');
    
    showToast('✅ Đã tạo ca máy thành công!');
    document.getElementById('walkinModal').classList.remove('active');
    
    // Refresh bookings
    const bRes = await apiGetBookingsAdmin({ status: 'in_use' });
    posState.activeBookings = bRes.bookings || [];
    
    // Select this room again to load the new activeBooking
    await posSelectRoom(roomId);
    renderBookingsTab();
  } catch(e) {
    showToast(e.message, true);
  }
}

function posAddItem(itemId) {
  if (!posState.selectedRoom) {
    showToast('Vui lòng chọn phòng trước khi chọn món!', true);
    return;
  }
  
  const item = posState.menuItems.find(i => i.id === itemId);
  if (!item) return;

  const existing = posState.cart.find(c => c.item.id === itemId);
  if (existing) {
    existing.qty += 1;
  } else {
    posState.cart.push({ item, qty: 1 });
  }
  posState.carts[posState.selectedRoom.id] = posState.cart;
  renderPosOrder();
}

function posUpdateQty(itemId, delta) {
  const cartItem = posState.cart.find(c => c.item.id === itemId);
  if (!cartItem) return;
  cartItem.qty += delta;
  if (cartItem.qty <= 0) {
    posState.cart = posState.cart.filter(c => c.item.id !== itemId);
  }
  posState.carts[posState.selectedRoom.id] = posState.cart;
  renderPosOrder();
}

async function posAdjustHours(delta) {
  if (!posState.activeBooking) return;
  const b = posState.activeBooking;
  const t2f = t => parseInt(t.split(':')[0]) + parseInt(t.split(':')[1])/60;
  let end = t2f(b.end_time);
  if (b.is_overnight) end += 24;
  
  let newEnd = end + delta;
  let start = t2f(b.start_time);
  if (newEnd <= start) {
    showToast('Giờ kết thúc phải lớn hơn giờ bắt đầu!', true);
    return;
  }
  
  try {
    const res = await apiUpdateBooking(b.id, { endHour: newEnd });
    posState.activeBooking = res.booking;
    showToast('Đã cập nhật giờ!');
    renderPosOrder();
  } catch(e) {
    showToast(e.message, true);
  }
}

function renderPosOrder() {
  const list = document.getElementById('posOrderList');
  const countEl = document.getElementById('posTotalCount');
  const valEl = document.getElementById('posTotalValue');

  let html = '';
  let totalQty = 0;
  let totalValue = 0;
  let idx = 1;

  if (!posState.selectedRoom) {
    list.innerHTML = '<div class="pos-empty-cart">Vui lòng chọn một phòng để thao tác</div>';
    countEl.innerText = 0;
    valEl.innerText = 0;
    return;
  }

  if (posState.activeBooking) {
    const b = posState.activeBooking;
    html += `
      <div class="pos-time-row">
        <div class="pos-time-info">
          <div class="pos-time-title">${idx}. Giờ sử dụng</div>
          <div class="pos-time-value">
            ${b.start_time.slice(0,5)} <span class="arr">▶</span> ${b.end_time.slice(0,5)}
          </div>
        </div>
        <div class="pos-time-controls">
          <button onclick="posAdjustHours(-0.5)" title="Giảm 30p">-</button>
          <span style="font-size:0.85rem">Giờ</span>
          <button onclick="posAdjustHours(0.5)" title="Thêm 30p">+</button>
        </div>
      </div>
    `;
    idx++;

    if (posState.pastOrders && posState.pastOrders.length > 0) {
      posState.pastOrders.forEach(o => {
        if (o.order_items) {
          o.order_items.forEach(oi => {
            totalQty += oi.quantity;
            totalValue += (oi.amount * 1000);
            html += `
              <div class="pos-order-item" style="opacity: 0.85;">
                <div class="pos-order-idx">${idx}.</div>
                <div class="pos-oi-name">${oi.menu_items?.name || 'Món'} <span style="font-size:0.75rem; color:#4ade80">(Đã báo bếp)</span></div>
                <div class="pos-oi-qty" style="justify-content:center">
                  <span>${oi.quantity}</span>
                </div>
                <div class="pos-oi-price">${(oi.amount * 1000).toLocaleString()}</div>
              </div>
            `;
            idx++;
          });
        }
      });
    }
  }

  if (posState.cart.length > 0) {
    html += posState.cart.map((c) => {
      totalQty += c.qty;
      const itemTotal = c.qty * (c.item.price * 1000);
      totalValue += itemTotal;
      
      const row = `
        <div class="pos-order-item">
          <div class="pos-order-idx">${idx}.</div>
          <div class="pos-oi-name">${c.item.name} <span style="font-size:0.75rem; color:var(--accent)">(Chưa báo bếp)</span></div>
          <div class="pos-oi-qty">
            <button onclick="posUpdateQty('${c.item.id}', -1)">-</button>
            <span>${c.qty}</span>
            <button onclick="posUpdateQty('${c.item.id}', 1)">+</button>
          </div>
          <div class="pos-oi-price">${itemTotal.toLocaleString()}</div>
        </div>
      `;
      idx++;
      return row;
    }).join('');
  } else if (!posState.activeBooking || (posState.pastOrders.length === 0)) {
    if (html.indexOf('pos-order-item') === -1) {
      html += '<div class="pos-empty-cart">Phòng chưa gọi món nào</div>';
    }
  }

  list.innerHTML = html;
  countEl.innerText = totalQty;
  valEl.innerText = totalValue.toLocaleString();
}

async function posShowCheckout() {
  if (!posState.activeBooking) {
    showToast('Vui lòng chọn phòng đang sử dụng để thanh toán!', true);
    return;
  }
  if (posState.cart.length > 0) {
    showToast('Bạn đang có món chưa Báo Bếp. Vui lòng bấm Báo Bếp trước!', true);
    return;
  }
  
  // Calculate raw total for preview
  let foodTotal = 0;
  if (posState.pastOrders) {
    posState.pastOrders.forEach(o => {
      // Ignore cancelled orders exactly as backend does
      if (o.status !== 'cancelled' && o.order_items) {
         o.order_items.forEach(oi => { foodTotal += oi.amount * 1000; });
      }
    });
  }

  document.getElementById('coRoomName').value = posState.selectedRoom.name;
  document.getElementById('coFoodAmount').innerText = foodTotal.toLocaleString() + ' đ';
  document.getElementById('coDiscount').value = 0;
  document.getElementById('coSurcharge').value = 0;
  document.getElementById('coNote').value = '';
  document.getElementById('checkoutModal').classList.add('active');
}

async function posConfirmCheckout() {
  const discount = parseInt(document.getElementById('coDiscount').value) || 0;
  const extraSurcharge = parseInt(document.getElementById('coSurcharge').value) || 0;
  const note = document.getElementById('coNote').value;

  try {
    const res = await apiCreateInvoice(posState.activeBooking.id, discount, extraSurcharge, note);
    showToast('✅ Đã xuất hoá đơn thành công!');
    document.getElementById('checkoutModal').classList.remove('active');
    
    posState.cart = [];
    posState.carts[posState.selectedRoom.id] = [];
    posState.activeBooking = null;
    posState.selectedRoom = null;
    document.getElementById('posOrderTitle').innerText = 'Bán lẻ';
    
    const rRes = await apiGetRoomsAdmin();
    posState.rooms = rRes.rooms;
    const bRes = await apiGetBookingsAdmin({ status: 'in_use' });
    posState.activeBookings = bRes.bookings || [];
    renderPosRooms();
    renderPosOrder();
    renderBookingsTab();
  } catch(e) { showToast(e.message, true); }
}

async function posPushOrder() {
  if (posState.cart.length === 0) {
    showToast('Chưa có món nào để đẩy xuống bếp!', true);
    return;
  }
  if (!posState.activeBooking) {
    showToast('Phòng chưa có khách, không thể đặt món!', true);
    return;
  }
  try {
    const orderRes = await apiCreateOrder(posState.activeBooking.id, 'Order từ POS');
    const orderId = orderRes.order.id;
    for (const c of posState.cart) {
      await apiAddOrderItem(orderId, c.item.id, c.qty, c.item.price);
    }
    showToast('✅ Đã tạo đơn đồ ăn gửi xuống bếp!');
    posState.cart = [];
    posState.carts[posState.selectedRoom.id] = [];
    const res = await apiGetBookingOrders(posState.activeBooking.id);
    posState.pastOrders = res.orders || [];
    renderPosOrder();
    renderKitchenTab();
  } catch(e) { showToast(e.message, true); }
}

async function posCheckout() {
  if (!posState.activeBooking) {
    showToast('Vui lòng chọn phòng đang sử dụng để xuất hoá đơn!', true);
    return;
  }

  try {
    if (posState.cart.length > 0) {
      await posPushOrder(); // Push any unsent food items first
    }

    const res = await apiCreateInvoice(posState.activeBooking.id, 0, 0);
    showToast('✅ Đã xuất hoá đơn thành công!');
    
    posState.activeBooking = null;
    posState.selectedRoom = null;
    document.getElementById('posOrderTitle').innerText = 'Bán lẻ';
    
    const rRes = await apiGetRoomsAdmin();
    posState.rooms = rRes.rooms;
    const bRes = await apiGetBookingsAdmin({ status: 'in_use' });
    posState.activeBookings = bRes.bookings || [];
    renderPosRooms();
    renderPosOrder();
    renderBookingsTab();
    renderInvoicesTab();
  } catch(err) {
    showToast('Lỗi: ' + err.message, true);
  }
}
