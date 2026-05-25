/* ══════════════════════════════════════════════
   NOX Joy Station — reviews.js v2
   Khớp với reviews.html v2 (IDs mới)
   ══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  injectShared({ ticker: false });
  initPage();
  buildStarPicker();
  loadReviews(true);
  bindFilters();
});

/* ── State ──────────────────────────────────── */
let selectedStar = 0;
let activeFilter = 'all';
let currentPage  = 1;
let totalPages   = 1;
const PER_PAGE   = 8;

const STAR_HINTS  = ['','Tệ lắm','Không ổn','Bình thường','Tốt lắm','Tuyệt vời'];
const TYPE_LABELS = { couple:'Cap doi', group:'Nhom ban', party:'Sinh nhat', solo:'Solo', work:'Dong nghiep' };

/* ── Load & render reviews ───────────────────── */
async function loadReviews(reset = false) {
  if (reset) { currentPage = 1; }

  const list = document.getElementById('reviewList');
  const btn  = document.getElementById('loadMoreBtn');

  // Skeleton on reset
  if (reset) {
    list.innerHTML = [1,2,3].map(() => `
      <div class="rv-card" style="padding:2rem">
        <div class="skeleton" style="height:12px;width:40%;margin-bottom:1rem"></div>
        <div class="skeleton" style="height:10px;width:100%;margin-bottom:.5rem"></div>
        <div class="skeleton" style="height:10px;width:75%"></div>
      </div>`).join('');
  }

  try {
    const opts = { page: currentPage, limit: PER_PAGE };
    if (activeFilter === '5' || activeFilter === '4') opts.minRating = parseInt(activeFilter);
    else if (activeFilter !== 'all') opts.visitType = activeFilter;

    const data = await apiGetReviews(opts);
    const reviews = data.reviews || [];
    const total   = data.total   || 0;
    totalPages = Math.ceil(total / PER_PAGE);

    // Stats
    renderStats(data.stats);

    // Cards
    if (reset) list.innerHTML = '';
    if (!reviews.length && reset) {
      list.innerHTML = `
        <div style="text-align:center;padding:4rem 1rem;color:var(--muted)">
          <div style="font-family:var(--font-display);font-size:2rem;margin-bottom:.5rem">Chua co danh gia</div>
          <p>Hay la nguoi dau tien viet danh gia!</p>
        </div>`;
      btn.style.display = 'none';
      return;
    }

    reviews.forEach(r => {
      const card = buildReviewCard(r);
      list.insertAdjacentHTML('beforeend', card);
    });

    // Trigger reveal animation on new cards
    list.querySelectorAll('.rv-card:not(.on)').forEach(el => {
      setTimeout(() => el.classList.add('on'), 50);
    });

    // Load more button
    btn.style.display = currentPage < totalPages ? 'inline-flex' : 'none';

  } catch (err) {
    console.error('Reviews load error:', err);
    if (reset) {
      list.innerHTML = `
        <div style="text-align:center;padding:3rem;color:var(--muted)">
          <p>Khong the tai danh gia. Vui long thu lai.</p>
        </div>`;
    }
    btn.style.display = 'none';
  }
}

/* ── Load more ───────────────────────────────── */
function loadMoreReviews() {
  currentPage++;
  loadReviews(false);
}

/* ── Stats panel ─────────────────────────────── */
function renderStats(stats) {
  const scoreEl = document.getElementById('statsScore');
  const starsEl = document.getElementById('statsStars');
  const totalEl = document.getElementById('statsTotal');

  if (!scoreEl) return;

  if (!stats || stats.total === 0) {
    scoreEl.textContent = '—';
    totalEl.textContent = 'Chưa có đánh giá';
    if (starsEl) starsEl.innerHTML = [1,2,3,4,5].map(() =>
      `<span class="sp-star-disp">&#9733;</span>`).join('');
    return;
  }

  const avg   = parseFloat(stats.avg || 0);
  const total = stats.total || 0;
  const dist  = stats.distribution || stats.dist || [];

  // Score + stars
  scoreEl.textContent = avg.toFixed(1);
  totalEl.textContent = `${total} đánh giá`;

  const rounded = Math.round(avg);
  if (starsEl) starsEl.innerHTML = [1,2,3,4,5].map(i =>
    `<span class="sp-star-disp${i <= rounded ? ' on' : ''}">&#9733;</span>`
  ).join('');

  // Rating bars — cập nhật từng bar đã có sẵn trong HTML
  [5,4,3,2,1].forEach(star => {
    const d   = dist.find(x => x.star === star) || { count: 0 };
    const pct = total ? Math.round((d.count / total) * 100) : 0;
    const bar = document.getElementById(`bar${star}`);
    const pctEl = document.getElementById(`pct${star}`);
    if (bar)   { bar.style.width = pct + '%'; }
    if (pctEl) { pctEl.textContent = pct + '%'; }
  });
}

/* ── Build review card ───────────────────────── */
function buildReviewCard(r) {
  const name     = escHtml(r.name || r.customer?.name || 'An danh');
  const initials = name.trim()[0]?.toUpperCase() || 'A';
  const content  = escHtml(r.content || '');
  const dateStr  = relativeDate(r.created_at);
  const typeTag  = r.visit_type ? `<span class="badge badge-dark">${TYPE_LABELS[r.visit_type] || r.visit_type}</span>` : '';
  const srcTag   = r.source     ? `<span class="badge badge-dark">${escHtml(r.source)}</span>` : '';

  // Màu avatar theo rating
  const avatarColors = ['','#f87171','#fb923c','var(--gold)','#4ade80','var(--cyan)'];
  const avatarColor  = avatarColors[r.rating] || 'var(--gold)';

  return `
    <div class="rv-card" style="opacity:0;transform:translateY(12px);transition:all .4s ease">
      <div class="rv-top">
        <div class="rv-meta">
          <div class="rv-name" style="display:flex;align-items:center;gap:.7rem">
            <div style="width:32px;height:32px;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-family:var(--font-condensed);font-weight:700;font-size:.85rem;color:var(--black);flex-shrink:0">${initials}</div>
            <span>${name}</span>
          </div>
          <div class="rv-date">${dateStr}</div>
        </div>
        <div class="rv-stars">${renderStars(r.rating)}</div>
      </div>
      <p class="rv-content">${content}</p>
      ${(typeTag || srcTag) ? `<div class="rv-tags" style="margin-top:.8rem;display:flex;gap:.4rem;flex-wrap:wrap">${typeTag}${srcTag}</div>` : ''}
    </div>`;
}

/* ── Submit review ───────────────────────────── */
async function submitReview() {
  const name      = document.getElementById('fName').value.trim();
  const content   = document.getElementById('fContent').value.trim();
  const roomId    = document.getElementById('fRoom').value;
  const visitType = document.getElementById('fVisit').value;
  const source    = document.getElementById('fSource').value;
  const alertEl   = document.getElementById('reviewAlert');
  const btn       = document.getElementById('submitReviewBtn');

  // Validate
  if (!name) {
    showAlert(alertEl, 'error', 'Vui long nhap ten cua ban');
    return;
  }
  if (!selectedStar) {
    showAlert(alertEl, 'error', 'Vui long chon so sao');
    return;
  }
  if (content.length < 10) {
    showAlert(alertEl, 'error', 'Noi dung danh gia toi thieu 10 ky tu');
    return;
  }

  btn.disabled    = true;
  btn.textContent = 'Dang gui...';

  try {
    await apiCreateReview({
      rating:    selectedStar,
      content,
      roomId:    roomId    || null,
      visitType: visitType || null,
      source:    source    || null,
    });

    // Reset form
    document.getElementById('fName').value    = '';
    document.getElementById('fContent').value = '';
    document.getElementById('fRoom').value    = '';
    document.getElementById('fVisit').value   = '';
    document.getElementById('fSource').value  = '';
    selectedStar = 0;
    highlightStars(0);
    document.getElementById('starHint').textContent = 'Chon so sao';

    showAlert(alertEl, 'success', 'Cam on ban! Danh gia se duoc hien thi sau khi duyet.');

    // Reload list
    setTimeout(() => {
      activeFilter = 'all';
      document.querySelectorAll('.rv-filter-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.filter === 'all'));
      loadReviews(true);
    }, 1200);

  } catch (err) {
    showAlert(alertEl, 'error', err.message || 'Gui that bai, vui long thu lai!');
  } finally {
    btn.disabled    = false;
    btn.textContent = 'Gui danh gia';
  }
}

/* ── Filters ─────────────────────────────────── */
function bindFilters() {
  const container = document.getElementById('rvFilters');
  if (!container) return;
  container.addEventListener('click', e => {
    const btn = e.target.closest('.rv-filter-btn');
    if (!btn) return;
    container.querySelectorAll('.rv-filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter || 'all';
    loadReviews(true);
  });
}

/* ── Star picker ─────────────────────────────── */
function buildStarPicker() {
  const picker = document.getElementById('starPicker');
  if (!picker) return;
  picker.querySelectorAll('.sp-star').forEach(s => {
    s.addEventListener('mouseenter', () => highlightStars(+s.dataset.v));
    s.addEventListener('mouseleave', () => highlightStars(selectedStar));
    s.addEventListener('click', () => {
      selectedStar = +s.dataset.v;
      highlightStars(selectedStar);
      const hint = document.getElementById('starHint');
      if (hint) hint.textContent = STAR_HINTS[selectedStar];
    });
  });
}

function highlightStars(n) {
  document.querySelectorAll('#starPicker .sp-star').forEach(s =>
    s.classList.toggle('on', +s.dataset.v <= n));
}

/* ── Helpers ─────────────────────────────────── */
function renderStars(n) {
  return Array.from({length:5}, (_,i) =>
    `<span class="rv-star${i < n ? ' on' : ''}">&#9733;</span>`
  ).join('');
}

function relativeDate(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2)  return 'Vua xong';
  if (m < 60) return `${m} phut truoc`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} gio truoc`;
  const d = Math.floor(h / 24);
  if (d < 7)  return `${d} ngay truoc`;
  if (d < 30) return `${Math.floor(d/7)} tuan truoc`;
  return new Date(iso).toLocaleDateString('vi-VN');
}

function escHtml(s) {
  return String(s || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showAlert(el, type, msg) {
  if (!el) return;
  el.textContent = msg;
  el.className   = `form-alert visible ${type}`;
  setTimeout(() => el.classList.remove('visible'), 5000);
}