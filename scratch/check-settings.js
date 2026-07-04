const { GoogleSpreadsheet } = require('google-spreadsheet');

async function test() {
  const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!SHEET_ID) {
    console.log("No credentials loaded");
    return;
  }

  const doc = new GoogleSpreadsheet(SHEET_ID, {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  });

  await doc.loadInfo();
  
  const settingsSheet = doc.sheetsByTitle["Global_Settings"];
  const rows = await settingsSheet.getRows();
  rows.forEach(r => {
    console.log(r.get('Setting_Key'), ':', r.get('Setting_Value'));
  });
}

require('dotenv').config({ path: '.env.local' });
test();
