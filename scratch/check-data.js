const fetch = require('node-fetch');

async function check() {
  const res = await fetch('http://localhost:3000/api/data?type=admin');
  const d = await res.json();
  const emmanuel = d.leadersData.find(l => String(l['Team Leader']).includes('Emmanuel Nwadike'));
  console.log(emmanuel);
}

check();
