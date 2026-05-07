require('dotenv').config();
const axios = require('axios');


const id = process.env.GYS_USER_ID;
const pw = process.env.GYS_USER_PW;

async function testLogin() {
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
      console.log('Cookies:', cookies);
    }
    
    if (cookies.length === 0) {
      console.error('Login failed, no cookies returned.');
      return;
    }

    const htmlRes = await axios.get('https://daehwa.gys.or.kr:451/rent/tennis_condition.php?nyear=2026&nmonth=05&nday=&part_nm=%BC%BA%C0%FA%C5%D7%B4%CF%BD%BA%C0%E5&pay_opt=&account_no=&tel=031-929-4868&part_hp_no=031-929-4868&toMail=&place_opt=2&year=2026&month=05', {
      headers: {
        'Cookie': cookies.join('; ')
      }
    });

    const fs = require('fs');
    fs.writeFileSync('temp_seongjeo.html', htmlRes.data);
    console.log('Saved to temp_seongjeo.html');

  } catch (err) {
    console.error(err.message);
  }
}

testLogin();
