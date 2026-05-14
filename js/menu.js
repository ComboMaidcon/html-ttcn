/* ── Menu page logic ── */

injectShared({ ticker: false });
initPage();

/* ── Tab switch ── */
  document.getElementById('menuTabs').addEventListener('click', e => {
    const btn = e.target.closest('.menu-tab'); if (!btn) return;
    document.querySelectorAll('.menu-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.menu-section').forEach(s => s.classList.remove('active'));
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    renderMenu();
  });

  /* ── Search & sort ── */
  let searchTimer;
  document.getElementById('menuSearch').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderMenu, 180); // debounce 180ms
  });
  document.getElementById('menuSort').addEventListener('change', renderMenu);

  renderMenu();
;

/* ── Helpers ── */
function activeTab() {
  return document.querySelector('.menu-tab.active')?.dataset.tab || 'drink';
}

function getSearchQuery() {
  return document.getElementById('menuSearch').value.trim().toLowerCase();
}

function getSortOrder() {
  return document.getElementById('menuSort').value;
}

function applySort(items, order) {
  const copy = [...items];
  if (order === 'price-asc')  return copy.sort((a,b) => a.price - b.price);
  if (order === 'price-desc') return copy.sort((a,b) => b.price - a.price);
  if (order === 'name-asc')   return copy.sort((a,b) => a.name.localeCompare(b.name, 'vi'));
  return copy; // default: giữ nguyên thứ tự
}

/* ── Render helpers ── */
function renderToppingItem(item) {
  return `<div class="topping-pill${item.available===false?' unavailable':''}">
    <div class="tp-name">${item.name}</div>
    <div class="tp-price">+${item.price}K</div>
  </div>`;
}

function renderMenuItem(item, tab) {
  return `<div class="menu-item${item.available===false?' unavailable':''}">
    <div class="item-dot ${tab}"></div>
    <div class="item-info">
      <div class="item-name">${item.name}${item.available===false?'<span class="item-unavailable-tag">Tạm hết</span>':''}</div>
      ${item.desc     ? `<div class="item-desc">${item.desc}</div>`             : ''}
      ${item.variants ? `<div class="item-variants">Gồm: ${item.variants}</div>` : ''}
    </div>
    <div class="item-price">${item.price}K</div>
  </div>`;
}

function renderCatBlock(cat, items, tab) {
  if (!items.length) return '';
  const body = cat.id === 'topping'
    ? `<div class="topping-grid">${items.map(renderToppingItem).join('')}</div>`
    : `<div class="menu-items">${items.map(i => renderMenuItem(i, tab)).join('')}</div>`;
  return `<div class="cat-block rev">
    <div class="cat-header">
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-title">${cat.name}</span>
      <span class="cat-count">${items.length} món</span>
    </div>
    ${body}
  </div>`;
}

/* ── Main render ── */
function renderMenu() {
  const tab   = activeTab();
  const query = getSearchQuery();
  const sort  = getSortOrder();
  let   allItems = getMenuItems().filter(i => i.tab === tab);

  // Search filter
  if (query) {
    allItems = allItems.filter(i =>
      i.name.toLowerCase().includes(query) ||
      (i.desc && i.desc.toLowerCase().includes(query)) ||
      (i.variants && i.variants.toLowerCase().includes(query))
    );
  }

  // Sort
  allItems = applySort(allItems, sort);

  // Update result count
  document.getElementById('resultCount').textContent =
    query ? `${allItems.length} kết quả` : '';

  // Render theo category (hoặc flat list khi đang search)
  const wrap = document.getElementById(tab + '-content');
  if (query) {
    // Khi search: bỏ grouping, hiện flat list với highlight
    wrap.innerHTML = allItems.length
      ? `<div class="cat-block rev">
           <div class="cat-header">
             <span class="cat-icon">🔍</span>
             <span class="cat-title">Kết quả tìm kiếm</span>
             <span class="cat-count">${allItems.length} món</span>
           </div>
           <div class="menu-items">${allItems.map(i => renderMenuItemHighlight(i, tab, query)).join('')}</div>
         </div>`
      : `<p class="no-results">Không tìm thấy món "<strong>${query}</strong>".</p>`;
  } else {
    // Bình thường: group theo category
    wrap.innerHTML = MENU_CATS
      .filter(cat => cat.tab === tab)
      .map(cat => renderCatBlock(cat, applySort(allItems.filter(i => i.cat === cat.id), sort), tab))
      .join('') || '<p class="no-results">Chưa có món nào.</p>';
  }

  // Scroll reveal
  document.querySelectorAll('.rev:not(.on)').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('on');
  });
}

/* Highlight từ khóa search trong tên */
function renderMenuItemHighlight(item, tab, query) {
  const hl = s => s.replace(new RegExp(`(${query})`, 'gi'),
    '<mark style="background:rgba(245,197,24,.3);color:var(--gold);border-radius:2px">$1</mark>');
  return `<div class="menu-item${item.available===false?' unavailable':''}">
    <div class="item-dot ${tab}"></div>
    <div class="item-info">
      <div class="item-name">${hl(item.name)}${item.available===false?'<span class="item-unavailable-tag">Tạm hết</span>':''}</div>
      ${item.desc     ? `<div class="item-desc">${item.desc}</div>`             : ''}
      ${item.variants ? `<div class="item-variants">Gồm: ${item.variants}</div>` : ''}
    </div>
    <div class="item-price">${item.price}K</div>
  </div>`;
}
