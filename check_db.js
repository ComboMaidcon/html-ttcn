require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function check() {
  const { data: items, error } = await supabase
    .from('invoice_items')
    .select('*')
    .limit(10);
  console.log("Error:", error);
  console.log("Items:", items);

  const { data: food, error: foodErr } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('item_type', 'food')
    .limit(5);
  console.log("Food Items:", food);

  const { count } = await supabase
    .from('invoice_items')
    .select('*', { count: 'exact', head: true });
  console.log("Total invoice_items:", count);
}
check();
