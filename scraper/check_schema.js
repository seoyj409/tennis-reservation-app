require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function checkSchema() {
  const { data, error } = await supabase.from('courts').select().limit(1);
  if (error) console.error(error);
  else console.log("Courts columns:", Object.keys(data[0] || {}));

  const { data: resData, error: resError } = await supabase.from('reservations_available').select().limit(1);
  if (resError) console.error(resError);
  else console.log("Reservations columns:", Object.keys(resData[0] || {}));
}

checkSchema();
