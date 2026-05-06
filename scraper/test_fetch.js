const axios = require('axios');
axios.get('https://www.gytennis.or.kr/daily/1')
  .then(res => {
    console.log(res.data);
  })
  .catch(err => console.error(err));
