const fetch = require('node-fetch');

async function test() {
  const payload = {
    action: 'admin_report',
    payload: {
      day: 'Day_26',
      updates: { 'Emmanuel Nwadike': true }, // a leader who was likely evicted
      reflection: undefined,
      currentDayNum: 26,
      evictionThreshold: 5
    }
  };

  const res = await fetch('http://localhost:3001/api/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  
  if (!res.ok) {
    const text = await res.text();
    console.error('Error:', res.status, text);
  } else {
    console.log('Success:', await res.json());
  }
}

test();
