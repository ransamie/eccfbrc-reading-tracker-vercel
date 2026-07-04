const fetch = require('node-fetch');

async function test() {
  const payload = {
    action: 'admin_report',
    payload: {
      day: 'Day_1',
      updates: { 'Ransom': true },
      reflection: 'Test reflection new',
      currentDayNum: 1,
      evictionThreshold: 5
    }
  };

  const res1 = await fetch('http://localhost:3000/api/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  console.log('Res1 ok?', res1.ok);

  const res2 = await fetch('http://localhost:3000/api/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res2.ok) {
    const text = await res2.text();
    console.error('Error on res2:', res2.status, text);
  } else {
    console.log('Success 2');
  }
}

test();
