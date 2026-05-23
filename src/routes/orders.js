const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// POST /api/orders/qr — Client đặt món qua QR
router.post('/qr', async (req, res) => {
  try {
    const { room_id, items } = req.body;
    if (!room_id || !items || !items.length) {
      return res.status(400).json({ error: 'Thiếu thông tin đặt món' });
    }

    // 1. Kiểm tra phòng có đang chơi không
    const { data: bookings, error: bkErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('room_id', room_id)
      .eq('status', 'confirmed');
    
    if (bkErr) throw bkErr;
    if (!bookings || bookings.length === 0) {
      return res.status(403).json({ error: 'Phòng hiện không có khách hoặc chưa được nhận.' });
    }

    const booking = bookings[0];

    // 3. Lấy giá hiện tại của menu
    const menuIds = items.map(i => i.menu_item_id);
    const { data: menuData } = await supabase.from('menu_items').select('id, price, name').in('id', menuIds);
    
    // 4. Tạo Order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{ booking_id: booking.id, status: 'open', note: 'Khách tự đặt qua QR' }])
      .select().single();
    if (orderErr) throw orderErr;

    // 5. Tạo Order Items
    const orderItemsToInsert = items.map(item => {
      const m = menuData.find(x => x.id === item.menu_item_id);
      return {
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: m.price * 1000 // Chuyển sang VNĐ
      };
    });

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemsErr) throw itemsErr;

    res.status(201).json({ message: 'Thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/orders/admin — Lấy danh sách order chờ duyệt
router.get('/admin', requireAuth, async (req, res) => {
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

// PATCH /api/orders/admin/:id — Duyệt order (closed)
router.patch('/admin/:id', requireAuth, async (req, res) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'closed' })
      .eq('id', req.params.id);
    
    if (error) throw error;
    res.json({ message: 'Đã duyệt' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
