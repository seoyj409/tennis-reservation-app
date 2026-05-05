require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const newCourts = [
  // 고양시
  { region: '고양시', name: '성사시립테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '충장테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '화정테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '성라테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '토당테니스장', url: 'https://goyangtennis.kr' },
  { region: '고양시', name: '대화테니스장', url: 'https://goyangtennis.kr' },
  
  // 강서구
  { region: '강서구', name: '강서구립테니스장', url: 'https://sports.gangseo.seoul.kr' },
  { region: '강서구', name: '황금내테니스장', url: 'https://sports.gangseo.seoul.kr' },
  { region: '강서구', name: '서남물재생센터 테니스장', url: 'https://yeyak.seoul.go.kr' },

  // 마포구
  { region: '마포구', name: '망원나들목 테니스장', url: 'https://yeyak.seoul.go.kr' },
  { region: '마포구', name: '월드컵공원 테니스장', url: 'https://yeyak.seoul.go.kr' },
  { region: '마포구', name: '망원유수지 테니스장', url: 'https://yeyak.seoul.go.kr' },
  { region: '마포구', name: '난지물재생센터 테니스장', url: 'https://yeyak.seoul.go.kr' },

  // 김포시
  { region: '김포시', name: '솔터 테니스장', url: 'https://yeyak.guc.or.kr' },
  { region: '김포시', name: '풍년근린공원 테니스장', url: 'https://www.gimpo.go.kr/reserve/index.do' },
  { region: '김포시', name: '종합운동장 테니스장', url: 'https://yeyak.guc.or.kr' },

  // 용인시
  { region: '용인시', name: '용인시립골드 테니스장', url: 'https://publicsports.yongin.go.kr' },
  { region: '용인시', name: '원삼 테니스장', url: 'https://publicsports.yongin.go.kr' },
  { region: '용인시', name: '포곡 테니스장', url: 'https://publicsports.yongin.go.kr' },
  { region: '용인시', name: '수지레스피아 테니스장', url: 'https://www.yuc.co.kr' }
];

async function insertAll() {
  console.log("Inserting new courts...");
  
  const { data: existing } = await supabase.from('courts').select('name');
  const existingNames = existing ? existing.map(e => e.name) : [];
  
  const toInsert = newCourts.filter(c => !existingNames.includes(c.name));
  
  if (toInsert.length > 0) {
    const { error } = await supabase.from('courts').insert(toInsert);
    if (error) {
      console.error('Insert failed:', error.message);
    } else {
      console.log(`Successfully inserted ${toInsert.length} new courts.`);
    }
  } else {
    console.log("No new courts to insert. They already exist.");
  }
}

insertAll();
