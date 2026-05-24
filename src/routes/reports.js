const router = require('express').Router();
const { requireAdmin } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/reports/dashboard — admin
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate, timeOfDay, dayOfWeek, channel, roomName, menuName } = req.query;
    
    // Default to last 30 days
    let start = startDate;
    let end = endDate;
    if (!start || !end) {
      const today = new Date();
      end = today.toISOString().split('T')[0];
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      start = past30.toISOString().split('T')[0];
    }

    // 1. Fetch ALL invoices in the date range with their booking details
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('*, bookings!inner(booking_date, start_time, is_overnight, channel, rooms(name))')
      .gte('created_at', start + 'T00:00:00Z')
      .lte('created_at', end + 'T23:59:59Z');

    if (invErr) throw invErr;

    // 2. Filter locally based on advanced custom filters
    const filteredInvoices = invoices.filter(inv => {
      const b = inv.bookings;
      
      // Filter Channel
      if (channel && channel !== 'all' && b.channel !== channel) return false;
      
      // Filter Room
      if (roomName && roomName !== 'all' && b.rooms?.name !== roomName) return false;
      
      // Filter Day of Week
      if (dayOfWeek && dayOfWeek !== '0,1,2,3,4,5,6') { // if not all checked
         if (dayOfWeek === 'none') return false; // if nothing checked
         const d = new Date(b.booking_date).getDay(); // 0 is Sunday, 1 is Mon...
         if (!dayOfWeek.split(',').includes(d.toString())) {
             return false;
         }
      }
      
      // Filter Time of Day
      if (timeOfDay && timeOfDay !== 'all') {
         const [h, m] = b.start_time.split(':').map(Number);
         const startF = h + m/60;
         let isMorning = startF >= 6 && startF < 17;
         let isEvening = startF >= 17 && startF < 22;
         let isNight = startF >= 22 || startF < 6;
         
         if (timeOfDay === 'morning' && !isMorning) return false;
         if (timeOfDay === 'evening' && !isEvening) return false;
         if (timeOfDay === 'night' && !isNight) return false;
      }
      return true;
    });

    // 3. Calculate Core Metrics & Revenue Breakdown
    let totalRevenue = 0, roomRevenue = 0, foodRevenue = 0, surcharge = 0, discount = 0;
    let roomPerf = {}; // { roomName: { count, revenue } }
    let revByDate = {}; // For the trend line

    filteredInvoices.forEach(inv => {
      totalRevenue += inv.total_amount;
      roomRevenue += inv.room_amount;
      foodRevenue += inv.food_amount;
      surcharge += inv.surcharge;
      discount += inv.discount;
      
      // Room Performance
      const rName = inv.bookings.rooms?.name || 'Khác';
      if (!roomPerf[rName]) roomPerf[rName] = { count: 0, revenue: 0 };
      roomPerf[rName].count += 1;
      roomPerf[rName].revenue += inv.total_amount;

      // Revenue by Date
      const date = inv.created_at.split('T')[0];
      if (!revByDate[date]) revByDate[date] = 0;
      revByDate[date] += inv.total_amount;
    });

    const totalBookings = filteredInvoices.length;
    const avgRevPerBooking = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;

    // Sort dates for Line Chart
    const sortedDates = Object.keys(revByDate).sort();
    const revLabels = sortedDates.length ? sortedDates : [start, end];
    const revData = sortedDates.length ? sortedDates.map(d => revByDate[d]) : [0, 0];

    // 4. Fetch Menu Performance (Food/Drink only)
    let topMenu = [];
    if (filteredInvoices.length > 0) {
      const validInvoiceIds = filteredInvoices.map(i => i.id);
      
      // We chunk the IN clause just in case there are thousands of invoices
      // For simplicity, assuming < 1000 invoices per filter
      const { data: foodItems } = await supabase
        .from('invoice_items')
        .select('description, quantity, unit_price')
        .eq('item_type', 'food')
        .in('invoice_id', validInvoiceIds);
        
      const menuCounts = {};
      if (foodItems) {
        foodItems.forEach(item => {
          if (menuName && menuName !== 'all' && item.description !== menuName && !item.description.startsWith(menuName)) return;
          // Normalize name by removing variants to group better, or keep as is. Keeping as is for accuracy.
          menuCounts[item.description] = menuCounts[item.description] || { qty: 0, revenue: 0 };
          menuCounts[item.description].qty += item.quantity;
          menuCounts[item.description].revenue += (item.quantity * item.unit_price);
        });
      }
      topMenu = Object.entries(menuCounts)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a,b) => b.revenue - a.revenue); // Sort by revenue descending
    }

    // Format Room Performance
    const roomPerformance = Object.entries(roomPerf)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a,b) => b.revenue - a.revenue);

    const data = {
      overview: {
        totalRevenue,
        totalBookings,
        avgRevPerBooking,
        roomRevenue,
        foodRevenue,
        surcharge,
        discount
      },
      revenueLine: {
        labels: revLabels,
        data: revData
      },
      roomsPerformance: roomPerformance,
      menuPerformance: topMenu
    };

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
