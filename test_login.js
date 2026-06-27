async function testLogin() {
  const res = await fetch('http://localhost:3001/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginType: 'Team Leader', teamName: 'Divine 🤍✨', pin: '8492' })
  });
  console.log("Login Status:", res.status);
  console.log("Login Body:", await res.text());
}
testLogin();
