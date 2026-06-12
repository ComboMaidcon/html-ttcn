/* ══════════════════════════════════════════════
   NOX Joy Station — Room 360° Viewer
   Dùng Pannellum (https://pannellum.org)
   Gọi: Room360.open(roomId, roomName, imgUrl)
   ══════════════════════════════════════════════ */

const Room360 = (() => {

  let viewer    = null;
  let isOpen    = false;
  let overlayEl = null;

  /* ── Tạo overlay HTML ──────────────────────── */
  function createOverlay() {
    if (document.getElementById('room360-overlay')) return;

    const el = document.createElement('div');
    el.id = 'room360-overlay';
    el.innerHTML = `
      <div id="room360-backdrop"></div>
      <div id="room360-modal">
        <div id="room360-header">
          <div id="room360-title-wrap">
            <div class="m-stripe-sm" style="margin-right:10px;flex-shrink:0"></div>
            <span id="room360-title">Xem phòng 360°</span>
          </div>
          <div id="room360-controls">
            <button class="r360-btn" id="r360-fullscreen" title="Toàn màn hình">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1 1h5v1.5H2.5V5H1V1zm9 0h5v4h-1.5V2.5H10V1zm5 9h-1.5v2.5H11V14h5v-4zM1 10h1.5v2.5H5V14H1v-4z"/>
              </svg>
            </button>
            <button class="r360-btn" id="r360-close" title="Đóng">✕</button>
          </div>
        </div>
        <div id="room360-wrap">
          <div id="panorama"></div>
          <div id="room360-hint">
            <span class="r360-hint-icon">↔</span>
            <span>Kéo để xoay • Cuộn để zoom</span>
          </div>
          <div id="room360-loading">
            <div class="r360-spinner"></div>
            <div class="r360-loading-text">Đang tải ảnh 360°...</div>
          </div>
        </div>
        <div id="room360-footer">
          <a id="room360-book-btn" href="booking.html" class="btn btn-gold" style="font-size:.75rem;padding:.6rem 1.6rem;letter-spacing:2px">
            Đặt phòng này
          </a>
        </div>
      </div>`;

    document.body.appendChild(el);
    overlayEl = el;

    // Đóng khi click backdrop
    el.querySelector('#room360-backdrop').addEventListener('click', close);
    el.querySelector('#r360-close').addEventListener('click', close);
    el.querySelector('#r360-fullscreen').addEventListener('click', toggleFullscreen);

    // ESC để đóng
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && isOpen) close();
    });

    injectStyles();
  }

  /* ── Mở viewer ─────────────────────────────── */
  function open(roomId, roomName, imgUrl) {
    createOverlay();

    document.getElementById('room360-title').textContent = `${roomName} — Xem 360°`;
    document.getElementById('room360-book-btn').href = `booking.html?room=${roomId}`;

    // Show overlay
    overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    isOpen = true;

    // Show loading
    document.getElementById('room360-loading').style.display = 'flex';
    document.getElementById('room360-hint').style.display    = 'none';

    // Destroy viewer cũ nếu có
    if (viewer) { try { viewer.destroy(); } catch(e){} viewer = null; }
    document.getElementById('panorama').innerHTML = '';

    // Init Pannellum
    viewer = pannellum.viewer('panorama', {
      type:          'equirectangular',
      panorama:      imgUrl,
      autoLoad:      true,
      autoRotate:    -1.5,           // tự xoay nhẹ
      autoRotateInactivityDelay: 3000,
      compass:       false,
      showControls:  false,          // dùng controls tự làm
      hfov:          100,            // góc nhìn ban đầu
      minHfov:       50,
      maxHfov:       120,
      pitch:         0,
      yaw:           0,
      mouseZoom:     true,
      keyboardZoom:  true,
      showFullscreenCtrl: false,
      strings: {
        loadButtonLabel:   'Tải ảnh 360°',
        loadingLabel:      'Đang tải...',
        bylineLabel:       '',
        noPanoramaError:   'Không tìm thấy ảnh',
        fileAccessError:   'Không thể tải ảnh',
        malformedURLError: 'URL không hợp lệ',
        iOS8WebGLError:    'Thiết bị không hỗ trợ',
        genericWebGLError: 'Thiết bị không hỗ trợ WebGL',
        textureSizeError:  'Ảnh quá lớn',
        unknownError:      'Lỗi không xác định',
      },
      onLoad: () => {
        document.getElementById('room360-loading').style.display = 'none';
        setTimeout(() => {
          document.getElementById('room360-hint').style.display = 'flex';
          setTimeout(() => {
            document.getElementById('room360-hint').style.opacity = '0';
          }, 3000);
        }, 500);
      },
    });
  }

  /* ── Đóng viewer ────────────────────────────── */
  function close() {
    if (!isOpen) return;
    overlayEl.classList.remove('open');
    document.body.style.overflow = '';
    isOpen = false;
    if (viewer) {
      try { viewer.destroy(); } catch(e){}
      viewer = null;
    }
    document.getElementById('panorama').innerHTML = '';
  }

  /* ── Fullscreen ─────────────────────────────── */
  function toggleFullscreen() {
    const modal = document.getElementById('room360-modal');
    if (!document.fullscreenElement) {
      modal.requestFullscreen?.() || modal.webkitRequestFullscreen?.();
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.();
    }
  }

  /* ── CSS inject ─────────────────────────────── */
  function injectStyles() {
    if (document.getElementById('room360-styles')) return;
    const style = document.createElement('style');
    style.id = 'room360-styles';
    style.textContent = `
      #room360-overlay {
        position: fixed; inset: 0; z-index: 1000;
        display: none; align-items: center; justify-content: center;
        padding: 20px;
      }
      #room360-overlay.open { display: flex; }

      #room360-backdrop {
        position: absolute; inset: 0;
        background: rgba(0,0,0,.88);
        backdrop-filter: blur(12px);
        animation: r360FadeIn .25s ease;
      }

      #room360-modal {
        position: relative; z-index: 1;
        width: 100%; max-width: 960px;
        background: #0f0f0f;
        border: 1px solid rgba(200,168,75,.2);
        border-top: 3px solid;
        border-image: linear-gradient(90deg,#5B9BD5 0 33%,#1B3A7A 33% 66%,#C0392B 66% 100%) 1;
        display: flex; flex-direction: column;
        animation: r360SlideUp .3s ease;
        max-height: 90vh;
      }

      #room360-header {
        display: flex; align-items: center; justify-content: space-between;
        padding: .9rem 1.2rem;
        border-bottom: 1px solid rgba(200,168,75,.1);
        flex-shrink: 0;
      }
      #room360-title-wrap {
        display: flex; align-items: center;
        font-family: 'Google Sans Flex', 'Barlow Condensed', sans-serif;
        font-weight: 700; font-size: .8rem;
        letter-spacing: 2.5px; text-transform: uppercase;
        color: #F2F0EB;
      }
      #room360-controls { display: flex; gap: .5rem; }
      .r360-btn {
        background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
        color: rgba(242,240,235,.6); width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; font-size: .85rem; border-radius: 0;
        transition: all .2s;
      }
      .r360-btn:hover { border-color: #C8A84B; color: #C8A84B; }

      #room360-wrap {
        position: relative; flex: 1;
        min-height: 400px; max-height: 560px;
        background: #080808;
      }
      #panorama { width: 100%; height: 100%; }

      #room360-loading {
        position: absolute; inset: 0;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        gap: 1rem; background: #080808; z-index: 5;
      }
      .r360-spinner {
        width: 40px; height: 40px;
        border: 2px solid rgba(200,168,75,.2);
        border-top-color: #C8A84B;
        border-radius: 50%;
        animation: r360Spin 1s linear infinite;
      }
      .r360-loading-text {
        font-family: 'Google Sans Flex','Barlow Condensed',sans-serif;
        font-size: .72rem; font-weight: 700;
        letter-spacing: 2px; text-transform: uppercase;
        color: rgba(200,168,75,.6);
      }

      #room360-hint {
        position: absolute; bottom: 1.2rem; left: 50%;
        transform: translateX(-50%);
        display: none; align-items: center; gap: .5rem;
        background: rgba(0,0,0,.7);
        border: 1px solid rgba(200,168,75,.2);
        padding: .4rem 1rem;
        font-family: 'Google Sans Flex','Barlow Condensed',sans-serif;
        font-size: .68rem; font-weight: 700;
        letter-spacing: 1.5px; text-transform: uppercase;
        color: rgba(200,168,75,.8);
        pointer-events: none;
        transition: opacity .6s ease;
        z-index: 4;
      }
      .r360-hint-icon { font-size: 1rem; }

      #room360-footer {
        padding: .9rem 1.2rem;
        border-top: 1px solid rgba(200,168,75,.1);
        display: flex; justify-content: flex-end;
        flex-shrink: 0;
      }

      @keyframes r360FadeIn  { from{opacity:0} to{opacity:1} }
      @keyframes r360SlideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      @keyframes r360Spin    { to{transform:rotate(360deg)} }

      @media(max-width:640px) {
        #room360-overlay { padding: 0; }
        #room360-modal { max-width:100%; max-height:100vh; border-radius:0; }
        #room360-wrap { min-height: 280px; max-height: 60vh; }
      }
    `;
    document.head.appendChild(style);
  }

  return { open, close };
})();