async function triggerLicensesAndEmails() {
  try {
    // 1. Attempt Login to get a token
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'charith.ddm@gmail.com', // fallback superadmin from seed
        password: 'password123'
      })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;

    // 2. Insert dummy licenses
    const expiry3Days = new Date();
    expiry3Days.setDate(expiry3Days.getDate() + 3);

    const res = await fetch('http://localhost:3000/api/v1/licenses', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        softwareName: 'AWS Enterprise Support (Dev)',
        vendor: 'Amazon Web Services',
        licenseKey: 'AWS-1234-5678-ABCD',
        purchaseDate: new Date('2024-01-01').toISOString().split('T')[0],
        expiryDate: expiry3Days.toISOString().split('T')[0],
        maxUsers: 50,
        contactEmail: 'it@company.com',
        category: 'Cloud Infrastructure'
      })
    });
    const resData = await res.json();
    console.log('Created license:', resData.softwareName);

  } catch (error) {
    console.error(error.message);
  }
}

triggerLicensesAndEmails();
