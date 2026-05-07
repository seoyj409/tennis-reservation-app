const axios = require('axios');
const cheerio = require('cheerio');

axios.get('https://www.gytennis.or.kr/daily/5/2026-05-08')
  .then(res => {
    const $ = cheerio.load(res.data);
    $('.wholeTable .innerCustom').first().find('.resTag').each((i, el) => {
      console.log('Slot', i, $(el).html().trim());
    });
  })
  .catch(e => console.error(e));
