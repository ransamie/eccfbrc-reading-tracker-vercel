const fetch = require('node-fetch');

async function test() {
  const payload = {
    action: 'admin_report',
    payload: {
      day: 'Day_1',
      updates: { 'Ransom': true },
      reflection: 'SAME_REFLECTION',
      currentDayNum: 1,
      evictionThreshold: 5
    }
  };

  // Run once to set the value
  await fetch('http://localhost:3000/api/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  // Run again to see if row.save() crashes
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
