import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const STANDARD_SLOTS = [
  "06:00~08:00", "08:00~10:00", "10:00~12:00", "12:00~14:00",
  "14:00~16:00", "16:00~18:00", "18:00~20:00", "20:00~22:00"
];

const REGIONS = ["강서구", "마포구", "고양시", "용인시", "김포시"];

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

function App() {
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // States
  const [activeTab, setActiveTab] = useState('전체');
  const [dates, setDates] = useState([getFormattedDate(0), getFormattedDate(1), getFormattedDate(2)]);
  const [activeDate, setActiveDate] = useState(dates[0].value);
  
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

      // 데이터 병합
      const merged = courtsData.map(c => {
        const courtReservations = reservations.filter(r => r.court_id === c.id);
        
        // 날짜별로 슬롯 정리
        const slotsByDate = {};
        courtReservations.forEach(r => {
          if (!slotsByDate[r.date]) slotsByDate[r.date] = [];
          slotsByDate[r.date].push(r.time_slot);
        });

        return { ...c, slotsByDate };
      });

      setCourts(merged);
    } catch (err) {
      console.error('Error fetching data:', err);
      showToast('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const handleSlotClick = (url, courtName, slotTime) => {
    showToast(`${courtName} ${slotTime} 예약 페이지로 이동합니다`);
    setTimeout(() => { window.open(url || 'about:blank', '_blank'); }, 800);
  };

  // 렌더링용 필터링 데이터
  const filteredCourts = useMemo(() => {
    let result = courts;
    if (activeTab === '즐겨찾기') {
      result = courts.filter(c => favorites.includes(c.id));
    } else if (activeTab !== '전체') {
      result = courts.filter(c => c.region === activeTab);
    }
    return result;
  }, [courts, activeTab, favorites]);

  // 해당 지역 탭에 초록점(예약가능)이 있는지 판별
  const hasOpenSlot = (region) => {
    let targetCourts = courts;
    if (region === '즐겨찾기') targetCourts = courts.filter(c => favorites.includes(c.id));
    else if (region !== '전체') targetCourts = courts.filter(c => c.region === region);

    return targetCourts.some(c => {
      const openSlots = c.slotsByDate[activeDate] || [];
      return openSlots.length > 0;
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
                  // 날짜 배열에 없으면 추가 로직 (생략: 커스텀 날짜 선택용)
                }
              }}
            />
          </div>
          <button className="btn-refresh" onClick={fetchData} disabled={loading}>
            {loading ? <div className="spinner"></div> : '🔄'} 갱신
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="region-tabs">
        {['즐겨찾기', '전체', ...REGIONS].map(r => {
          const isActive = activeTab === r;
          const showDot = hasOpenSlot(r);
          const isFavTab = r === '즐겨찾기';
          
          return (
            <div 
              key={r} 
              className={`rtab ${isActive ? 'active' : ''} ${isFavTab ? 'favorite-tab' : ''}`}
              onClick={() => setActiveTab(r)}
            >
              {isFavTab && <span>★</span>}
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
            filteredCourts.map(court => {
              const openSlots = court.slotsByDate[activeDate] || [];
              const isFav = favorites.includes(court.id);
              
              return (
                <div key={court.id} className="court-card">
                  <div className="court-header">
                    <div className="court-title-area">
                      <div className="court-name-wrapper">
                        <span className="court-name">{court.name}</span>
                        <button className={`btn-fav ${isFav ? 'active' : ''}`} onClick={() => toggleFavorite(court.id)}>
                          {isFav ? '★' : '☆'}
                        </button>
                      </div>
                      <div className={`avail-count ${openSlots.length > 0 ? 'has-slots' : ''}`}>
                        {openSlots.length}개 슬롯 가능
                      </div>
                    </div>
                    <span className="region-badge">{court.region}</span>
                  </div>

                  <div className="slot-grid">
                    {STANDARD_SLOTS.map(slotTime => {
                      // 실제 예약가능 시간대에 포함되는지 확인 (더미데이터는 완전 일치하지 않을 수 있으므로 contains 검사)
                      const isOpen = openSlots.some(os => os.includes(slotTime) || slotTime.includes(os));
                      const startTime = slotTime.split('~')[0];

                      if (isOpen) {
                        return (
                          <div 
                            key={slotTime} 
                            className="slot open"
                            onClick={() => handleSlotClick(court.url, court.name, slotTime)}
                          >
                            <span className="slot-time">{startTime}</span>
                            <span>가능</span>
                          </div>
                        );
                      } else {
                        return (
                          <div key={slotTime} className="slot booked">
                            <span className="slot-time">{startTime}</span>
                            <span>마감</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                </div>
              );
            })
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
