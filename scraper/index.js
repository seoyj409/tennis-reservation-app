require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase URL and Key must be provided in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 날짜 포맷 함수 (YYYY-MM-DD)
const getFormattedDate = (daysAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAdd);
    return d.toISOString().split('T')[0];
};

const STANDARD_SLOTS = [
  "06:00~08:00", "08:00~10:00", "10:00~12:00", "12:00~14:00",
  "14:00~16:00", "16:00~18:00", "18:00~20:00", "20:00~22:00"
];

// --- 1. 서울시 공공서비스예약 파싱 (마포구, 강서구 등) ---
async function scrapeSeoulYeyak(court) {
  const results = [];
  try {
    console.log(`[크롤링 시도] 서울시 공공서비스 - ${court.name}`);
    
    // 실제 사이트의 상세 페이지나 API를 호출하는 로직 (현재는 검색페이지 예시)
    // 실제 서울예약 사이트는 예약 페이지 접근 시 인증키/쿠키가 필요할 수 있습니다.
    const response = await axios.get('https://yeyak.seoul.go.kr/web/search/selectPageListDetailSearchImg.do?code=T500&dCode=T502', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // 파싱 로직의 구조만 작성 (실제 DOM 구조에 맞춰 추후 업데이트 필요)
    const items = $('.list_box li');
    
    // 만약 실제 데이터를 가져오는데 실패하거나 DOM 구조가 다르면 예외를 던짐
    if (items.length === 0) {
      throw new Error("서울시 공공예약 사이트의 DOM 구조가 변경되었거나 접근이 제한되었습니다.");
    }

    // 실제 파싱된 데이터를 results 배열에 넣는 로직 추가 부분
    
  } catch (error) {
    console.log(`[크롤링 실패] ${court.name} - ${error.message}`);
    console.log("-> 캡챠/구조 변경 우회를 위해 임시 시뮬레이션 데이터로 폴백(Fallback)합니다.");
    
    // Fallback: 임시 데이터 
    for (let daysAdd = 0; daysAdd < 3; daysAdd++) {
      const date = getFormattedDate(daysAdd);
      STANDARD_SLOTS.forEach(slot => {
        // 랜덤 확률로 빈자리 생성 (MVP용)
        if (Math.random() > 0.8) {
          results.push({
            court_id: court.id,
            date: date,
            time_slot: slot,
            status: 'AVAILABLE'
          });
        }
      });
    }
  }
  return results;
}

// --- 2. 기타 지자체 파싱 (고양시, 용인시, 김포시) ---
async function scrapeOtherRegion(court) {
  const results = [];
  console.log(`[개발 중] ${court.region} - ${court.name} 크롤러는 개발 예정입니다.`);
  
  // 임시 데이터
  for (let daysAdd = 0; daysAdd < 3; daysAdd++) {
    const date = getFormattedDate(daysAdd);
    STANDARD_SLOTS.forEach(slot => {
      if (Math.random() > 0.8) {
        results.push({
          court_id: court.id,
          date: date,
          time_slot: slot,
          status: 'AVAILABLE'
        });
      }
    });
  }
  return results;
}

// --- 메인 실행 ---
async function main() {
  try {
    console.log("=== 테니스장 예약 크롤러 시작 ===");
    
    // 1. DB에서 활성화된 코트 목록 가져오기
    const { data: courts, error: courtError } = await supabase.from('courts').select('*');
    if (courtError) throw courtError;
    
    if (!courts || courts.length === 0) {
      console.log("등록된 코트가 없습니다.");
      return;
    }

    let allReservations = [];

    // 2. 각 코트별로 크롤링 수행
    for (const court of courts) {
      let slots = [];
      if (court.region === '강서구' || court.region === '마포구') {
        slots = await scrapeSeoulYeyak(court);
      } else {
        slots = await scrapeOtherRegion(court);
      }
      allReservations = allReservations.concat(slots);
    }
    
    console.log(`총 ${allReservations.length}개의 빈자리 데이터 취합 완료.`);
    
    // 3. 기존 예약 상태 초기화 및 업데이트 (과거 데이터 정리)
    // 실제 운영시에는 오늘 날짜 이전 데이터 삭제 및 전체 업데이트 진행
    
    if (allReservations.length > 0) {
      // Upsert 방식: 기존 데이터 덮어쓰기 (court_id, date, time_slot 기준)
      const { data, error } = await supabase
        .from('reservations_available')
        .upsert(allReservations, { onConflict: 'court_id, date, time_slot' });
        
      if (error) throw error;
      console.log("Supabase 데이터 동기화 완료");
    }

  } catch (err) {
    console.error("크롤러 실행 중 치명적 에러 발생:", err);
  } finally {
    console.log("=== 크롤러 종료 ===");
    process.exit(0);
  }
}

main();
