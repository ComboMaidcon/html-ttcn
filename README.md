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


