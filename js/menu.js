/* ══════════════════════════════════════════════
   NOX Joy Station — menu.js v3
   Hỗ trợ ảnh món ăn — card nằm ngang
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  injectShared({ ticker: false });
  initPage();
  bindTabs();
  bindSearch();
  renderMenu();
});

/* ── State ─────────────────────────────────── */
let activeTab  = 'drink';
let searchTimer;

const CAT_LABELS = {
  tra:     'Trà',
  soda:    'Soda',
  khoang:  'Khoáng',
  topping: 'Topping',
  chinh:   'Món chính',
  chien:   'Đồ chiên',
  snack:   'Snack',
};
const CAT_ORDER_DRINK = ['tra','soda','khoang','topping'];
const CAT_ORDER_FOOD  = ['chinh','chien','snack'];

/* ── Placeholder SVG theo category ─────────── */
const CAT_PLACEHOLDER = {
  tra:    '#5B9BD5',
  soda:   '#00C9C9',
  khoang: '#1B3A7A',
  topping:'#C8A84B',
  chinh:  '#C0392B',
  chien:  '#C8A84B',
  snack:  '#7C3AED',
};

function placeholderSvg(category, name) {
  const color = CAT_PLACEHOLDER[category] || '#333';
  const initials = name.trim().slice(0,2).toUpperCase();
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' fill='${encodeURIComponent(color)}'/><text x='60' y='68' font-family='Arial' font-size='28' font-weight='bold' fill='white' text-anchor='middle'>${encodeURIComponent(initials)}</text></svg>`;
}

/* ── Tabs ──────────────────────────────────── */
function bindTabs() {
  document.getElementById('menuTabs')?.addEventListener('click', e => {
    const btn = e.target.closest('.menu-tab');
    if (!btn) return;
    document.querySelectorAll('.menu-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
    activeTab = btn.dataset.tab;
    renderMenu();
  });
}

/* ── Search & Sort ─────────────────────────── */
function bindSearch() {
  document.getElementById('menuSearch')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderMenu, 180);
  });
  document.getElementById('menuSort')?.addEventListener('change', renderMenu);
}

function getQuery() {
  return (document.getElementById('menuSearch')?.value || '').trim().toLowerCase();
}
function getSort() {
  return document.getElementById('menuSort')?.value || 'default';
}
function applySort(items, order) {
  const copy = [...items];
  if (order === 'price-asc')  return copy.sort((a,b) => a.price - b.price);
  if (order === 'price-desc') return copy.sort((a,b) => b.price - a.price);
  if (order === 'name-asc')   return copy.sort((a,b) => a.name.localeCompare(b.name,'vi'));
  return copy.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
}

/* ── Render ────────────────────────────────── */
async function renderMenu() {
  const query = getQuery();
  const sort  = getSort();
  const wrap  = document.getElementById(activeTab + '-content');
  if (!wrap) return;

  // Skeleton
  wrap.innerHTML = [1,2,3].map(() => `
    <div class="menu-cat-block">
      <div class="skeleton" style="height:16px;width:120px;margin-bottom:1.2rem"></div>
      <div class="menu-list">
        ${[1,2,3].map(() => `
          <div class="menu-card-h skeleton" style="height:96px"></div>`).join('')}
      </div>
    </div>`).join('');

  let items = [];
  try {
    const data = await apiGetMenu(activeTab);
    items = data.items || data || [];
  } catch {
    if (typeof getMenuItems === 'function')
      items = getMenuItems().filter(i => (i.tab || i.type) === activeTab);
  }

  // Map fields
  items = items.map(i => ({
    id:           i.id,
    name:         i.name,
    price:        i.price,
    category:     i.category || i.cat,
    variants:     i.variants || i.variant || null,
    sort_order:   i.sort_order || i.sortOrder || 0,
    is_available: i.is_available !== false && i.available !== false,
    image_url:    i.image_url || i.imageUrl || null,
  }));

  // Filter
  if (query) {
    items = items.filter(i =>
      i.name.toLowerCase().includes(query) ||
      (i.variants && i.variants.toLowerCase().includes(query))
    );
  }

  // Count
  const countEl = document.getElementById('resultCount');
  if (countEl) countEl.textContent = query ? `${items.length} kết quả` : `${items.length} món`;

  if (!items.length) {
    wrap.innerHTML = `<div class="menu-empty"><h3>Không tìm thấy</h3><p>Thử từ khóa khác.</p></div>`;
    return;
  }

  const catOrder = activeTab === 'drink' ? CAT_ORDER_DRINK : CAT_ORDER_FOOD;
  const grouped  = {};
  catOrder.forEach(c => grouped[c] = []);
  items.forEach(i => {
    const c = i.category;
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(i);
  });

  let html = '';
  catOrder.forEach(cat => {
    const catItems = applySort(grouped[cat] || [], sort);
    if (!catItems.length) return;
    const label = CAT_LABELS[cat] || cat;

    if (cat === 'topping') {
      html += `
        <div class="menu-cat-block rev">
          <div class="menu-cat-header">
            <span class="menu-cat-name">${label}</span>
            <span class="menu-cat-count">${catItems.length} món</span>
          </div>
          <div class="topping-grid">
            ${catItems.map(i => `
              <div class="topping-item${!i.is_available ? ' unavailable' : ''}">
                <span class="topping-name">${i.name}</span>
                <span class="topping-price">+${i.price}K</span>
              </div>`).join('')}
          </div>
        </div>`;
    } else {
      html += `
        <div class="menu-cat-block rev">
          <div class="menu-cat-header">
            <span class="menu-cat-name">${label}</span>
            <span class="menu-cat-count">${catItems.length} món</span>
          </div>
          <div class="menu-list">
            ${catItems.map(i => renderCardH(i, query)).join('')}
          </div>
        </div>`;
    }
  });

  wrap.innerHTML = html || `<div class="menu-empty"><p>Chưa có món nào.</p></div>`;
  requestAnimationFrame(() => wrap.querySelectorAll('.rev').forEach(el => el.classList.add('on')));
}

/* ── Card nằm ngang ────────────────────────── */
function renderCardH(item, query = '') {
  const unavail = !item.is_available;
  const imgSrc  = item.image_url || placeholderSvg(item.category, item.name);
  const nameHl  = query
    ? item.name.replace(new RegExp(`(${query})`, 'gi'),
        '<mark style="background:rgba(200,168,75,.25);color:var(--gold)">$1</mark>')
    : item.name;

  return `
    <div class="menu-card-h${unavail ? ' unavailable' : ''}">
      <div class="mch-body">
        <div class="mch-name">${nameHl}</div>
        ${item.variants ? `<div class="mch-variants">${item.variants}</div>` : ''}
        <div class="mch-price">${item.price}<span class="mch-unit">K</span></div>
      </div>
      <div class="mch-img-wrap">
        <img
          src="${imgSrc}"
          alt="${item.name}"
          class="mch-img"
          loading="lazy"
          onerror="this.src='${placeholderSvg(item.category, item.name)}'"
        >
        ${unavail ? '<div class="mch-unavail-badge">Tạm hết</div>' : ''}
      </div>
    </div>`;
}