const axios = require('axios');

async function testUpdate() {
  try {
    // Attempt Login
    const loginRes = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'charith.ddm@gmail.com',
      password: 'Admin@1234' // we don't know the password...
    });
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

testUpdate();
