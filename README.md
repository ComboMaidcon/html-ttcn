# 🎮 NOX Joy Station — Backend

REST API cho website NOX Joy Station. Stack: **Node.js + Express + Supabase (PostgreSQL)**.

---

## Cấu trúc

```
nox-backend/
├── src/
│   ├── app.js              ← Entry point, express config
│   ├── routes/
│   │   ├── auth.js         ← POST /api/auth/login
│   │   ├── rooms.js        ← GET /api/rooms
│   │   ├── bookings.js     ← GET/POST/PATCH /api/bookings
│   │   ├── menu.js         ← GET/POST/PATCH/DELETE /api/menu
│   │   └── reviews.js      ← GET/POST/PATCH/DELETE /api/reviews
│   ├── middleware/
│   │   ├── auth.js         ← JWT verify middleware
│   │   └── validate.js     ← express-validator error handler
│   └── lib/
│       └── supabase.js     ← Supabase client
├── database/
│   ├── schema.sql          ← Chạy 1 lần trong Supabase SQL Editor
│   └── seed.js             ← Seed rooms + menu + admin user
├── .env.example
└── package.json
```

---

## Hướng dẫn cài đặt

### Bước 1 — Tạo Supabase project

1. Vào [supabase.com](https://supabase.com) → New project
2. Đặt tên: `nox-joy-station`, chọn region **Southeast Asia (Singapore)**
3. Sau khi tạo xong, vào **Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` key (secret) → `SUPABASE_SERVICE_KEY`

### Bước 2 — Tạo database

1. Vào **SQL Editor** trong Supabase dashboard
2. Paste toàn bộ nội dung file `database/schema.sql` vào
3. Bấm **Run** — tạo xong tất cả tables, triggers, indexes, RLS policies

### Bước 3 — Cài đặt local

```bash
# Clone / copy thư mục nox-backend về máy
cd nox-backend

# Cài packages
npm install

# Tạo file .env từ template
cp .env.example .env

# Điền thông tin vào .env
# (SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET, ...)
```

### Bước 4 — Seed dữ liệu

```bash
# Tạo 15 phòng + menu items + admin user
npm run seed
```

### Bước 5 — Chạy dev server

```bash
npm run dev
# → http://localhost:3000
```

Kiểm tra hoạt động:
```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/rooms
curl http://localhost:3000/api/menu
```

---

## API Reference

### Auth

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| POST | `/api/auth/login` | ✗ | Đăng nhập admin, trả JWT |
| GET  | `/api/auth/me`    | ✅ | Xem thông tin admin hiện tại |

**Login example:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@noxjoystation.com","password":"nox2025"}'
```

---

### Rooms

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET   | `/api/rooms`     | ✗  | Danh sách phòng. Query: `?floor=6&type=small` |
| GET   | `/api/rooms/:id` | ✗  | Chi tiết 1 phòng |
| PATCH | `/api/rooms/:id` | ✅ | Sửa tên, giá, mô tả, kích hoạt/tắt |

---

### Bookings

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET    | `/api/bookings`        | ✗  | Lịch đặt theo ngày. Query: `?date=2025-05-14&roomId=t6-room1` |
| GET    | `/api/bookings/admin`  | ✅ | Full data + phân trang. Query: `?status=pending&page=1` |
| POST   | `/api/bookings`        | ✗  | Tạo đặt phòng mới |
| PATCH  | `/api/bookings/:id`    | ✅ | Đổi status: `pending→confirmed→completed` hoặc `cancelled` |
| DELETE | `/api/bookings/:id`    | ✅ | Xóa booking |

**POST body:**
```json
{
  "roomId":    "t6-room2",
  "date":      "2025-05-20",
  "startHour": 14,
  "endHour":   17,
  "name":      "Nguyễn Văn A",
  "phone":     "0912345678",
  "people":    3,
  "note":      "Sinh nhật, cần cắm điện loa ngoài"
}
```

---

### Menu

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET    | `/api/menu`     | ✗  | Tất cả món. Query: `?tab=drink&category=tra` |
| POST   | `/api/menu`     | ✅ | Thêm món mới |
| PATCH  | `/api/menu/:id` | ✅ | Sửa tên, giá, ẩn/hiện món |
| DELETE | `/api/menu/:id` | ✅ | Xóa món |

---

### Reviews

| Method | Endpoint | Auth | Mô tả |
|--------|----------|------|-------|
| GET    | `/api/reviews`     | ✗  | Reviews đã duyệt + stats. Query: `?page=1&visitType=couple` |
| POST   | `/api/reviews`     | ✗  | Gửi đánh giá mới |
| PATCH  | `/api/reviews/:id` | ✅ | Duyệt hoặc ẩn review |
| DELETE | `/api/reviews/:id` | ✅ | Xóa review |

---

## Deploy lên Railway

1. Push code lên **GitHub** (tạo repo private)
2. Vào [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Chọn repo `nox-backend`
4. Vào **Variables** tab, thêm toàn bộ biến trong `.env`
5. Railway tự build và deploy — copy URL dạng `https://nox-backend.up.railway.app`
6. Cập nhật `FRONTEND_URL` trong biến Railway = URL Vercel của frontend

**Sau khi deploy**, cập nhật frontend để gọi API thật thay vì localStorage:
- Đổi `SUPABASE_URL` → URL Railway trong các file JS frontend

---

## Bảo mật

- JWT token hết hạn sau **8 giờ**
- Rate limit: 20 booking requests / 15 phút, 10 login / 15 phút
- Helmet.js bảo vệ các HTTP headers
- Input validation với express-validator trên mọi POST/PATCH
- RLS (Row Level Security) ở Supabase: public chỉ read, write qua service key
- Booking conflict check ở cả **database level** (trigger) và **API level**
- Phone validation: đúng format số VN (10 số, bắt đầu 0)

---

## Kết nối frontend → backend

Sau khi có API URL, sửa các file frontend:

**`js/bookings.js`** — thay localStorage bằng API call:
```js
// Thay vì: const bookings = JSON.parse(localStorage.getItem(...))
const res  = await fetch(`${API_URL}/api/bookings?date=${date}&roomId=${roomId}`);
const data = await res.json();
```

**`js/reviews.js`** — gọi API khi submit:
```js
const res = await fetch(`${API_URL}/api/reviews`, {
  method:  'POST',
  headers: { 'Content-Type': 'application/json' },
  body:    JSON.stringify({ name, rating, content, roomName, visitType, source }),
});
```

Thêm file `js/config.js` vào frontend:
```js
const API_URL = 'https://nox-backend.up.railway.app'; // URL Railway sau khi deploy
```
