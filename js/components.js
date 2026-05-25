/* ── Shared components (nav, ticker, footer) — v2 BMW M style ── */

const NAV_HTML = `
<nav id="mainNav">
  <a href="index.html" class="logo">
    <img src="../images/nox_icon.png" alt="NOX" class="logo-img">
    <div class="logo-text">
      <span class="logo-name">NOX JOY</span>
      <span class="logo-sub">STATION</span>
    </div>
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
    <span class="t-item">Netflix &amp; Chill</span>
    <span class="t-item">Date Ideas Hà Nội</span>
    <span class="t-item">Phòng Cine Private</span>
    <span class="t-item">Mở 9h – 2h Đêm</span>
    <span class="t-item">PS5 Phòng Riêng</span>
    <span class="t-item">Nintendo Switch</span>
    <span class="t-item">30+ Boardgame Free</span>
    <span class="t-item">Netflix &amp; Chill</span>
    <span class="t-item">Date Ideas Hà Nội</span>
    <span class="t-item">Phòng Cine Private</span>
    <span class="t-item">Mở 9h – 2h Đêm</span>
  </div>
</div>`;

const FOOTER_HTML = `
<footer>
  <div class="m-stripe foot-stripe"></div>
  <div class="foot-inner">
    <div>
      <div class="foot-logo">
        <a href="index.html" class="logo">
          <img src="../images/nox_icon.png" alt="NOX" class="logo-img logo-img-footer">
          <div class="logo-text">
            <span class="logo-name">NOX JOY</span>
            <span class="logo-sub">STATION</span>
          </div>
        </a>
      </div>
      <p class="foot-tagline">Không gian gaming private cho cặp đôi và nhóm bạn tại Hà Nội. Tầng 4, 5, 6 — mở 9h đến 2h sáng.</p>
      <div class="socials">
        <a class="social-btn" href="#">FB</a>
        <a class="social-btn" href="#">TT</a>
        <a class="social-btn" href="#">IG</a>
      </div>
    </div>
    <div class="foot-col"><h4>Dịch vụ</h4>
      <ul>
        <li><a href="rooms.html?type=cine">Phòng Cine</a></li>
        <li><a href="rooms.html?type=suite">Phòng Suite</a></li>
        <li><a href="rooms.html?type=small">Small Room</a></li>
        <li><a href="rooms.html?type=classic">Medium Classic</a></li>
        <li><a href="rooms.html?type=deluxe">Medium Deluxe</a></li>
        <li><a href="rooms.html?type=big">Big Room</a></li>
      </ul>
    </div>
    <div class="foot-col"><h4>Thông tin</h4>
      <ul>
        <li><a href="pricing.html">Bảng giá</a></li>
        <li><a href="menu.html">Menu</a></li>
        <li><a href="reviews.html">Đánh giá</a></li>
      </ul>
    </div>
    <div class="foot-col"><h4>Liên hệ</h4>
      <ul>
        <li><a href="booking.html">Đặt phòng</a></li>
        <li><a href="#">Fanpage Facebook</a></li>
        <li><a href="#">TikTok @noxjoystation</a></li>
        <li><a href="#">Zalo OA</a></li>
      </ul>
    </div>
  </div>
  <div class="foot-bottom">
    <p>© 2025 <span>NOX Joy Station</span>. Tất cả quyền được bảo lưu.</p>
    <p>Made with care tại Hà Nội</p>
  </div>
</footer>`;

function injectShared({ ticker = true } = {}) {
  document.body.insertAdjacentHTML('afterbegin', NAV_HTML);
  if (ticker) {
    const hero = document.querySelector('.page-hero, section');
    if (hero) hero.insertAdjacentHTML('afterend', TICKER_HTML);
  }
  document.body.insertAdjacentHTML('beforeend', FOOTER_HTML);
}