/* ══════════════════════════════════════
   NOX Frontend — API Layer (Database only)
   Không dùng localStorage — mọi data đều từ backend
   ══════════════════════════════════════ */

async function apiFetch(path, options = {}) {
  const url   = `${API_URL}${path}`;
  const token = sessionStorage.getItem('nox_admin_token');

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ════════════════════════════════
   BOOKINGS
   ════════════════════════════════ */
async function apiGetBookings(date, roomId = null) {
  const qs = new URLSearchParams({ date });
  if (roomId) qs.set('roomId', roomId);
  const res = await apiFetch(`/api/bookings?${qs}`);
  return res.bookings;
}

async function apiIsRoomFree(roomId, date, start, end) {
  const bookings = await apiGetBookings(date, roomId);
  return !bookings.some(b =>
    b.status !== 'cancelled' &&
    parseFloat(b.start_hour) < end &&
    parseFloat(b.end_hour)   > start
  );
}

async function apiCreateBooking({ roomId, date, startHour, endHour, name, phone, people, note }) {
  return apiFetch('/api/bookings', {
    method: 'POST',
    body: { roomId, date, startHour, endHour, name, phone, people, note },
  });
}

async function apiGetBookingsAdmin({ date, status, page = 1 } = {}) {
  const qs = new URLSearchParams({ page });
  if (date)   qs.set('date',   date);
  if (status) qs.set('status', status);
  return apiFetch(`/api/bookings/admin?${qs}`);
}

async function apiUpdateBookingStatus(id, status) {
  return apiFetch(`/api/bookings/${id}`, { method: 'PATCH', body: { status } });
}

/* ════════════════════════════════
   MENU
   ════════════════════════════════ */
async function apiGetMenu(tab = null) {
  const qs  = tab ? `?tab=${tab}` : '';
  const res = await apiFetch(`/api/menu${qs}`);
  return res.items.map(i => ({
    id:        i.id,
    tab:       i.tab,
    cat:       i.category,
    name:      i.name,
    price:     i.price,
    desc:      i.description,
    variants:  i.variants,
    available: i.is_available,
  }));
}

async function apiAddMenuItem(item) {
  return apiFetch('/api/menu', {
    method: 'POST',
    body: {
      tab:         item.tab,
      category:    item.cat,
      name:        item.name,
      price:       item.price,
      description: item.desc,
      variants:    item.variants,
    },
  });
}

async function apiUpdateMenuItem(id, changes) {
  return apiFetch(`/api/menu/${id}`, {
    method: 'PATCH',
    body: {
      name:         changes.name,
      price:        changes.price,
      description:  changes.desc,
      variants:     changes.variants,
      is_available: changes.available,
      category:     changes.cat,
    },
  });
}

async function apiDeleteMenuItem(id) {
  return apiFetch(`/api/menu/${id}`, { method: 'DELETE' });
}

/* ════════════════════════════════
   REVIEWS
   ════════════════════════════════ */
async function apiGetReviews({ page = 1, visitType, minRating } = {}) {
  const qs = new URLSearchParams({ page });
  if (visitType)  qs.set('visitType',  visitType);
  if (minRating)  qs.set('minRating',  minRating);
  return apiFetch(`/api/reviews?${qs}`);
}

async function apiCreateReview({ name, rating, content, roomName, visitType, source }) {
  return apiFetch('/api/reviews', {
    method: 'POST',
    body: { name, rating, content, roomName, visitType, source },
  });
}

async function apiApproveReview(id, isApproved) {
  return apiFetch(`/api/reviews/${id}`, { method: 'PATCH', body: { isApproved } });
}

async function apiDeleteReview(id) {
  return apiFetch(`/api/reviews/${id}`, { method: 'DELETE' });
}

/* ════════════════════════════════
   AUTH
   ════════════════════════════════ */
async function apiLogin(email, password) {
  const res = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  sessionStorage.setItem('nox_admin_token', res.token);
  return res;
}

function apiLogout() {
  sessionStorage.removeItem('nox_admin_token');
}

function apiIsLoggedIn() {
  return !!sessionStorage.getItem('nox_admin_token');
}