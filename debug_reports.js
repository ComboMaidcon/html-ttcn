require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function check() {
  const start = '2026-04-30';
  const end = '2026-05-31';
  
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, created_at, bookings!inner(booking_date, start_time, is_overnight, channel, rooms(name))')
    .gte('created_at', start + 'T00:00:00Z')
    .lte('created_at', end + 'T23:59:59Z')
    .order('created_at', { ascending: false });

  console.log("Invoices fetched:", invoices?.length);
  
  const validInvoiceIds = invoices.map(i => i.id);
  
  let foodItems = [];
  const chunkSize = 200;
  for (let i = 0; i < validInvoiceIds.length; i += chunkSize) {
    const chunk = validInvoiceIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('invoice_items')
      .select('description, quantity, unit_price')
      .eq('item_type', 'food')
      .in('invoice_id', chunk);
    if (error) console.error("Error in chunk:", error);
    if (data) foodItems = foodItems.concat(data);
  }
  
  console.log("Food items fetched:", foodItems.length);
}
check();
