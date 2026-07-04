const { GoogleSpreadsheet } = require('google-spreadsheet');

async function test() {
  const SHEET_ID = process.env.GOOGLE_SHEETS_ID;
  const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const doc = new GoogleSpreadsheet(SHEET_ID, {
    client_email: CLIENT_EMAIL,
    private_key: PRIVATE_KEY,
  });

  await doc.loadInfo();
  
  const settingsSheet = doc.sheetsByTitle["Global_Settings"];
  
  // NOTE: I am NOT calling settingsSheet.loadHeaderRow() here.
  // I am just calling getRows() like the API does.
  await settingsSheet.getRows();
  
  try {
    await settingsSheet.addRow({ Setting_Key: 'Test_Key_123', Setting_Value: 'Test' });
    console.log("addRow worked!");
  } catch (err) {
    console.error("addRow crashed!", err.message);
  }
}

require('dotenv').config({ path: '.env.local' });
test();
