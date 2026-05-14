/* ── Reviews page logic ── */
document.addEventListener('DOMContentLoaded', () => {
  injectShared({ ticker: false });
initPage();
buildStarPicker();
  renderStats();
  renderReviews();

  // Filter buttons
  document.getElementById('filterBar').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn'); if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentPage = 1;
    renderReviews();
  });
});

/* ════════════════════════════════
   DATA — localStorage
   ════════════════════════════════ */
const RV_KEY  = 'nox_reviews_v1';
const PER_PAGE = 6;
let currentPage = 1;
let selectedStar = 0;

const STAR_HINTS = ['','Tệ','Không ổn','Bình thường','Tốt','Tuyệt vời! 🎉'];

function getReviews() {
  try { return JSON.parse(localStorage.getItem(RV_KEY)) || []; }
  catch { return []; }
}

function saveReview(rv) {
  const all = getReviews();
  all.unshift(rv); // newest first
  localStorage.setItem(RV_KEY, JSON.stringify(all));
}

/* ════════════════════════════════
   STAR PICKER
   ════════════════════════════════ */
function buildStarPicker() {
  const stars = document.querySelectorAll('.sp-star');
  stars.forEach(s => {
    s.addEventListener('mouseenter', () => highlightStars(+s.dataset.v));
    s.addEventListener('mouseleave', () => highlightStars(selectedStar));
    s.addEventListener('click', () => {
      selectedStar = +s.dataset.v;
      highlightStars(selectedStar);
      document.getElementById('starHint').textContent = STAR_HINTS[selectedStar];
    });
  });
}

function highlightStars(n) {
  document.querySelectorAll('.sp-star').forEach(s => {
    s.classList.toggle('active', +s.dataset.v <= n);
  });
}

/* ════════════════════════════════
   SUBMIT
   ════════════════════════════════ */
function submitReview() {
  const name = document.getElementById('fName').value.trim();
  const text = document.getElementById('fText').value.trim();
  const room = document.getElementById('fRoom').value;
  const type = document.getElementById('fType').value;
  const src  = document.getElementById('fSource').value;

  // Validate
  if (!name)              { shake('fName');   alert('Vui lòng nhập tên của bạn.'); return; }
  if (!selectedStar)      { shake('starPicker'); alert('Vui lòng chọn số sao.'); return; }
  if (text.length < 20)   { shake('fText');   alert('Nội dung tối thiểu 20 ký tự.'); return; }

  const rv = {
    id:       genId(),
    name,
    init:     name.trim()[0].toUpperCase(),
    rating:   selectedStar,
    room:     room || 'NOX Joy Station',
    type,
    source:   src,
    text,
    date:     new Date().toISOString(),
    verified: false,
  };

  saveReview(rv);

  // Reset form
  document.getElementById('fName').value  = '';
  document.getElementById('fText').value  = '';
  document.getElementById('fRoom').value  = '';
  document.getElementById('fSource').value = '';
  selectedStar = 0;
  highlightStars(0);
  document.getElementById('starHint').textContent = 'Chọn số sao';

  // Show success
  const suc = document.getElementById('submitSuccess');
  suc.style.display = 'flex';
  setTimeout(() => suc.style.display = 'none', 4000);

  currentPage = 1;
  renderStats();
  renderReviews(true); // true = highlight new card
}

function shake(id) {
  const el = document.getElementById(id);
  el.style.animation = 'none';
  el.offsetHeight;
  el.style.animation = 'shake .35s ease';
}

/* ════════════════════════════════
   STATS
   ════════════════════════════════ */
function renderStats() {
  const reviews = getReviews();
  const total   = reviews.length;
  const bigEl   = document.getElementById('statsBig');
  const barEl   = document.getElementById('barList');

  if (total === 0) {
    bigEl.innerHTML = `
      <div class="stats-empty">
        <div style="font-size:2.5rem;margin-bottom:.5rem">⭐</div>
        <div style="font-weight:600;color:var(--white);margin-bottom:.3rem">Chưa có đánh giá nào</div>
        <div>Hãy là người đầu tiên chia sẻ trải nghiệm!</div>
      </div>`;
    barEl.innerHTML = '';
    return;
  }

  const avg = (reviews.reduce((s,r) => s + r.rating, 0) / total).toFixed(1);
  const dist = [5,4,3,2,1].map(n => ({
    star: n,
    count: reviews.filter(r => r.rating === n).length,
  }));

  bigEl.innerHTML = `
    <div class="stats-score">${avg}</div>
    <div class="stats-stars">${starsHTML(Math.round(avg))}</div>
    <div class="stats-count">${total} đánh giá</div>`;

  barEl.innerHTML = dist.map(d => `
    <div class="bar-row">
      <span class="bar-lbl">${d.star}</span>
      <span class="bar-star">★</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${total ? Math.round(d.count/total*100) : 0}%"></div>
      </div>
      <span class="bar-num">${d.count}</span>
    </div>`).join('');
}

/* ════════════════════════════════
   RENDER REVIEWS
   ════════════════════════════════ */
function renderReviews(highlightFirst = false) {
  let reviews = getReviews();
  const activeF = document.querySelector('.filter-btn.active')?.dataset.f || '';
  const sort    = document.getElementById('sortSel').value;

  // Filter
  if (activeF === '5' || activeF === '4') {
    reviews = reviews.filter(r => r.rating === +activeF);
  } else if (activeF) {
    reviews = reviews.filter(r => r.type === activeF);
  }

  // Sort
  if (sort === 'highest') reviews = [...reviews].sort((a,b) => b.rating - a.rating);
  if (sort === 'lowest')  reviews = [...reviews].sort((a,b) => a.rating - b.rating);
  // 'newest' already sorted (newest first from localStorage)

  // Count label
  document.getElementById('rvCountLbl').textContent =
    reviews.length ? `${reviews.length} đánh giá` : '';

  // Paginate
  const totalPages = Math.ceil(reviews.length / PER_PAGE);
  const start = (currentPage - 1) * PER_PAGE;
  const page  = reviews.slice(start, start + PER_PAGE);

  const grid = document.getElementById('rvGrid');

  if (!reviews.length) {
    grid.innerHTML = `<div class="rv-empty"><span class="ei">🔍</span>Chưa có đánh giá nào phù hợp.</div>`;
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  grid.innerHTML = page.map((r, i) => reviewCard(r, highlightFirst && i === 0)).join('');
  renderPagination(totalPages);
  document.querySelectorAll('#rvGrid .rv-card').forEach(el => el.classList.add('on'));
}

function reviewCard(r, isNew = false) {
  const dateStr = relativeDate(r.date);
  const stars   = starsHTML(r.rating);
  const typeBadge = { couple:'💑 Couple', group:'👫 Nhóm bạn', party:'🎉 Party', solo:'🎮 Solo', work:'💼 Team' }[r.type] || '';
  const sourceLbl = r.source ? `· Biết qua ${r.source}` : '';

  return `
  <div class="rv-card${isNew?' new-review':''}">
    <div class="rv-head">
      <div style="display:flex;gap:.8rem;align-items:flex-start">
        <div class="rv-avatar">${r.init}</div>
        <div class="rv-info">
          <div class="rv-name">${escHtml(r.name)}</div>
          <div class="rv-sub">${typeBadge} ${sourceLbl}</div>
        </div>
      </div>
      <div class="rv-meta">
        <div class="rv-stars">${stars}</div>
        <div class="rv-date">${dateStr}</div>
      </div>
    </div>
    ${r.room ? `<div class="rv-room">📍 ${escHtml(r.room)}</div>` : ''}
    <div class="rv-text">${escHtml(r.text)}</div>
  </div>`;
}

/* ════════════════════════════════
   PAGINATION
   ════════════════════════════════ */
function renderPagination(total) {
  const pg = document.getElementById('pagination');
  if (total <= 1) { pg.innerHTML = ''; return; }
  let html = '';
  if (currentPage > 1)
    html += `<button class="pg-btn" onclick="goPage(${currentPage-1})">‹</button>`;
  for (let i=1; i<=total; i++)
    html += `<button class="pg-btn${i===currentPage?' active':''}" onclick="goPage(${i})">${i}</button>`;
  if (currentPage < total)
    html += `<button class="pg-btn" onclick="goPage(${currentPage+1})">›</button>`;
  pg.innerHTML = html;
}

function goPage(n) {
  currentPage = n;
  renderReviews();
  document.getElementById('rvGrid').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ════════════════════════════════
   HELPERS
   ════════════════════════════════ */
function starsHTML(n) {
  return '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0,5-n));
}

function relativeDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1)   return 'Vừa xong';
  if (m < 60)  return `${m} phút trước`;
  const h = Math.floor(m/60);
  if (h < 24)  return `${h} giờ trước`;
  const d = Math.floor(h/24);
  if (d < 7)   return `${d} ngày trước`;
  if (d < 30)  return `${Math.floor(d/7)} tuần trước`;
  return `${Math.floor(d/30)} tháng trước`;
}

function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function genId() { return Math.random().toString(36).slice(2,10); }
