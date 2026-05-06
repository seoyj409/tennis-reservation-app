require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const newCourts = [
  { region: '고양시', name: '중산테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '삼송유수지 테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '킨텍스유수지 테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '백석 환경시설 테니스장', url: 'https://goyangtennis.kr' }
];

async function insertMissing() {
  const { data: existing } = await supabase.from('courts').select('name');
  const existingNames = existing ? existing.map(e => e.name) : [];
  
  const toInsert = newCourts.filter(c => !existingNames.includes(c.name));
  
  if (toInsert.length > 0) {
    const { error } = await supabase.from('courts').insert(toInsert);
    if (!error) console.log(`Inserted ${toInsert.length} courts.`);
  } else {
    console.log("Already exist.");
  }
}
insertMissing();
