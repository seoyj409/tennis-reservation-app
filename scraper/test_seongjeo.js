require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const id = process.env.GYS_USER_ID;
const pw = process.env.GYS_USER_PW;

const getFormattedDate = (daysAdd = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAdd);
    return d.toISOString().split('T')[0];
};

async function scrapeSeongjeoTest() {
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

    const courts = [
      { id: 'seongjeo_1', name: '성저테니스장', sub_court_name: '1 코트', place_opt: 2 },
      { id: 'seongjeo_1', name: '성저테니스장', sub_court_name: '2 코트', place_opt: 7 },
      { id: 'seongjeo_1', name: '성저테니스장', sub_court_name: '3 코트', place_opt: 8 },
      { id: 'seongjeo_1', name: '성저테니스장', sub_court_name: '4 코트', place_opt: 9 }
    ];

    const targetDates = [getFormattedDate(0), getFormattedDate(1), getFormattedDate(2)];
    const targetSet = new Set(targetDates); // 'YYYY-MM-DD'
    
    // Determine needed months
    const monthSet = new Set();
    targetDates.forEach(d => {
      const parts = d.split('-');
      monthSet.add(`${parts[0]}-${parts[1]}`);
    });

    const results = [];

    for (const court of courts) {
      for (const yyyymm of monthSet) {
        const [year, month] = yyyymm.split('-');
        
        const url = `https://daehwa.gys.or.kr:451/rent/tennis_condition.php?place_opt=${court.place_opt}&year=${year}&month=${month}`;
        console.log('Fetching', url);
        
        const htmlRes = await axios.get(url, {
          headers: { 'Cookie': cookies.join('; ') }
        });
        
        const $ = cheerio.load(htmlRes.data);
        
        // Find tds
        $('table.table tbody td').each((i, td) => {
          const dayText = $(td).find('font').first().text().trim();
          if (!dayText) return;
          
          const dayNum = parseInt(dayText, 10);
          if (isNaN(dayNum)) return;
          
          const dateStr = `${year}-${month}-${String(dayNum).padStart(2, '0')}`;
          
          if (targetSet.has(dateStr)) {
            // Find available slots
            $(td).find('li a').each((j, a) => {
              const text = $(a).text(); // e.g. "08:00 - "
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
                  sub_court_name: court.sub_court_name,
                  status: 'AVAILABLE'
                });
              }
            });
          }
        });
      }
    }
    
    console.log(results);
  } catch (err) {
    console.error(err);
  }
}

scrapeSeongjeoTest();
