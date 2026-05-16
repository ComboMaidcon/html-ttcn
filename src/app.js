require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');

const app = express();

/* ── Security ── */
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:3000',
  ],
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

/* ── Rate limiting ── */
app.use('/api/bookings', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  message: { error: 'Quá nhiều yêu cầu, thử lại sau 15 phút.' },
}));
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Quá nhiều lần đăng nhập, thử lại sau.' },
}));

/* ── Body parser & logging ── */
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

/* ── Routes ── */
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/rooms',    require('./routes/rooms'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/menu',     require('./routes/menu'));
app.use('/api/reviews',  require('./routes/reviews'));

/* ── Health check ── */
app.get('/health', (req, res) =>
  res.json({ status: 'ok', env: process.env.NODE_ENV, time: new Date() }));

/* ── 404 ── */
app.use((req, res) =>
  res.status(404).json({ error: `Route ${req.method} ${req.path} không tồn tại` }));

/* ── Global error handler ── */
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Lỗi server, thử lại sau.' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`\n🎮 NOX Backend running → http://localhost:${PORT}\n`)
);
