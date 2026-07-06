require('dotenv').config({ path: '.env.local' });
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const https = require('https');

const originalRequest = https.request;
https.request = function(options, ...args) {
  if (options.headers) {
    delete options.headers['accept-encoding'];
    delete options.headers['Accept-Encoding'];
  }
  return originalRequest.call(this, options, ...args);
};

async function run() {
  const serviceAccountAuth = new JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.file'],
  });

  const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);
  await doc.loadInfo();

  const leadersSheet = doc.sheetsByTitle["Leaders_Tracker_Data"];
  await leadersSheet.loadHeaderRow();
  console.log("Leaders headers:", leadersSheet.headerValues.slice(0, 5));
  const rows = await leadersSheet.getRows();
  console.log("Leaders row 1:", rows[0] ? rows[0].toObject() : "No rows");
}

run().then(() => process.exit(0)).catch(console.error);
