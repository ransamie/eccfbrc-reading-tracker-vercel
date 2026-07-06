const { fetchGlobalData, fetchLeadersData } = require('./src/lib/googleSheets');

async function test() {
  const global = await fetchGlobalData();
  const leaders = await fetchLeadersData();
  
  console.log('Credentials Data:', global.credentialsData.slice(0, 2));
  console.log('Leaders Data:', leaders.slice(0, 2));
}

test().catch(console.error);
