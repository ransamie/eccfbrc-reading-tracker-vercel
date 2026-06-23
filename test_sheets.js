const https = require('https');
const originalRequest = https.request;
https.request = function(options, ...args) {
  if (options.headers) {
    delete options.headers['accept-encoding'];
    delete options.headers['Accept-Encoding'];
  }
  return originalRequest.call(this, options, ...args);
};
require('dns').setDefaultResultOrder('ipv4first');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

async function test() {
  try {
    const serviceAccountAuth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
    });

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    console.log("Sheet ID:", SHEET_ID);
    console.log("Email:", process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    console.log("Key Starts with:", process.env.GOOGLE_PRIVATE_KEY.substring(0, 30));
    console.log("Key Ends with:", process.env.GOOGLE_PRIVATE_KEY.substring(process.env.GOOGLE_PRIVATE_KEY.length - 30));
    
    const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
    console.log("Loading info...");
    await doc.loadInfo();
    console.log("Title:", doc.title);
    
    const settingsSheet = doc.sheetsByTitle["Global_Settings"];
    const rows = await settingsSheet.getRows();
    console.log("Settings rows:", rows.length);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
