require('dotenv').config();
console.log('URL:', process.env.SUPABASE_URL);
console.log('KEY:', process.env.SUPABASE_SERVICE_KEY?.slice(0, 30) + '...');