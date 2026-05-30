/**
 * Invoices — quản lý hoá đơn
 *
 * POST  /api/invoices       — Tạo hoá đơn từ booking, tính giá từ pricing table (từ files.zip)
 * GET   /api/invoices/admin — Danh sách hoá đơn có sort (từ repo)
 * GET   /api/invoices/:id   — Chi tiết hoá đơn (từ files.zip)
 * PATCH /api/invoices/:id   — Cập nhật thanh toán / chiết khấu (từ files.zip)
 */

const router  = require('express').Router();
const { body } = require('express-validator');
const { validate }    = require('../middleware/validate');
const { requireStaff } = require('../middleware/auth');
const supabase         = require('../lib/supabase');

// ── Helper: tính tiền phòng từ pricing table ──
async function calcRoomAmount(booking, room) {
  const date      = new Date(booking.booking_date);
  const dayOfWeek = date.getDay();
  const dayType   = (dayOfWeek === 0 || dayOfWeek === 6) ? 'weekend' : 'weekday';

  const { data: prices } = await supabase
    .from('pricing')
    .select('time_slot, price_per_hour, base_people')
    .eq('room_type', room.type)
    .eq('day_type', dayType);

  if (!prices?.length) {
    // Fallback: tính đơn giản nếu không có pricing data
    const t2f   = t => parseInt(t.split(':')[0]) + parseInt(t.split(':')[1])/60;
    let hours   = t2f(booking.end_time) - t2f(booking.start_time);
    if (booking.is_overnight || hours <= 0) hours += 24;
    return { total: Math.round(hours * 80), breakdown: [{ slot: 'default', hours, rate: 80, amount: Math.round(hours * 80) }], dayType };
  }

  const priceMap  = Object.fromEntries(prices.map(p => [p.time_slot, p]));
  const toMinutes = (t) => { const [h,m] = t.split(':').map(Number); return h * 60 + m; };

  let startMin = toMinutes(booking.start_time);
  let endMin   = toMinutes(booking.end_time);
  if (booking.is_overnight) endMin += 24 * 60;

  const MORNING_START = 9  * 60;
  const MORNING_END   = 17 * 60;
  const EVENING_END   = 26 * 60;

  const breakdown = [];

  const morningStart = Math.max(startMin, MORNING_START);
  const morningEnd   = Math.min(endMin,   MORNING_END);
  if (morningEnd > morningStart && priceMap.morning) {
    const hours = (morningEnd - morningStart) / 60;
    const rate  = priceMap.morning.price_per_hour;
    breakdown.push({ slot: 'morning', hours, rate, amount: Math.round(hours * rate) });
  }

  const eveningStart = Math.max(startMin, MORNING_END);
  const eveningEnd   = Math.min(endMin,   EVENING_END);
  if (eveningEnd > eveningStart && priceMap.evening) {
    const hours = (eveningEnd - eveningStart) / 60;
    const rate  = priceMap.evening.price_per_hour;
    breakdown.push({ slot: 'evening', hours, rate, amount: Math.round(hours * rate) });
  }

  return { total: breakdown.reduce((s, b) => s + b.amount, 0), breakdown, dayType };
}

// ── Helper: tính phụ thu người ──
function calcSurcharge(room, people) {
  if (!room.surcharge_per_person || !room.surcharge_from_person) return 0;
  if (people < room.surcharge_from_person) return 0;
  return (people - (room.surcharge_from_person - 1)) * room.surcharge_per_person;
}

// ── GET /api/invoices/admin — Admin: danh sách hoá đơn ──
router.get('/admin', requireStaff, async (req, res) => {
  try {
    const { sortBy = 'newest' } = req.query;
    let query = supabase
      .from('invoices')
      .select('*, bookings(*, customers(*), rooms(*)), invoice_items(*)');
    const sortMap = {
      newest:  { col: 'created_at',   asc: false },
      oldest:  { col: 'created_at',   asc: true  },
      highest: { col: 'total_amount', asc: false },
      lowest:  { col: 'total_amount', asc: true  },
    };
    const s = sortMap[sortBy] || sortMap.newest;
    query = query.order(s.col, { ascending: s.asc });
    const { data, error } = await query;
    if (error) throw error;
    res.json({ invoices: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/invoices — Tạo hoá đơn ──
router.post('/',
  body('bookingId').notEmpty().withMessage('Thiếu bookingId'),
  body('discount').optional().isInt({ min: 0 }),
  body('extraSurcharge').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
  validate,
  async (req, res) => {
    const { bookingId, discount = 0, extraSurcharge = 0, note } = req.body;

    const { data: existing } = await supabase
      .from('invoices').select('id').eq('booking_id', bookingId).single();
    if (existing)
      return res.status(409).json({ error: 'Booking này đã có hoá đơn', invoiceId: existing.id });

    const { data: booking, error: bErr } = await supabase
      .from('bookings')
      .select('*, rooms(*), customers(name, phone)')
      .eq('id', bookingId).single();
    if (bErr || !booking)
      return res.status(404).json({ error: 'Không tìm thấy booking' });
    if (booking.status === 'cancelled')
      return res.status(400).json({ error: 'Booking đã huỷ, không thể xuất hoá đơn' });

    // Lấy orders + items (Bỏ qua các order đã bị Hủy/Từ chối)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, status, order_items(id, quantity, unit_price, variant, note, amount, menu_item_id, menu_items(name))')
      .eq('booking_id', bookingId)
      .not('status', 'eq', 'cancelled');

    const { total: roomAmount, breakdown, dayType } = await calcRoomAmount(booking, booking.rooms);
    const allItems   = orders?.flatMap(o => o.order_items) || [];
    const foodAmount = allItems.reduce((s, i) => s + i.amount, 0);
    const surcharge  = calcSurcharge(booking.rooms, booking.people) + parseInt(extraSurcharge);

    const totalBeforeDiscount = roomAmount + foodAmount + surcharge;
    if (parseInt(discount) > totalBeforeDiscount) {
      return res.status(400).json({ error: `Chiết khấu (${discount}k) không được vượt quá tổng tiền (${totalBeforeDiscount}k)` });
    }

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert([{
        booking_id:     bookingId,
        room_amount:    roomAmount,
        food_amount:    foodAmount,
        surcharge:      surcharge,
        discount:       parseInt(discount),
        payment_status: 'paid',
        payment_method: 'cash',
        paid_at:        new Date(),
        created_by:     req.admin?.id || null,
        note:           note?.trim() || null,
      }])
      .select().single();
    if (invErr) return res.status(500).json({ error: invErr.message });

    // Tạo invoice_items (snapshot hoàn chỉnh)
    const invoiceItems = [];
    breakdown.forEach(b => {
      invoiceItems.push({
        invoice_id:  invoice.id,
        item_type:   'room',
        description: `Phòng ${booking.rooms.name} — ${b.slot === 'morning' ? 'Sáng (09–17h)' : 'Tối (17–02h)'} (${b.hours}h × ${b.rate}k)`,
        quantity:    b.hours,
        unit_price:  b.rate,
      });
    });
    allItems.forEach(item => {
      invoiceItems.push({
        invoice_id:    invoice.id,
        item_type:     'food',
        description:   `${item.menu_items.name}${item.variant ? ` (${item.variant})` : ''}`,
        quantity:      item.quantity,
        unit_price:    item.unit_price,
        order_item_id: item.id,
      });
    });
    if (surcharge > 0) {
      invoiceItems.push({
        invoice_id:  invoice.id,
        item_type:   'surcharge',
        description: `Phụ thu (${booking.people} người)`,
        quantity:    1,
        unit_price:  surcharge,
      });
    }
    if (parseInt(discount) > 0) {
      invoiceItems.push({
        invoice_id:  invoice.id,
        item_type:   'discount',
        description: 'Giảm giá',
        quantity:    1,
        unit_price:  parseInt(discount),
      });
    }
    if (invoiceItems.length > 0) {
      const { error: itemErr } = await supabase.from('invoice_items').insert(invoiceItems);
      if (itemErr) return res.status(500).json({ error: itemErr.message });
    }

    await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);

    const { data: full } = await supabase
      .from('invoices').select('*, invoice_items(*)').eq('id', invoice.id).single();
    res.status(201).json({ invoice: full });
  }
);

// ── GET /api/invoices/:id — Chi tiết hoá đơn ──
router.get('/:id', requireStaff, async (req, res) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items(*),
      bookings(
        booking_date, start_time, end_time, people, is_overnight,
        customers(name, phone),
        rooms(name, floor, type)
      )
    `)
    .eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Không tìm thấy hoá đơn' });
  res.json({ invoice: data });
});

// ── PATCH /api/invoices/:id — Cập nhật thanh toán ──
router.patch('/:id', requireStaff,
  body('paymentMethod').optional().isIn(['cash','transfer','mixed']),
  body('paymentStatus').optional().isIn(['unpaid','deposit','paid']),
  body('depositAmount').optional().isInt({ min: 0 }),
  body('discount').optional().isInt({ min: 0 }),
  body('note').optional().isString(),
  validate,
  async (req, res) => {
    const updates = {};
    if (req.body.paymentMethod !== undefined) updates.payment_method = req.body.paymentMethod;
    if (req.body.paymentStatus !== undefined) updates.payment_status = req.body.paymentStatus;
    if (req.body.depositAmount !== undefined) updates.deposit_amount = parseInt(req.body.depositAmount);
    if (req.body.discount      !== undefined) {
      const { data: currentInv } = await supabase
        .from('invoices').select('room_amount, food_amount, surcharge').eq('id', req.params.id).single();
      if (currentInv) {
        const totalBefore = currentInv.room_amount + currentInv.food_amount + currentInv.surcharge;
        if (parseInt(req.body.discount) > totalBefore) {
          return res.status(400).json({ error: `Chiết khấu (${req.body.discount}k) không được vượt quá tổng tiền (${totalBefore}k)` });
        }
      }
      updates.discount = parseInt(req.body.discount);
    }
    if (req.body.note          !== undefined) updates.note           = req.body.note;
    if (req.body.paymentStatus === 'paid')    updates.paid_at        = new Date();

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ error: 'Không có trường hợp lệ để cập nhật' });

    const { data, error } = await supabase
      .from('invoices').update(updates).eq('id', req.params.id)
      .select('*, invoice_items(*)').single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ invoice: data });
  }
);

module.exports = router;
