import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';
import https from 'https';

// --- BUGFIX: Bypass Node 24 gzip premature close bug ---
const originalRequest = https.request;
https.request = function(options, ...args) {
  if (options.headers) {
    delete options.headers['accept-encoding'];
    delete options.headers['Accept-Encoding'];
  }
  return originalRequest.call(this, options, ...args);
};
// -------------------------------------------------------

const SHEET_ID = process.env.GOOGLE_SHEET_ID; // We need to add this to .env.local

// Initialize auth - see https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.file',
  ],
});

let docInstance = null;

export async function getDatabase() {
  if (docInstance) return docInstance;

  if (!SHEET_ID) {
    throw new Error("Missing GOOGLE_SHEET_ID environment variable.");
  }

  const doc = new GoogleSpreadsheet(SHEET_ID, serviceAccountAuth);
  await doc.loadInfo(); 
  docInstance = doc;
  return doc;
}

export async function fetchGlobalData() {
  const db = await getDatabase();
  
  const settingsSheet = db.sheetsByTitle["Global_Settings"];
  const trackerSheet = db.sheetsByTitle["Tracker_Data"];
  const credentialsSheet = db.sheetsByTitle["Team_Credentials"];

  const [settingsRows, trackerRows, credentialsRows] = await Promise.all([
    settingsSheet.getRows(),
    trackerSheet.getRows(),
    credentialsSheet.getRows()
  ]);

  // Parse Settings
  const settings = {};
  settingsRows.forEach(row => {
    if (row.get('Setting_Key')) {
      settings[row.get('Setting_Key')] = row.get('Setting_Value');
    }
  });

  // Parse Tracker Data
  const trackerData = trackerRows.map(row => row.toObject());

  // Parse Credentials
  const credentialsData = credentialsRows.map(row => row.toObject());
  const credentials = {};
  const validTeams = [];
  const teamReflections = {};

  credentialsData.forEach(row => {
    const teamName = String(row.Team_Name || '').trim();
    if (teamName) {
      credentials[teamName] = String(row.PIN || '').trim();
      validTeams.push(teamName);
      teamReflections[teamName] = String(row.Current_Reflection || '').trim();
    }
  });

  return {
    settings,
    trackerData,
    credentialsData,
    credentials,
    validTeams,
    teamReflections
  };
}

export async function fetchLeadersData() {
  const db = await getDatabase();
  const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
  const leadersRows = await leadersSheet.getRows();
  return leadersRows.map(row => row.toObject());
}
