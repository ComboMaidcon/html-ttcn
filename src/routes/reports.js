const router = require('express').Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/reports/dashboard — admin
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Xây dựng điều kiện lọc thời gian chung
    // Nếu không có, mặc định lấy 30 ngày qua
    let start = startDate;
    let end = endDate;
    if (!start || !end) {
      const today = new Date();
      end = today.toISOString().split('T')[0];
      const past30 = new Date(today);
      past30.setDate(past30.getDate() - 30);
      start = past30.toISOString().split('T')[0];
    }

    // Lấy doanh thu từ Invoices
    let invQuery = supabase.from('invoices').select('total_amount, created_at');
    invQuery = invQuery.gte('created_at', start + 'T00:00:00Z').lte('created_at', end + 'T23:59:59Z');
    const { data: invoices, error: invErr } = await invQuery;
    if (invErr) throw invErr;

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);

    // Group doanh thu theo ngày (để vẽ biểu đồ)
    const revByDate = {};
    invoices.forEach(inv => {
      const date = inv.created_at.split('T')[0];
      if (!revByDate[date]) revByDate[date] = 0;
      revByDate[date] += inv.total_amount;
    });
    // Sort dates
    const sortedDates = Object.keys(revByDate).sort();
    const revLabels = sortedDates.length ? sortedDates : [start, end];
    const revData = sortedDates.length ? sortedDates.map(d => revByDate[d]) : [0, 0];

    // Lấy tổng số bookings
    let bkQuery = supabase.from('bookings').select('id', { count: 'exact' });
    bkQuery = bkQuery.gte('booking_date', start).lte('booking_date', end);
    const { count: totalBookings, error: bkErr } = await bkQuery;
    if (bkErr) throw bkErr;

    // Lấy đánh giá
    let rvQuery = supabase.from('reviews').select('rating', { count: 'exact' });
    rvQuery = rvQuery.gte('created_at', start + 'T00:00:00Z').lte('created_at', end + 'T23:59:59Z');
    const { data: reviews, count: totalReviews, error: rvErr } = await rvQuery;
    if (rvErr) throw rvErr;

    let avgRating = 0;
    if (reviews && reviews.length > 0) {
      avgRating = (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
    }

    // Tần suất đặt phòng (Dựa vào bookings hoàn thành hoặc tất cả bookings)
    let roomPerfQuery = supabase.from('bookings').select('rooms(name)').gte('booking_date', start).lte('booking_date', end).neq('status', 'cancelled');
    const { data: roomBookings } = await roomPerfQuery;
    const roomCounts = {};
    if (roomBookings) {
      roomBookings.forEach(b => {
        const rName = b.rooms?.name || 'Khác';
        roomCounts[rName] = (roomCounts[rName] || 0) + 1;
      });
    }
    // Lấy top 5 phòng
    const topRooms = Object.entries(roomCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

    // Menu Performance (Lấy từ invoice_items loại food - do hiện tại chưa làm menu checkout nên nó sẽ rỗng)
    // Để biểu đồ không vỡ, ta query
    let menuPerfQuery = supabase.from('invoice_items').select('description, quantity').eq('item_type', 'food').gte('created_at', start + 'T00:00:00Z').lte('created_at', end + 'T23:59:59Z');
    const { data: menuItems } = await menuPerfQuery;
    const menuCounts = {};
    if (menuItems) {
      menuItems.forEach(item => {
        menuCounts[item.description] = (menuCounts[item.description] || 0) + item.quantity;
      });
    }
    const topMenu = Object.entries(menuCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

    const data = {
      overview: {
        totalRevenue: totalRevenue || 0,
        totalBookings: totalBookings || 0,
        totalReviews: totalReviews || 0,
        avgRating: avgRating || 0
      },
      revenueLine: {
        labels: revLabels,
        data: revData
      },
      roomsPerformance: {
        labels: topRooms.length ? topRooms.map(r => r[0]) : ['Chưa có dữ liệu'],
        data: topRooms.length ? topRooms.map(r => r[1]) : [1]
      },
      menuPerformance: {
        labels: topMenu.length ? topMenu.map(m => m[0]) : ['Chưa có dữ liệu (Chưa kết nối POS)'],
        data: topMenu.length ? topMenu.map(m => m[1]) : [1]
      }
    };

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
