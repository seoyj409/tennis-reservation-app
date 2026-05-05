-- 1. 코트 정보 테이블
CREATE TABLE IF NOT EXISTS courts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region VARCHAR(50) NOT NULL, -- e.g., '고양시', '용인시', '김포시', '강서구', '마포구'
    name VARCHAR(100) NOT NULL,
    url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 예약 가능 정보 테이블
CREATE TABLE IF NOT EXISTS reservations_available (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    court_id UUID REFERENCES courts(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    last_checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(court_id, date, time_slot)
);

-- 기존 데이터가 있다면 덮어쓰거나 무시하기 위한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations_available(date);
CREATE INDEX IF NOT EXISTS idx_reservations_court ON reservations_available(court_id);

-- 기본 코트 데이터 삽입 예시 (추후 크롤러가 자동으로 넣거나 수동 관리)
-- INSERT INTO courts (region, name, url) VALUES ('고양시', '성저테니스장', 'https://...');
