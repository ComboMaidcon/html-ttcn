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
  try { items = await apiGetMenu(); } catch { items = getMenuItems(); }

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
  try { items = await apiGetMenu(); } catch { items = getMenuItems(); }

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
  try { items = await apiGetMenu(); } catch { items = getMenuItems(); }
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
  try { items = await apiGetMenu(); } catch { items = getMenuItems(); }
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
  try { items = await apiGetMenu(); } catch { items = getMenuItems(); }
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
          ${b.status==='confirmed' ? `<button class="btn-edit" style="color:#4ade80;border-color:#4ade80" onclick="updateBooking('${b.id}', 'completed')">Hoàn thành</button>` : ''}
          ${b.status!=='cancelled' && b.status!=='completed' ? `<button class="btn-del" onclick="updateBooking('${b.id}', 'cancelled')">Hủy</button>` : ''}
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
