const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://daehwa.gys.or.kr:451/member/login.php').then(r => {
  const $ = cheerio.load(r.data);
  $('form').each((i, el) => {
    console.log('Action:', $(el).attr('action'));
    $(el).find('input').each((j, inEl) => {
      console.log('  ', $(inEl).attr('name'), $(inEl).attr('type'), $(inEl).attr('value'));
    });
  });
}).catch(e => console.error(e));
