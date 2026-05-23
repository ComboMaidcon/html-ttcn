/* ── In-Room QR Ordering Logic ── */
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let menuItems = [];
let cart = {}; // { itemId: quantity }

async function init() {
  if (!roomId) {
    document.getElementById('roomTitle').innerHTML = '<span style="color:#f87171">Lỗi: Không tìm thấy mã phòng</span>';
    return;
  }
  document.getElementById('roomTitle').innerText = 'Phòng: ' + roomId.toUpperCase();

  try {
    const res = await apiFetch('/api/menu');
    menuItems = res.items || [];
    renderMenu();
  } catch (err) {
    document.getElementById('menuList').innerHTML = `<div style="color:#f87171;text-align:center">${err.message}</div>`;
  }
}

function renderMenu() {
  const wrap = document.getElementById('menuList');
  if (!menuItems.length) {
    wrap.innerHTML = '<div style="text-align:center;color:var(--muted)">Thực đơn đang cập nhật...</div>';
    return;
  }

  wrap.innerHTML = menuItems.map(m => {
    const qty = cart[m.id] || 0;
    return `
      <div class="menu-item">
        <div class="m-info">
          <div class="m-name">${m.name}</div>
          <div class="m-price">${m.price.toLocaleString()}k</div>
        </div>
        <div class="m-actions">
          ${qty > 0 ? `<button class="btn-qty" onclick="updateCart('${m.id}', -1)">-</button>` : ''}
          ${qty > 0 ? `<div class="m-qty">${qty}</div>` : ''}
          <button class="btn-qty" onclick="updateCart('${m.id}', 1)" style="${qty===0 ? 'background:var(--gold);color:black' : ''}">+</button>
        </div>
      </div>
    `;
  }).join('');
}

function updateCart(id, change) {
  cart[id] = (cart[id] || 0) + change;
  if (cart[id] <= 0) delete cart[id];
  
  renderMenu();
  updateTotal();
}

function updateTotal() {
  let total = 0;
  let count = 0;
  for (const [id, qty] of Object.entries(cart)) {
    const item = menuItems.find(m => m.id === id);
    if (item) {
      total += (item.price * 1000) * qty;
      count += qty;
    }
  }
  
  document.getElementById('cartTotal').innerText = total.toLocaleString() + 'đ';
  const btn = document.getElementById('btnOrder');
  if (count > 0) {
    btn.disabled = false;
    btn.innerText = `Đặt món (${count})`;
  } else {
    btn.disabled = true;
    btn.innerText = 'Đặt món ngay';
  }
}

function openAuthModal() {
  document.getElementById('authModal').classList.add('show');
}
function closeAuthModal() {
  document.getElementById('authModal').classList.remove('show');
}

function showToast(msg, isErr=false) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.className = `toast show ${isErr?'err':''}`;
  setTimeout(() => t.className='toast', 3000);
}

async function submitOrder() {
  const items = Object.entries(cart).map(([id, qty]) => {
    return { menu_item_id: id, quantity: qty };
  });

  try {
    const res = await apiFetch('/api/orders/qr', {
      method: 'POST',
      body: {
        room_id: roomId,
        items: items
      }
    });

    closeAuthModal();
    cart = {};
    updateTotal();
    renderMenu();
    showToast('✅ Đặt món thành công! Vui lòng đợi trong giây lát.');

  } catch(err) {
    closeAuthModal();
    showToast(err.message, true);
  }
}

init();
