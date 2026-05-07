const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://gbc.gys.or.kr:446/member/login.php')
  .then(res => {
    const $ = cheerio.load(res.data);
    $('form').each((i, f) => {
      console.log('Action:', $(f).attr('action'));
      console.log('Inputs:', $(f).find('input').map((j, el) => $(el).attr('name')).get());
    });
  })
  .catch(e => console.error(e));
