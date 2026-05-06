require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listCourts() {
  const { data, error } = await supabase.from('courts').select('name, booking_url_id');
  if (error) console.error(error);
  else console.log(data);
}

listCourts();
