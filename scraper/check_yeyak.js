const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://yeyak.gys.or.kr/fmcs/27?referer=https%3A%2F%2Fgbc.gys.or.kr%2Fmember%2Flogin.php&login_check=skip')
  .then(res => {
    const $ = cheerio.load(res.data);
    $('form').each((i, f) => {
      console.log('Action:', $(f).attr('action'));
      console.log('Inputs:', $(f).find('input').map((j, el) => $(el).attr('name')).get());
    });
  })
  .catch(e => console.error(e));
