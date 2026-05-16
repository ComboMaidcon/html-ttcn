/* ═══════════════════════════════════════
   NOX Joy Station — Shared Components
   ═══════════════════════════════════════ */

const NAV_HTML = `
<nav id="mainNav">
  <a href="index.html" class="logo">
    <div class="logo-icon">🎮</div>
    <div class="logo-name">NOX <span>Joy Station</span></div>
  </a>
  <ul class="nav-links">
    <li><a href="index.html">Trang chủ</a></li>
    <li><a href="rooms.html">Phòng chơi</a></li>
    <li><a href="menu.html">Menu</a></li>
    <li><a href="pricing.html">Giá</a></li>
    <li><a href="reviews.html">Review</a></li>
    <li><a href="booking.html" class="nav-cta">Đặt phòng</a></li>
  </ul>
</nav>`;

const TICKER_HTML = `
<div class="ticker-bar">
  <div class="ticker-inner">
    <span class="t-item">PS5 Phòng Riêng</span>
    <span class="t-item">Nintendo Switch</span>
    <span class="t-item">30+ Boardgame Free</span>
    <span class="t-item">Netflix & Chill</span>
    <span class="t-item">Date Ideas Hà Nội</span>
    <span class="t-item">Phòng Cine Private</span>
    <span class="t-item">Mở 9h – 2h Đêm</span>
    <span class="t-item">PS5 Phòng Riêng</span>
    <span class="t-item">Nintendo Switch</span>
    <span class="t-item">30+ Boardgame Free</span>
    <span class="t-item">Netflix & Chill</span>
    <span class="t-item">Date Ideas Hà Nội</span>
    <span class="t-item">Phòng Cine Private</span>
    <span class="t-item">Mở 9h – 2h Đêm</span>
  </div>
</div>`;

const FOOTER_HTML = `
<footer>
  <div class="foot-inner">
    <div>
      <div class="foot-logo">
        <a href="index.html" class="logo">
          <div class="logo-icon">🎮</div>
          <div class="logo-name">NOX <span>Joy Station</span></div>
        </a>
      </div>
      <p class="foot-tagline">Không gian gaming private dành cho cặp đôi và nhóm bạn tại Hà Nội — chill, vui và riêng tư tuyệt đối.</p>
      <div class="socials">
        <a class="social-btn" href="#">📘</a>
        <a class="social-btn" href="#">🎵</a>
        <a class="social-btn" href="#">📸</a>
      </div>
    </div>
    <div class="foot-col">
      <h4>Dịch vụ</h4>
      <ul>
        <li><a href="rooms.html">Phòng Cine</a></li>
        <li><a href="rooms.html">Phòng Suite</a></li>
        <li><a href="rooms.html">Small Room</a></li>
        <li><a href="rooms.html">Classic Room</a></li>
        <li><a href="rooms.html">Deluxe Room</a></li>
        <li><a href="rooms.html">Big Room</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h4>Thông tin</h4>
      <ul>
        <li><a href="index.html">Về NOX</a></li>
        <li><a href="pricing.html">Bảng giá</a></li>
        <li><a href="menu.html">Menu</a></li>
        <li><a href="reviews.html">Đánh giá</a></li>
      </ul>
    </div>
    <div class="foot-col">
      <h4>Liên hệ</h4>
      <ul>
        <li><a href="booking.html">Đặt phòng</a></li>
        <li><a href="#">Fanpage Facebook</a></li>
        <li><a href="#">TikTok @noxjoystation</a></li>
        <li><a href="#">Chính sách hoàn tiền</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom">
    <p>© 2025 <span>NOX Joy Station</span>. Tất cả quyền được bảo lưu.</p>
    <p>Made with ❤️ tại Hà Nội</p>
  </div>
</footer>`;

function injectShared({ ticker = true } = {}) {
  // Prepend nav (no custom cursor elements)
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  // Ticker
  if (ticker) {
    const firstSection = document.querySelector('.page-hero, section');
    if (firstSection) firstSection.insertAdjacentHTML('afterend', TICKER_HTML);
  }
  // Append footer
  document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
}
