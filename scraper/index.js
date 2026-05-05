require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and Key must be provided in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 지역별 크롤링 로직 (추후 각각 구현)
async function scrapeGoyang() {
  console.log("고양시 데이터 파싱 시작...");
  // TODO: Puppeteer or Axios logic
  return [];
}

async function scrapeYongin() {
  console.log("용인시 데이터 파싱 시작...");
  return [];
}

async function scrapeGimpo() {
  console.log("김포시 데이터 파싱 시작...");
  return [];
}

async function scrapeSeoulGangseo() {
  console.log("서울 강서구 데이터 파싱 시작...");
  return [];
}

async function scrapeSeoulMapo() {
  console.log("서울 마포구 데이터 파싱 시작...");
  return [];
}

async function main() {
  try {
    console.log("=== 테니스장 예약 크롤러 시작 ===");
    
    // 1. 모든 지역 데이터 병렬 파싱
    const results = await Promise.all([
      scrapeGoyang(),
      scrapeYongin(),
      scrapeGimpo(),
      scrapeSeoulGangseo(),
      scrapeSeoulMapo()
    ]);
    
    const allReservations = results.flat();
    console.log(`총 ${allReservations.length}개의 빈자리 발견`);
    
    if (allReservations.length > 0) {
      // 2. Supabase에 업데이트 (Upsert 방식)
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
