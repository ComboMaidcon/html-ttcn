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

/* ── Auto-login if session active ── */
if (apiIsLoggedIn() && sessionStorage.getItem('nox_admin') === '1') {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminApp').style.display    = 'block';
  buildCatSelects();
  render();
}
