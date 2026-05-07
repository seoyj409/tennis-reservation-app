require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');

const id = process.env.GYS_USER_ID;
const pw = process.env.GYS_USER_PW;

async function testBaekseok() {
  try {
    const loginUrl = 'https://daehwa.gys.or.kr:451/member/login_process.php';
    console.log('Logging in to:', loginUrl);
    
    const loginRes = await axios.post(loginUrl, 
      new URLSearchParams({id, pw, preURL: '/'}).toString(), 
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
    console.log('Cookies:', cookies);

    const dataUrl = 'https://gbc.gys.or.kr:446/rent/tennis_condition.php?place_opt=6&year=2026&month=05';
    
    const htmlRes = await axios.get(dataUrl, {
      headers: { 'Cookie': cookies.join('; ') }
    });
    
    const $ = cheerio.load(htmlRes.data);
    
    const options = $('select[name="place_opt"] option').map((i, el) => {
      return { val: $(el).attr('value'), text: $(el).text() };
    }).get();
    
    console.log('Place Options:', options);

    const sampleSlots = $('table.table tbody td li a').map((i, el) => $(el).text()).get().slice(0, 5);
    console.log('Sample Slots:', sampleSlots);
    
  } catch (err) {
    console.error(err.message);
  }
}

testBaekseok();
