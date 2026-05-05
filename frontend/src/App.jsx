import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedRegion, setSelectedRegion] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch available reservations along with court details
      const { data: reservations, error: rError } = await supabase
        .from('reservations_available')
        .select(`
          id, date, time_slot, status, last_checked_at,
          courts ( id, region, name, url )
        `)
        .eq('status', 'AVAILABLE')
        .order('date', { ascending: true })
        .order('time_slot', { ascending: true });

      if (rError) throw rError;

      // Group by Court ID
      const grouped = reservations.reduce((acc, curr) => {
        const court = curr.courts;
        if (!acc[court.id]) {
          acc[court.id] = {
            ...court,
            slots: {}
          };
        }
        
        if (!acc[court.id].slots[curr.date]) {
          acc[court.id].slots[curr.date] = [];
        }
        
        acc[court.id].slots[curr.date].push(curr);
        return acc;
      }, {});

      setData(Object.values(grouped));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter data
  const filteredData = data.filter(court => {
    if (selectedRegion !== 'ALL' && court.region !== selectedRegion) return false;
    
    // If date is selected, we only show the court if it has slots on that date
    if (selectedDate) {
      return Object.keys(court.slots).includes(selectedDate);
    }
    
    return true;
  });

  const regions = ['ALL', '고양시', '용인시', '김포시', '강서구', '마포구'];

  return (
    <div className="app-container">
      <header className="header">
        <h1>🎾 시립 테니스장 예약 현황</h1>
        <button className="btn-refresh" onClick={fetchData} disabled={loading}>
          {loading ? '새로고침 중...' : '🔄 데이터 갱신'}
        </button>
      </header>

      <div className="filters-section fade-in">
        <div className="filter-group">
          <label htmlFor="regionFilter">지역 필터</label>
          <select 
            id="regionFilter" 
            value={selectedRegion} 
            onChange={(e) => setSelectedRegion(e.target.value)}
          >
            {regions.map(r => (
              <option key={r} value={r}>{r === 'ALL' ? '전체 지역' : r}</option>
            ))}
          </select>
        </div>
        
        <div className="filter-group">
          <label htmlFor="dateFilter">날짜 필터</label>
          <input 
            type="date" 
            id="dateFilter" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="empty-state">
          <h3>데이터를 불러오지 못했습니다.</h3>
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>예약 가능한 코트를 찾고 있습니다...</p>
        </div>
      ) : (
        <div className="courts-grid">
          {filteredData.length === 0 ? (
            <div className="empty-state fade-in" style={{ gridColumn: '1 / -1' }}>
              <h3>😭 빈자리가 없습니다</h3>
              <p>현재 예약 가능한 테니스장이 없습니다. 나중에 다시 확인해주세요.</p>
            </div>
          ) : (
            filteredData.map(court => (
              <div key={court.id} className="court-card fade-in">
                <div className="court-header">
                  <div>
                    <span className="badge-region">{court.region}</span>
                    <h3>{court.name}</h3>
                  </div>
                  <a href={court.url} target="_blank" rel="noreferrer" className="court-link">
                    예약하러 가기 ↗
                  </a>
                </div>
                
                <div className="slots-container">
                  {Object.entries(court.slots).map(([date, slots]) => {
                    // Filter slots by selected date if one is selected
                    if (selectedDate && date !== selectedDate) return null;
                    
                    return (
                      <div key={date} className="date-group">
                        <div className="date-title">
                          📅 {date}
                        </div>
                        <div className="time-slots">
                          {slots.map(slot => (
                            <div key={slot.id} className="time-slot" title={`마지막 확인: ${new Date(slot.last_checked_at).toLocaleString()}`}>
                              {slot.time_slot}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default App;
