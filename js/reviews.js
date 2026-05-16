/* ── Reviews page logic ── */

injectShared({ ticker: false });
initPage();
buildStarPicker();

/* ── Init ── */
let currentPage  = 1;
let selectedStar = 0;
let activeFilter = '';
const PER_PAGE   = 6;
const STAR_HINTS = ['','Tệ','Không ổn','Bình thường','Tốt','Tuyệt vời! 🎉'];

// Load reviews from API / localStorage
async function loadAndRender() {
  const sortVal = document.getElementById('sortSel').value;
  const filterF = activeFilter;

  let data;
  try {
    const opts = { page: currentPage };
    if (filterF === '5' || filterF === '4') opts.minRating = parseInt(filterF);
    else if (filterF)                        opts.visitType = filterF;
    data = await apiGetReviews(opts);
  } catch (err) {
    console.error('Reviews fetch error:', err);
    data = { reviews: [], stats: { avg: 0, dist: [], total: 0 }, total: 0 };
  }

  let reviews = data.reviews || [];

  // Sort client-side (API returns newest by default)
  if (sortVal === 'highest') reviews = [...reviews].sort((a,b) => b.rating - a.rating);
  if (sortVal === 'lowest')  reviews = [...reviews].sort((a,b) => a.rating - b.rating);

  renderStats(data.stats);
  renderReviewCards(reviews, data.total);
}

/* ── Stats panel ── */
function renderStats(stats) {
  const bigEl = document.getElementById('statsBig');
  const barEl = document.getElementById('barList');

  if (!stats || stats.total === 0) {
    bigEl.innerHTML = `
      <div style="text-align:center;padding:1rem 0">
        <div style="font-size:2.5rem;margin-bottom:.5rem">⭐</div>
        <div style="font-weight:600;color:var(--white);margin-bottom:.3rem">Chưa có đánh giá nào</div>
        <div style="font-size:.85rem;color:var(--muted)">Hãy là người đầu tiên chia sẻ trải nghiệm!</div>
      </div>`;
    barEl.innerHTML = '';
    return;
  }

  bigEl.innerHTML = `
    <div class="stats-score">${stats.avg}</div>
    <div class="stats-stars">${starsHTML(Math.round(parseFloat(stats.avg)))}</div>
    <div class="stats-count">${stats.total} đánh giá</div>`;

  const dist = stats.dist || [];
  barEl.innerHTML = [...dist].reverse().map(d => `
    <div class="bar-row">
      <span class="bar-lbl">${d.star}</span>
      <span class="bar-star">★</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${stats.total ? Math.round(d.count/stats.total*100) : 0}%"></div>
      </div>
      <span class="bar-num">${d.count}</span>
    </div>`).join('');
}

/* ── Review cards ── */
function renderReviewCards(reviews, total) {
  const countLbl = document.getElementById('rvCountLbl');
  const grid     = document.getElementById('rvGrid');
  const pg       = document.getElementById('pagination');

  countLbl.textContent = total ? `${total} đánh giá` : '';

  if (!reviews.length) {
    grid.innerHTML = `<div class="rv-empty"><span class="ei">🔍</span>Chưa có đánh giá nào phù hợp.</div>`;
    pg.innerHTML   = '';
    return;
  }

  grid.innerHTML = reviews.map((r, i) => reviewCard(r, i === 0 && currentPage === 1)).join('');
  document.querySelectorAll('#rvGrid .rv-card').forEach(el => el.classList.add('on'));

  // Pagination
  const totalPages = Math.ceil(total / PER_PAGE);
  if (totalPages <= 1) { pg.innerHTML = ''; return; }
  let pgHTML = '';
  if (currentPage > 1)     pgHTML += `<button class="pg-btn" onclick="goPage(${currentPage-1})">‹</button>`;
  for (let i=1; i<=totalPages; i++)
    pgHTML += `<button class="pg-btn${i===currentPage?' active':''}" onclick="goPage(${i})">${i}</button>`;
  if (currentPage < totalPages) pgHTML += `<button class="pg-btn" onclick="goPage(${currentPage+1})">›</button>`;
  pg.innerHTML = pgHTML;
}

function reviewCard(r, isNew = false) {
  // Support both API shape (visit_type, room_name) and localStorage shape (type, room)
  const dateStr   = relativeDate(r.created_at || r.date);
  const stars     = starsHTML(r.rating);
  const typeKey   = r.visit_type || r.type || '';
  const roomName  = r.room_name  || r.room || '';
  const typeBadge = { couple:'💑 Couple', group:'👫 Nhóm bạn', party:'🎉 Party', solo:'🎮 Solo', work:'💼 Team' }[typeKey] || '';
  const srcLabel  = r.source ? `· Biết qua ${r.source}` : '';
  const initials  = r.initial || r.init || (r.name||'?')[0].toUpperCase();

  return `
  <div class="rv-card${isNew ? ' new-review' : ''}">
    <div class="rv-head">
      <div style="display:flex;gap:.8rem;align-items:flex-start">
        <div class="rv-avatar">${initials}</div>
        <div class="rv-info">
          <div class="rv-name">${escHtml(r.name)}</div>
          <div class="rv-sub">${typeBadge} ${srcLabel}</div>
        </div>
      </div>
      <div class="rv-meta">
        <div class="rv-stars">${stars}</div>
        <div class="rv-date">${dateStr}</div>
      </div>
    </div>
    ${roomName ? `<div class="rv-room">📍 ${escHtml(roomName)}</div>` : ''}
    <div class="rv-text">${escHtml(r.content || r.text || '')}</div>
  </div>`;
}

/* ── Submit ── */
async function submitReview() {
  const name      = document.getElementById('fName').value.trim();
  const content   = document.getElementById('fText').value.trim();
  const roomName  = document.getElementById('fRoom').value;
  const visitType = document.getElementById('fType').value;
  const source    = document.getElementById('fSource').value;

  if (!name)           { alert('Vui lòng nhập tên.'); return; }
  if (!selectedStar)   { alert('Vui lòng chọn số sao.'); return; }
  if (content.length < 20) { alert('Nội dung tối thiểu 20 ký tự.'); return; }

  const btn = document.getElementById('btnSubmit');
  btn.disabled = true; btn.textContent = 'Đang gửi...';

  try {
    await apiCreateReview({ name, rating: selectedStar, content, roomName, visitType, source });

    // Reset form
    document.getElementById('fName').value  = '';
    document.getElementById('fText').value  = '';
    document.getElementById('fRoom').value  = '';
    document.getElementById('fSource').value = '';
    selectedStar = 0;
    highlightStars(0);
    document.getElementById('starHint').textContent = 'Chọn số sao';

    const suc = document.getElementById('submitSuccess');
    suc.style.display = 'flex';
    setTimeout(() => suc.style.display = 'none', 4000);

    currentPage = 1;
    await loadAndRender();
  } catch (err) {
    alert(err.message || 'Gửi thất bại, thử lại!');
  } finally {
    btn.disabled = false; btn.textContent = 'Gửi đánh giá →';
  }
}

/* ── Filter / sort / pagination ── */
document.getElementById('filterBar').addEventListener('click', e => {
  const btn = e.target.closest('.filter-btn'); if (!btn) return;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = btn.dataset.f;
  currentPage  = 1;
  loadAndRender();
});

document.getElementById('sortSel').addEventListener('change', () => {
  currentPage = 1; loadAndRender();
});

function goPage(n) {
  currentPage = n;
  loadAndRender();
  document.getElementById('rvGrid').scrollIntoView({ behavior:'smooth', block:'start' });
}

/* ── Star picker ── */
function buildStarPicker() {
  document.querySelectorAll('.sp-star').forEach(s => {
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
  document.querySelectorAll('.sp-star').forEach(s =>
    s.classList.toggle('active', +s.dataset.v <= n));
}

/* ── Helpers ── */
function starsHTML(n) {
  return '★'.repeat(Math.max(0,n)) + '☆'.repeat(Math.max(0,5-n));
}
function relativeDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff/60000);
  if (m < 1)  return 'Vừa xong';
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m/60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h/24);
  if (d < 7)  return `${d} ngày trước`;
  return new Date(iso).toLocaleDateString('vi-VN');
}
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function genId() { return Math.random().toString(36).slice(2,10); }

/* ── Initial load ── */
loadAndRender();
