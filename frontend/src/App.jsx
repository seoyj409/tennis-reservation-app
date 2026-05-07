import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STANDARD_SLOTS = [
  "06:00~08:00", "08:00~10:00", "10:00~12:00", "12:00~14:00",
  "14:00~16:00", "16:00~18:00", "18:00~20:00", "20:00~22:00"
];

const REGIONS = ["고양시"];

// 날짜 유틸리티
const getFormattedDate = (daysAdd = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAdd);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return {
    value: `${yyyy}-${mm}-${dd}`,
    label: daysAdd === 0 ? '오늘' : daysAdd === 1 ? '내일' : daysAdd === 2 ? '모레' : '',
    fullLabel: `${yyyy}-${mm}-${dd} (${dayName})`
  };
};

function CourtCard({ court, activeDate, isFav, toggleFavorite, onBookingRedirect }) {
  const dateSlots = court.slotsByDate[activeDate] || {};
  const subCourts = court.allSubCourts.length > 0 ? court.allSubCourts : ["코트"];
  
  const [activeSubCourt, setActiveSubCourt] = useState(subCourts[0] || "");

  // Sync activeSubCourt if the list changes
  useEffect(() => {
    if (!subCourts.includes(activeSubCourt)) {
      setActiveSubCourt(subCourts[0] || "");
    }
  }, [subCourts, activeSubCourt]);

  const availableSlotCount = Object.keys(dateSlots).length;

  return (
    <div className="court-card">
      <div className="court-header">
        <div className="court-title-area">
          <div className="court-name-wrapper">
            <span 
              className="court-name" 
              style={{ cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => onBookingRedirect(court)}
              title="예약 페이지로 이동"
            >
              {court.name}
            </span>
            <button className={`btn-fav ${isFav ? 'active' : ''}`} onClick={() => toggleFavorite(court.id)}>
              {isFav ? '★' : '☆'}
            </button>
          </div>
          <div className={`avail-count ${availableSlotCount > 0 ? 'has-slots' : ''}`}>
            {availableSlotCount}개 타임 가능
          </div>
        </div>
        <span className="region-badge">{court.region}</span>
      </div>

      {subCourts.length > 0 && subCourts[0] !== "코트" && (
        <div className="sub-court-tabs">
          {subCourts.map(sc => (
            <div 
              key={sc} 
              className={`sub-court-tab ${activeSubCourt === sc ? 'active' : ''}`}
              onClick={() => setActiveSubCourt(sc)}
            >
              {sc}
            </div>
          ))}
        </div>
      )}

      <div className="slot-grid">
        {STANDARD_SLOTS.map(slotTime => {
          const subCourtsForSlot = dateSlots[slotTime] || [];
          const isOpen = subCourtsForSlot.includes(activeSubCourt) || (activeSubCourt === "코트" && subCourtsForSlot.length > 0);
          const startTime = slotTime.split('~')[0];

          return (
            <div 
              key={slotTime} 
              className={`slot ${isOpen ? 'open' : 'booked'}`}
              onClick={() => isOpen && onBookingRedirect(court)}
            >
              <span className="slot-time">{startTime}</span>
              <span>{isOpen ? '예약가능' : '마감'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States
  const [activeTab, setActiveTab] = useState('고양시');
  const [dates, setDates] = useState([getFormattedDate(0), getFormattedDate(1), getFormattedDate(2)]);
  const [activeDate, setActiveDate] = useState(dates[0].value);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Favorites
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('tennis_favorites');
    return saved ? JSON.parse(saved) : [];
  });
  
  // Toast
  const [toastMsg, setToastMsg] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. 모든 코트 가져오기
      const { data: courtsData, error: cError } = await supabase.from('courts').select('*');
      if (cError) throw cError;

      // 2. 예약 가능 데이터 가져오기
      const { data: reservations, error: rError } = await supabase
        .from('reservations_available')
        .select('*')
        .eq('status', 'AVAILABLE');
      if (rError) throw rError;

      // 데이터 병합 (코트 -> 날짜 -> 시간 -> 세부 코트 리스트)
      const merged = courtsData.map(c => {
        const courtReservations = reservations.filter(r => r.court_id === c.id);
        
        const slotsByDate = {};
        const subCourtsSet = new Set();

        courtReservations.forEach(r => {
          if (!slotsByDate[r.date]) slotsByDate[r.date] = {};
          if (!slotsByDate[r.date][r.time_slot]) slotsByDate[r.date][r.time_slot] = [];
          slotsByDate[r.date][r.time_slot].push(r.sub_court_name);
          subCourtsSet.add(r.sub_court_name);
        });

        // 서브코트 목록 정렬
        const allSubCourts = Array.from(subCourtsSet).sort();

        return { ...c, slotsByDate, allSubCourts };
      });

      setCourts(merged);
      
      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // 5 minutes auto-refresh
    return () => clearInterval(interval);
  }, []);

  // 즐겨찾기 저장
  useEffect(() => {
    localStorage.setItem('tennis_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (courtId) => {
    setFavorites(prev => 
      prev.includes(courtId) ? prev.filter(id => id !== courtId) : [...prev, courtId]
    );
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleBookingRedirect = (court) => {
    let url = "";
    if (court.name.includes("성저테니스장")) {
      url = "https://daehwa.gys.or.kr:451/rent/tennis_condition.php?part_nm=%BC%BA%C0%FA%C5%D7%B4%CF%BD%BA%C0%E5";
    } else if (court.booking_url_id === 'goyang_city') {
      url = "https://www.goyang.go.kr/resve/index.do";
    } else {
      url = `https://www.gytennis.or.kr/daily/${court.booking_url_id}/${activeDate}`;
    }
    window.open(url, '_blank');
  };

  // 렌더링용 필터링 및 정렬 데이터 (즐겨찾기 우선)
  const filteredCourts = useMemo(() => {
    let list = courts.filter(c => c.region === activeTab);
    list.sort((a, b) => {
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.id < b.id ? -1 : 1; // ID 기준으로 안정적인 정렬 유지
    });
    return list;
  }, [courts, activeTab, favorites]);

  // 해당 지역 탭에 초록점(예약가능)이 있는지 판별
  const hasOpenSlot = (region) => {
    let targetCourts = courts.filter(c => c.region === region);
    return targetCourts.some(c => {
      const dateSlots = c.slotsByDate[activeDate] || {};
      return Object.keys(dateSlots).length > 0;
    });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="top-bar">
        <h1>🎾 테니스장 예약 현황</h1>
        <div className="top-actions">
          <div className="date-selector">
            {dates.map(d => (
              <button 
                key={d.value}
                className={`date-btn ${activeDate === d.value ? 'active' : ''}`}
                onClick={() => setActiveDate(d.value)}
              >
                {d.label}
              </button>
            ))}
            <input 
              type="date" 
              style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0 8px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              value={activeDate}
              onChange={(e) => {
                if (e.target.value) {
                  setActiveDate(e.target.value);
                }
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <button className="btn-refresh" onClick={fetchData} disabled={loading}>
              {loading ? <div className="spinner"></div> : '🔄'} 갱신
            </button>
            {lastSyncTime && <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>마지막 동기화: {lastSyncTime}</div>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="region-tabs">
        {REGIONS.map(r => {
          const isActive = activeTab === r;
          const showDot = hasOpenSlot(r);
          
          return (
            <div 
              key={r} 
              className={`rtab ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(r)}
            >
              {!isActive && showDot && <span className="dot"></span>}
              {r}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-slot-open-bg)', border: '1px solid var(--color-slot-open-border)' }}></div> 예약 가능
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--color-slot-booked-bg)' }}></div> 예약 완료
        </div>
      </div>

      {/* Content Grid */}
      {loading && courts.length === 0 ? (
        <div className="loading-state">
          <div className="spinner" style={{ width: '40px', height: '40px' }}></div>
          <p>데이터를 불러오는 중입니다...</p>
        </div>
      ) : (
        <div className="court-grid">
          {filteredCourts.length === 0 ? (
            <div className="empty-msg">해당 조건에 맞는 코트가 없습니다.</div>
          ) : (
            filteredCourts.map(court => (
              <CourtCard 
                key={court.id} 
                court={court} 
                activeDate={activeDate} 
                isFav={favorites.includes(court.id)} 
                toggleFavorite={toggleFavorite} 
                onBookingRedirect={handleBookingRedirect}
              />
            ))
          )}
        </div>
      )}

      {/* Toast Portal */}
      <div className="toast-container">
        {toastMsg && (
          <div className="toast">
            {toastMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
