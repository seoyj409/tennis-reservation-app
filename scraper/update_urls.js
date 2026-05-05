require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function updateUrls() {
  console.log("Updating URLs in the database...");
  
  const updates = [
    { name: '성저테니스장', url: 'https://daehwa.gys.or.kr' },
    { name: '우장산테니스장', url: 'https://www.gangseo.seoul.kr/reserve' },
    { name: '망원테니스장', url: 'https://yeyak.seoul.go.kr' },
    { name: '걸포중앙공원', url: 'https://yeyak.guc.or.kr' },
    { name: '시립테니스장', url: 'https://publicsports.yongin.go.kr' }
  ];

  for (const item of updates) {
    const { data, error } = await supabase
      .from('courts')
      .update({ url: item.url })
      .eq('name', item.name);
      
    if (error) {
      console.error(`Failed to update ${item.name}:`, error.message);
    } else {
      console.log(`Updated ${item.name} to ${item.url}`);
    }
  }
}

updateUrls();
