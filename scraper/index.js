require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and Key must be provided in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 날짜 포맷 함수 (YYYY-MM-DD)
const getToday = () => new Date().toISOString().split('T')[0];
const getTomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
};

async function insertMockCourts() {
  const mockCourts = [
    { region: '고양시', name: '성저테니스장', url: 'https://www.gys.or.kr' },
    { region: '용인시', name: '시립테니스장', url: 'https://yys.yongin.go.kr' },
    { region: '김포시', name: '걸포중앙공원', url: 'https://www.gimpo.go.kr' },
    { region: '강서구', name: '우장산테니스장', url: 'https://www.gangseo.seoul.kr' },
    { region: '마포구', name: '망원테니스장', url: 'https://www.mapo.go.kr' }
  ];

  const { data: existing } = await supabase.from('courts').select('name');
  const existingNames = existing ? existing.map(e => e.name) : [];
  
  const toInsert = mockCourts.filter(c => !existingNames.includes(c.name));
  
  if (toInsert.length > 0) {
      const { error } = await supabase.from('courts').insert(toInsert);
      if (error) console.log('코트 추가 중 에러:', error.message);
      else console.log('기본 코트 데이터 추가 완료');
  } else {
      console.log('기본 코트 데이터가 이미 존재합니다.');
  }
}

async function scrapeDummyData() {
  console.log("실제 파싱 로직 구현 전, 연결 테스트를 위한 더미 데이터 수집...");
  
  // courts 테이블에서 코트 아이디 가져오기
  const { data: courts } = await supabase.from('courts').select('id, name');
  if (!courts || courts.length === 0) return [];

  const results = [];
  const today = getToday();
  const tomorrow = getTomorrow();

  for (const court of courts) {
    // 각 코트마다 임의로 1~2개의 빈자리 생성
    results.push({
      court_id: court.id,
      date: today,
      time_slot: '06:00~08:00',
      status: 'AVAILABLE'
    });
    if (Math.random() > 0.5) {
      results.push({
        court_id: court.id,
        date: tomorrow,
        time_slot: '18:00~20:00',
        status: 'AVAILABLE'
      });
    }
  }
  
  return results;
}

async function main() {
  try {
    console.log("=== 테니스장 예약 크롤러 시작 ===");
    
    // 1. 코트 정보 초기화 (테스트용)
    await insertMockCourts();
    
    // 2. 더미 데이터 파싱
    const allReservations = await scrapeDummyData();
    console.log(`총 ${allReservations.length}개의 빈자리 발견`);
    
    if (allReservations.length > 0) {
      // 3. Supabase에 업데이트 (Upsert 방식)
      const { data, error } = await supabase
        .from('reservations_available')
        .upsert(allReservations, { onConflict: 'court_id, date, time_slot' });
        
      if (error) throw error;
      console.log("Supabase 데이터 업데이트 완료");
    }

  } catch (err) {
    console.error("크롤러 실행 중 에러 발생:", err);
  } finally {
    console.log("=== 크롤러 종료 ===");
    process.exit(0);
  }
}

main();
