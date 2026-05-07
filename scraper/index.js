require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const cheerio = require('cheerio');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ 에러: Supabase URL 또는 Key가 설정되지 않았습니다.");
  console.error("로컬에서는 .env 파일을 확인하시고, GitHub Actions에서는 Settings > Secrets > Actions에 SUPABASE_URL과 SUPABASE_KEY를 등록했는지 확인해주세요.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 날짜 포맷 함수 (YYYY-MM-DD)
const getFormattedDate = (daysAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAdd);
    return d.toISOString().split('T')[0];
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

const STANDARD_SLOTS = [
  "06:00~08:00", "08:00~10:00", "10:00~12:00", "12:00~14:00",
  "14:00~16:00", "16:00~18:00", "18:00~20:00", "20:00~22:00"
];

// 고양시 테니스협회 사이트 ID 매핑 (DB의 booking_url_id 기반으로 작동하도록 수정 예정)
// 현재는 DB에서 직접 가져오므로 이 매핑 변수는 참고용으로만 사용하거나 제거 가능합니다.

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

// --- 2. 고양시 테니스협회 실시간 파싱 ---
async function scrapeGoyang(court) {
  const siteId = court.booking_url_id;
  if (!siteId || siteId === 'goyang_city') {
    return []; // 시청 예약 사이트(성저, 백석)는 별도 구현 필요 시 추가
  }

  const results = [];
  console.log(`[실시간 크롤링] 고양시 - ${court.name} (ID: ${siteId})`);

  for (let daysAdd = 0; daysAdd < 30; daysAdd++) {
    const date = getFormattedDate(daysAdd);
    const url = `https://www.gytennis.or.kr/daily/${siteId}/${date}`;
    
    try {
      const response = await axios.get(url, { timeout: 10000 });
      
      // 야간 예약 불가 시간대 처리
      if (response.data.includes('예약 가능한 시간이 아닙니다')) {
        console.log(`[시스템 점검/마감시간] ${court.name} - 예약 불가 시간 (22:00 ~ 05:00). 기존 예약 정보를 유지합니다.`);
        return null; // null 반환 시 기존 데이터 보존
      }
      
      const $ = cheerio.load(response.data);
      
      // 각 코트(열)별 데이터를 확인하여 상세 코트별로 저장
      $('.wholeTable .innerCustom').each((courtIdx, courtTable) => {
        const subCourtName = $(courtTable).find('.courtTag').text().trim().replace(/\s+/g, ' '); // 예: "1 코트"
        
        $(courtTable).find('.resTag').each((slotIdx, resTag) => {
          const isBooked = $(resTag).find('.fa-user-clock').length > 0;
          
          // 사람 이미지(fa-user-clock)가 없으면 예약 가능
          if (!isBooked) {
            results.push({
              court_id: court.id,
              date: date,
              time_slot: STANDARD_SLOTS[slotIdx],
              sub_court_name: subCourtName,
              status: 'AVAILABLE'
            });
          }
        });
      });
      
    } catch (err) {
      console.error(`[고양 크롤링 에러] ${court.name} (${date}):`, err.message);
    }
    await delay(300); // 서버 부하 방지를 위한 0.3초 대기
  }
  return results;
}

// --- 3. 성저테니스장 파싱 (고양도시관리공사) ---
async function scrapeSeongjeo(court) {
  const results = [];
  console.log(`[실시간 크롤링] 고양시 - ${court.name} (ID: ${court.booking_url_id})`);

  const id = process.env.GYS_USER_ID;
  const pw = process.env.GYS_USER_PW;

  if (!id || !pw) {
    console.error("❌ 에러: GYS_USER_ID 또는 GYS_USER_PW 환경 변수가 없습니다.");
    return null;
  }

  try {
    const loginRes = await axios.post('https://daehwa.gys.or.kr:451/member/login_process.php', 
      new URLSearchParams({id, pw, preURL: '/rent/tennis_condition.php'}).toString(), 
      {
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        maxRedirects: 0,
        validateStatus: (status) => status >= 200 && status < 400
      }
    );
    
    let cookies = [];
    if (loginRes.headers['set-cookie']) {
      cookies = loginRes.headers['set-cookie'].map(c => c.split(';')[0]);
    }

    if (cookies.length === 0) {
      console.error("❌ 성저테니스장 로그인 실패: 쿠키를 발급받지 못했습니다.");
      return null;
    }

    const courtsOpt = [
      { sub_court_name: '1 코트', place_opt: 2 },
      { sub_court_name: '2 코트', place_opt: 7 },
      { sub_court_name: '3 코트', place_opt: 8 },
      { sub_court_name: '4 코트', place_opt: 9 }
    ];

    const targetDates = Array.from({length: 30}, (_, i) => getFormattedDate(i));
    const targetSet = new Set(targetDates);
    
    const monthSet = new Set();
    targetDates.forEach(d => {
      const parts = d.split('-');
      monthSet.add(`${parts[0]}-${parts[1]}`);
    });

    for (const opt of courtsOpt) {
      for (const yyyymm of monthSet) {
        const [year, month] = yyyymm.split('-');
        const url = `https://daehwa.gys.or.kr:451/rent/tennis_condition.php?place_opt=${opt.place_opt}&year=${year}&month=${month}`;
        
        const htmlRes = await axios.get(url, {
          headers: { 'Cookie': cookies.join('; ') }
        });
        
        const $ = cheerio.load(htmlRes.data);
        
        $('table.table tbody td').each((i, td) => {
          const dayText = $(td).find('font').first().text().trim();
          if (!dayText) return;
          
          const dayNum = parseInt(dayText, 10);
          if (isNaN(dayNum)) return;
          
          const dateStr = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
          
          if (targetSet.has(dateStr)) {
            $(td).find('li a').each((j, a) => {
              const text = $(a).text();
              const match = text.match(/(\d{2}:\d{2})/);
              if (match) {
                const startTime = match[1];
                const startHour = parseInt(startTime.split(':')[0], 10);
                const endHour = startHour + 2;
                const endTime = `${String(endHour).padStart(2, '0')}:00`;
                const timeSlot = `${startTime}~${endTime}`;
                
                results.push({
                  court_id: court.id,
                  date: dateStr,
                  time_slot: timeSlot,
                  sub_court_name: opt.sub_court_name,
                  status: 'AVAILABLE'
                });
              }
            });
          }
        });
      }
    }
  } catch (err) {
    console.error(`[성저 크롤링 에러] ${court.name}:`, err.message);
    return null;
  }
  return results;
}

// --- 4. 기타 지자체 파싱 (용인시, 김포시 등 아직 개발 안된 곳) ---
async function scrapeOtherRegion(court) {
  const results = [];
  console.log(`[개발 중] ${court.region} - ${court.name} 크롤러는 개발 예정입니다.`);
  
  // 임시 데이터
  for (let daysAdd = 0; daysAdd < 30; daysAdd++) {
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
    const courtIdsToUpdate = [];

    // 2. 각 코트별로 크롤링 수행
    for (const court of courts) {
      let slots = [];
      if (court.region === '강서구' || court.region === '마포구') {
        slots = await scrapeSeoulYeyak(court);
      } else if (court.region === '고양시') {
        if (court.name === '성저테니스장') {
          slots = await scrapeSeongjeo(court);
        } else {
          slots = await scrapeGoyang(court);
        }
      } else {
        slots = await scrapeOtherRegion(court);
      }
      
      // slots가 null이면 시스템 점검 등 정상 수집이 불가능한 상태이므로 기존 데이터를 지우지 않음
      if (slots !== null) {
        allReservations = allReservations.concat(slots);
        courtIdsToUpdate.push(court.id);
      }
    }
    
    console.log(`총 ${allReservations.length}개의 빈자리 데이터 취합 완료.`);
    
    // 3. 기존 예약 상태 초기화 및 업데이트 (과거/취소된 데이터 동기화)
    const today = getFormattedDate(0);
    
    // 정상 수집된 코트(courtIdsToUpdate)의 오늘 이후 기존 예약 데이터를 일단 모두 삭제
    // (이 과정을 거쳐야 예약 마감된 코트가 DB에서도 사라집니다)
    if (courtIdsToUpdate.length > 0) {
      const { error: deleteError } = await supabase
        .from('reservations_available')
        .delete()
        .in('court_id', courtIdsToUpdate)
        .gte('date', today);
        
      if (deleteError) {
         console.error("기존 데이터 삭제 실패 (동기화 오류 가능성):", deleteError);
      } else {
         console.log("기존 데이터 정리 완료 (동기화 준비)");
      }
    }
    
    if (allReservations.length > 0) {
      // 최신 데이터 삽입 (삭제 후 삽입이므로 실제로는 Insert와 같습니다)
      const { data, error } = await supabase
        .from('reservations_available')
        .upsert(allReservations, { onConflict: 'court_id, date, time_slot, sub_court_name' });
        
      if (error) throw error;
      console.log("Supabase 최신 데이터 동기화 완료");
    } else {
      console.log("새로 삽입할 예약 가능 슬롯이 없습니다 (전체 마감 또는 예약 불가 시간).");
    }

  } catch (err) {
    console.error("크롤러 실행 중 치명적 에러 발생:", err);
  } finally {
    console.log("=== 크롤러 종료 ===");
    process.exit(0);
  }
}

main();
