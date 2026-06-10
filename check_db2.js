require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
async function check() {
  const { data: food, error: foodErr } = await supabase.from('invoice_items').select('*').eq('item_type', 'food').limit(5);
  console.log("Food Items:", food);
  if (food && food.length > 0) {
    const invId = food[0].invoice_id;
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', invId);
    console.log("Invoice:", inv);
  }
}
check();
