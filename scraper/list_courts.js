require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function listCourts() {
  const { data, error } = await supabase.from('courts').select('id, name, region');
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

listCourts();
