const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const supabase = require('../lib/supabase');

// GET /api/invoices/admin — admin
router.get('/admin', requireAuth, async (req, res) => {
  try {
    const { sortBy = 'newest' } = req.query;

    let query = supabase
      .from('invoices')
      .select('*, bookings(*, customers(*), rooms(*)), invoice_items(*)');

    if (sortBy === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sortBy === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sortBy === 'highest') {
      query = query.order('total_amount', { ascending: false });
    } else if (sortBy === 'lowest') {
      query = query.order('total_amount', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({ invoices: data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
