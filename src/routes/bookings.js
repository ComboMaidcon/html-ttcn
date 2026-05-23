const router   = require('express').Router();
const { body, query: qv } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const supabase        = require('../lib/supabase');

const timeToFloat = (t) => { const [h,m] = t.split(':'); return parseInt(h) + parseInt(m)/60; };
const floatToTime = (h) => {
  const hr = Math.floor(h) % 24;
  const min = Math.round((h - Math.floor(h)) * 60);
  return `${hr.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:00`;
};

// ── GET /api/bookings?date=&roomId= — public (chỉ trả giờ, không trả tên/SĐT)
router.get('/', async (req, res) => {
  const { date, roomId, roomIds } = req.query;
  if (!date) return res.status(400).json({ error: 'Thiếu tham số date' });

  let query = supabase
    .from('bookings')
    .select('room_id, booking_date, start_time, end_time, is_overnight, status')
    .eq('booking_date', date)
    .not('status', 'eq', 'cancelled');

  if (roomId)  query = query.eq('room_id', roomId);
  if (roomIds) query = query.in('room_id', roomIds.split(','));

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  
  const mapped = data.map(b => ({
    ...b,
    date: b.booking_date,
    start_hour: timeToFloat(b.start_time),
    end_hour: timeToFloat(b.end_time) + (b.is_overnight ? 24 : 0),
  }));
  res.json({ bookings: mapped });
});

// ── GET /api/bookings/admin — admin: full data ──
router.get('/admin', requireAuth, async (req, res) => {
  const { date, status, page = 1, limit = 20 } = req.query;
  const from = (parseInt(page) - 1) * parseInt(limit);
  const to   = from + parseInt(limit) - 1;

  let query = supabase
    .from('bookings')
    .select('*, customers(name, phone), rooms(name, floor, type)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (date)   query = query.eq('booking_date', date);
  if (status) query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ bookings: data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── POST /api/bookings — public ──
router.post('/',
  body('roomId').notEmpty().withMessage('Thiếu roomId'),
  body('date').isISO8601().withMessage('Ngày không hợp lệ'),
  body('startHour').isFloat({ min: 9, max: 25.5 }).withMessage('Giờ bắt đầu không hợp lệ'),
  body('endHour').isFloat({ min: 9.5, max: 26 }).withMessage('Giờ kết thúc không hợp lệ'),
  body('name').trim().notEmpty().withMessage('Thiếu tên'),
  body('phone').matches(/^\d{10}$/).withMessage('Số điện thoại phải đúng 10 chữ số'),
  body('people').isInt({ min: 1, max: 10 }).withMessage('Số người từ 1–10'),
  validate,
  async (req, res) => {
    const { roomId, date, startHour, endHour, name, phone, people, note } = req.body;

    if (endHour <= startHour)
      return res.status(400).json({ error: 'Giờ kết thúc phải sau giờ bắt đầu' });

    // Check phòng tồn tại
    const { data: room } = await supabase.from('rooms').select('id, type, name').eq('id', roomId).single();
    if (!room) return res.status(404).json({ error: 'Phòng không tồn tại' });

    // Check số người không vượt quá sức chứa phòng
    const maxPeople = {
      'small':          2,
      'medium-classic': 4,
      'medium-deluxe':  4,
      'cine':           2,
      'suite':          4,
    }[room.type] || 10;

    if (people > maxPeople) {
      return res.status(400).json({
      error: `Phòng ${room.type} chỉ chứa tối đa ${maxPeople} người`
      });
    }

    // Check trùng lịch
    const { data: conflicts } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, is_overnight')
      .eq('room_id', roomId)
      .eq('booking_date', date)
      .not('status', 'eq', 'cancelled');

    const hasConflict = conflicts?.some(b => {
      const bStart = timeToFloat(b.start_time);
      const bEnd = timeToFloat(b.end_time) + (b.is_overnight ? 24 : 0);
      return bStart < endHour && bEnd > startHour;
    });

    if (hasConflict)
      return res.status(409).json({ error: 'Phòng đã có người đặt trong khung giờ này' });

    let customerId;
    const { data: existingCustomer } = await supabase.from('customers').select('id').eq('phone', phone).single();
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase.from('customers').insert([{ name: name.trim(), phone: phone.trim(), source: 'website' }]).select().single();
      if (custErr) return res.status(500).json({ error: custErr.message });
      customerId = newCustomer.id;
    }

    const { data, error } = await supabase.from('bookings').insert([{
      room_id:      roomId,
      booking_date: date,
      start_time:   floatToTime(startHour),
      end_time:     floatToTime(endHour),
      is_overnight: endHour >= 24,
      customer_id:  customerId,
      people:       parseInt(people),
      note:         note?.trim() || null,
      status:       'pending',
      channel:      'website',
    }]).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ booking: data, message: 'Đặt phòng thành công! Chúng tôi sẽ xác nhận trong 15 phút.' });
  }
);

// ── PATCH /api/bookings/:id — admin: đổi status ──
router.patch('/:id', requireAuth,
  body('status').isIn(['pending','confirmed','cancelled','completed']).withMessage('Status không hợp lệ'),
  validate,
  async (req, res) => {
    const { status } = req.body;
    const { data, error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', req.params.id)
      .select('*, rooms(name, type)').single();
    if (error) return res.status(500).json({ error: error.message });

    // Tự động sinh Hoá đơn (Invoice) nếu hoàn thành
    if (status === 'completed') {
      // Check if invoice already exists
      const { data: existingInv } = await supabase.from('invoices').select('id').eq('booking_id', data.id).single();
      if (!existingInv) {
        // Tính tạm số giờ:
        const t2f = t => parseInt(t.split(':')[0]) + parseInt(t.split(':')[1])/60;
        let hours = t2f(data.end_time) - t2f(data.start_time);
        if (data.is_overnight || hours <= 0) hours += 24;
        
        let food_amount = 0;
        let foodItems = [];

        // Lấy tất cả orders đã 'closed' của booking này
        const { data: orders } = await supabase.from('orders').select('id, order_items(description:menu_item_id, quantity, unit_price, menu_items(name))').eq('booking_id', data.id).eq('status', 'closed');
        
        if (orders) {
          orders.forEach(o => {
            if (o.order_items) {
              o.order_items.forEach(oi => {
                food_amount += oi.unit_price * oi.quantity;
                foodItems.push({
                  item_type: 'food',
                  description: oi.menu_items?.name || 'Thức ăn',
                  quantity: oi.quantity,
                  unit_price: oi.unit_price
                });
              });
            }
          });
        }

        const room_amount = Math.round(hours * 80000); // Tạm tính 80k/h
        const total_amount = room_amount + food_amount;
        
        const { data: inv, error: invErr } = await supabase.from('invoices').insert([{
          booking_id: data.id,
          room_amount: room_amount,
          food_amount: food_amount,
          payment_status: 'paid',
          payment_method: 'cash'
        }]).select().single();

        if (inv && !invErr) {
          // Add invoice item for room
          let invItemsToInsert = [{
            invoice_id: inv.id,
            item_type: 'room',
            description: `${data.rooms?.name || data.room_id} (${data.start_time.slice(0,5)} - ${data.end_time.slice(0,5)})`,
            quantity: hours,
            unit_price: 80000
          }];
          
          // Add invoice items for food
          foodItems.forEach(fi => {
            fi.invoice_id = inv.id;
            invItemsToInsert.push(fi);
          });

          await supabase.from('invoice_items').insert(invItemsToInsert);
        }
      }
    }

    res.json({ booking: data });
  }
);

// ── DELETE /api/bookings/:id — admin only ──
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase.from('bookings').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Đã xóa' });
});

module.exports = router;
