/**
 * Orders — quản lý lượt gọi món
 *
 * POST  /api/orders/qr              — Khách tự đặt qua QR (từ repo)
 * GET   /api/orders/admin           — Admin xem orders đang open (từ repo)
 * PATCH /api/orders/admin/:id       — Admin duyệt order (từ repo)
 *
 * POST  /api/orders                 — Admin tạo lượt gọi mới (từ files.zip)
 * GET   /api/orders?bookingId=      — Admin xem orders theo booking (từ files.zip)
 * POST  /api/orders/:id/items       — Admin thêm món vào lượt (từ files.zip)
 * PATCH /api/orders/:id/items/:iid  — Admin sửa món (từ files.zip)
 * DELETE /api/orders/:id/items/:iid — Admin xoá món (từ files.zip)
 * PATCH /api/orders/:id/close       — Admin chốt lượt (từ files.zip)
 */

const router  = require('express').Router();
const { body, query: qv } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth, requireStaff } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

// ── POST /api/orders/qr — Khách tự đặt qua QR ──
router.post('/qr', async (req, res) => {
  try {
    const { room_id, items } = req.body;
    if (!room_id || !items?.length)
      return res.status(400).json({ error: 'Thiếu thông tin đặt món' });

    const { data: bookings, error: bkErr } = await supabase
      .from('bookings').select('id, status, booking_date')
      .eq('room_id', room_id).in('status', ['confirmed', 'in_use']);
    if (bkErr) throw bkErr;
    if (!bookings?.length)
      return res.status(403).json({ error: 'Phòng hiện không có khách hoặc chưa được nhận.' });

    // Ưu tiên 1: booking đang 'in_use' (đang chơi)
    let booking = bookings.find(b => b.status === 'in_use');
    // Ưu tiên 2: booking 'confirmed'
    if (!booking) {
      booking = bookings.find(b => b.status === 'confirmed');
    }
    const menuIds = items.map(i => i.menu_item_id);
    const { data: menuData } = await supabase
      .from('menu_items').select('id, price, name').in('id', menuIds);

    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{ booking_id: booking.id, status: 'open', note: 'Khách tự đặt qua QR' }])
      .select().single();
    if (orderErr) throw orderErr;

    const orderItemsToInsert = items.map(item => {
      const m = menuData.find(x => x.id === item.menu_item_id);
      return {
        order_id:     order.id,
        menu_item_id: item.menu_item_id,
        quantity:     item.quantity,
        unit_price:   m.price, // Lưu theo K — KHÔNG nhân 1000
      };
    });
    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsErr) throw itemsErr;

    res.status(201).json({ message: 'Đặt món thành công! Vui lòng đợi trong giây lát.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders/admin — Admin: xem orders đang chờ duyệt ──
router.get('/admin', requireStaff, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, bookings(room_id, rooms(name)), order_items(*, menu_items(name))')
      .eq('status', 'open')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ orders: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/orders/admin/:id — Admin duyệt order ──
router.patch('/admin/:id', requireStaff, async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders').update({ status: 'closed' }).eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Đã duyệt' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/orders?bookingId= — Admin: lấy tất cả orders của 1 booking ──
router.get('/', requireStaff,
  qv('bookingId').notEmpty().withMessage('Thiếu bookingId'),
  validate,
  async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id, quantity, unit_price, variant, note, amount,
          menu_items(id, name, tab, category, price)
        )
      `)
      .eq('booking_id', req.query.bookingId)
      .order('created_at');
    if (error) return res.status(500).json({ error: error.message });
    const foodTotal = data.reduce((sum, o) =>
      sum + o.order_items.reduce((s, i) => s + i.amount, 0), 0);
    res.json({ orders: data, food_total: foodTotal });
  }
);

// ── POST /api/orders — Admin tạo lượt gọi mới ──
router.post('/', requireStaff,
  body('bookingId').notEmpty().withMessage('Thiếu bookingId'),
  body('note').optional().isString(),
  validate,
  async (req, res) => {
    const { bookingId, note } = req.body;
    const { data: booking } = await supabase
      .from('bookings').select('id, status').eq('id', bookingId).single();
    if (!booking)
      return res.status(404).json({ error: 'Không tìm thấy booking' });
    if (['cancelled','completed'].includes(booking.status))
      return res.status(400).json({ error: 'Booking đã kết thúc, không thể gọi thêm' });

    const { data, error } = await supabase
      .from('orders')
      .insert([{ booking_id: bookingId, status: 'open', note: note?.trim() || null, created_by: req.admin.id }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ order: data });
  }
);

// ── POST /api/orders/:id/items — Admin thêm món vào lượt ──
router.post('/:id/items', requireStaff,
  body('menuItemId').notEmpty().withMessage('Thiếu menuItemId'),
  body('quantity').isInt({ min: 1 }).withMessage('Số lượng tối thiểu 1'),
  body('variant').optional().isString(),
  body('note').optional().isString(),
  validate,
  async (req, res) => {
    const { menuItemId, quantity, variant, note } = req.body;
    const { data: order } = await supabase
      .from('orders').select('id, status').eq('id', req.params.id).single();
    if (!order) return res.status(404).json({ error: 'Không tìm thấy order' });
    if (order.status === 'closed') return res.status(400).json({ error: 'Lượt gọi này đã chốt' });

    const { data: menuItem } = await supabase
      .from('menu_items').select('id, name, price, is_available').eq('id', menuItemId).single();
    if (!menuItem) return res.status(404).json({ error: 'Không tìm thấy món' });
    if (!menuItem.is_available)
      return res.status(400).json({ error: `Món "${menuItem.name}" hiện không có sẵn` });

    // Admin có thể override giá (VD: Mẹt size lớn = 100k)
    const unitPrice = req.body.unitPrice ? parseInt(req.body.unitPrice) : menuItem.price;

    const { data, error } = await supabase
      .from('order_items')
      .insert([{ order_id: req.params.id, menu_item_id: menuItemId, quantity: parseInt(quantity), unit_price: unitPrice, variant: variant?.trim() || null, note: note?.trim() || null }])
      .select('*, menu_items(id, name, tab, category)')
      .single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ item: data });
  }
);

// ── PATCH /api/orders/:id/items/:itemId — Admin sửa món ──
router.patch('/:id/items/:itemId', requireStaff,
  body('quantity').optional().isInt({ min: 1 }),
  body('note').optional().isString(),
  validate,
  async (req, res) => {
    const { data: order } = await supabase
      .from('orders').select('status').eq('id', req.params.id).single();
    if (order?.status === 'closed')
      return res.status(400).json({ error: 'Lượt gọi này đã chốt, không thể sửa' });
    const updates = {};
    if (req.body.quantity !== undefined) updates.quantity = parseInt(req.body.quantity);
    if (req.body.note     !== undefined) updates.note     = req.body.note;
    const { data, error } = await supabase
      .from('order_items').update(updates)
      .eq('id', req.params.itemId).eq('order_id', req.params.id)
      .select('*, menu_items(id, name)').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ item: data });
  }
);

// ── DELETE /api/orders/:id/items/:itemId — Admin xoá món ──
router.delete('/:id/items/:itemId', requireStaff, async (req, res) => {
  const { data: order } = await supabase
    .from('orders').select('status').eq('id', req.params.id).single();
  if (order?.status === 'closed')
    return res.status(400).json({ error: 'Lượt gọi này đã chốt, không thể xoá' });
  const { error } = await supabase.from('order_items').delete()
    .eq('id', req.params.itemId).eq('order_id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xoá món' });
});

// ── PATCH /api/orders/:id/close — Admin chốt lượt ──
router.patch('/:id/close', requireStaff, async (req, res) => {
  const { data, error } = await supabase
    .from('orders').update({ status: 'closed' }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ order: data });
});

module.exports = router;
