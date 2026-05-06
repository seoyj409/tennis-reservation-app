require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function migrate() {
  console.log("--- 고양시 전용 데이터베이스 마이그레이션 시작 (V3 - Clean Sweep) ---");

  // 1. 모든 예약 데이터 및 코트 데이터 삭제
  console.log("모든 기존 데이터 초기화 중...");
  await supabase.from('reservations_available').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('courts').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 2. 고양시 코트 데이터 정의
  const goyangCourts = [
    { name: "대화테니스장", region: "고양시", booking_url_id: "1" },
    { name: "삼송유수지 테니스장", region: "고양시", booking_url_id: "2" },
    { name: "성라테니스장", region: "고양시", booking_url_id: "3" },
    { name: "성사 전천후코트", region: "고양시", booking_url_id: "4" },
    { name: "성사 실외코트", region: "고양시", booking_url_id: "5" },
    { name: "중산테니스장", region: "고양시", booking_url_id: "6" },
    { name: "충장테니스장", region: "고양시", booking_url_id: "7" },
    { name: "킨텍스유수지 테니스장", region: "고양시", booking_url_id: "8" },
    { name: "토당테니스장", region: "고양시", booking_url_id: "9" },
    { name: "화정테니스장", region: "고양시", booking_url_id: "10" },
    { name: "성저테니스장", region: "고양시", booking_url_id: "goyang_city" },
    { name: "백석 환경시설 테니스장", region: "고양시", booking_url_id: "goyang_city" }
  ];

  console.log("고양시 코트 정보 삽입 중...");
  const { error } = await supabase.from('courts').insert(goyangCourts);
  if (error) {
    console.error("Error inserting courts:", error.message);
  } else {
    console.log("✅ 고양시 코트 12개 등록 완료");
  }

  console.log("--- 마이그레이션 완료 ---");
}

migrate();
