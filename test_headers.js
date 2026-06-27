const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n');
env.forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v) process.env[k] = v.join('=').trim().replace(/^"|"$/g, '');
});
const { getDatabase } = require('./src/lib/googleSheets.js');

async function run() {
  try {
    const db = await getDatabase();
    const sheet = db.sheetsByTitle['Tracker_Data'];
    await sheet.loadHeaderRow();
    console.log('Grid bounds:', sheet.columnCount);
    const newH = [...sheet.headerValues];
    if (!newH.includes('TEST_DAY')) {
      newH.push('TEST_DAY');
      if (newH.length > sheet.columnCount) {
        await sheet.resize({ rowCount: sheet.rowCount, columnCount: newH.length + 5 });
        console.log('Resized sheet to', newH.length + 5);
      }
      await sheet.setHeaderRow(newH);
      console.log('Added header TEST_DAY');
    }
  } catch (e) {
    console.error(e);
  }
}
run();
