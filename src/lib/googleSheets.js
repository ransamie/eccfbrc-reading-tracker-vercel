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

let globalCache = { data: null, timestamp: 0 };
let leadersCache = { data: null, timestamp: 0 };
const CACHE_TTL = 15000; // 15 seconds

export function invalidateCache() {
  globalCache.timestamp = 0;
  leadersCache.timestamp = 0;
}

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
  if (globalCache.data && Date.now() - globalCache.timestamp < CACHE_TTL) {
    return globalCache.data;
  }

  const db = await getDatabase();
  
  const settingsSheet = db.sheetsByTitle["Global_Settings"];
  const trackerSheet = db.sheetsByTitle["Tracker_Data"];
  const credentialsSheet = db.sheetsByTitle["Team_Credentials"];

  const [settingsRows, trackerRows, credentialsRows] = await Promise.all([
    settingsSheet.getRows(),
    (async () => { await trackerSheet.loadHeaderRow(); return trackerSheet.getRows(); })(),
    credentialsSheet ? credentialsSheet.getRows() : Promise.resolve([])
  ]);

  // Parse Settings
  const settings = {};
  settingsRows.forEach(row => {
    if (row.get('Setting_Key')) {
      settings[row.get('Setting_Key')] = row.get('Setting_Value');
    }
  });

  const activeEditionId = settings['Active_Edition_Id'] || 'live';
  let isArchive = false;
  let archiveInfo = null;
  let finalTrackerRows = trackerRows;
  let finalCredentialsRows = credentialsRows;

  if (activeEditionId && activeEditionId !== 'live') {
    const archives = await fetchEditionsRegistry().catch(() => []);
    const targetArchive = archives.find(a => a.id === activeEditionId);
    if (targetArchive) {
      isArchive = true;
      archiveInfo = targetArchive;
      await db.loadInfo();
      const archTrackerSheet = db.sheetsByTitle[targetArchive.trackerSheetTitle];
      if (archTrackerSheet) {
        await archTrackerSheet.loadHeaderRow();
        finalTrackerRows = await archTrackerSheet.getRows();
      }
      if (targetArchive.credsSheetTitle && db.sheetsByTitle[targetArchive.credsSheetTitle]) {
        const archCredsSheet = db.sheetsByTitle[targetArchive.credsSheetTitle];
        finalCredentialsRows = await archCredsSheet.getRows();
      }

      settings['Challenge_Name'] = targetArchive.name || settings['Challenge_Name'];
      settings['Challenge_Edition'] = targetArchive.edition || settings['Challenge_Edition'];
      settings['Start_Date'] = targetArchive.startDate || settings['Start_Date'];
      settings['Total_Days'] = targetArchive.totalDays || settings['Total_Days'];
      settings['Is_Completed'] = 'TRUE';
      settings['Status'] = 'Completed';
    }
  }

  // Parse Tracker Data
  const trackerData = finalTrackerRows.map(row => row.toObject());

  // Parse Credentials
  const credentialsData = finalCredentialsRows.map(row => row.toObject());
  const credentials = {};
  const validTeams = [];
  const teamReflections = {};

  credentialsData.forEach(row => {
    const teamName = String(row.Team_Name || row.Team || '').trim();
    if (teamName) {
      credentials[teamName] = String(row.PIN || '1234').trim();
      validTeams.push(teamName);
      teamReflections[teamName] = String(row.Current_Reflection || '').trim();
    }
  });

  // If credentials list was empty (e.g. freshly archived or unlinked), extract teams from trackerData
  if (validTeams.length === 0 && trackerData.length > 0) {
    const uniqueTeams = Array.from(new Set(
      trackerData.map(r => String(r.Team_Name || r.Team || '').trim()).filter(Boolean)
    ));
    uniqueTeams.forEach(t => {
      credentials[t] = '1234';
      validTeams.push(t);
      teamReflections[t] = '';
    });
  }

  globalCache.data = {
    isArchive,
    archiveInfo,
    settings,
    trackerData,
    credentialsData,
    credentials,
    validTeams,
    teamReflections
  };
  globalCache.timestamp = Date.now();
  
  return globalCache.data;
}

export async function fetchLeadersData() {
  if (leadersCache.data && Date.now() - leadersCache.timestamp < CACHE_TTL) {
    return leadersCache.data;
  }

  const db = await getDatabase();
  const globalData = await fetchGlobalData();
  let leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];

  if (globalData?.isArchive && globalData?.archiveInfo?.leadersSheetTitle) {
    await db.loadInfo();
    const archLeadersSheet = db.sheetsByTitle[globalData.archiveInfo.leadersSheetTitle];
    if (archLeadersSheet) {
      leadersSheet = archLeadersSheet;
    }
  }

  if (!leadersSheet) {
    return [];
  }

  await leadersSheet.loadHeaderRow();
  const leadersRows = await leadersSheet.getRows();
  
  leadersCache.data = leadersRows.map(row => row.toObject());
  leadersCache.timestamp = Date.now();
  return leadersCache.data;
}

export async function getOrCreateArchivesSheet(db) {
  if (db.sheetsByTitle["Challenge_Archives"]) {
    return db.sheetsByTitle["Challenge_Archives"];
  }
  try {
    const newSheet = await db.addSheet({
      title: "Challenge_Archives",
      headerValues: ["id", "name", "edition", "startDate", "totalDays", "totalMembers", "trackerSheetTitle", "leadersSheetTitle", "credsSheetTitle", "archivedAt"]
    });
    return newSheet;
  } catch (err) {
    await db.loadInfo();
    return db.sheetsByTitle["Challenge_Archives"];
  }
}

export async function fetchEditionsRegistry() {
  const db = await getDatabase();
  const archivesSheet = await getOrCreateArchivesSheet(db);
  await archivesSheet.loadHeaderRow();
  const rows = await archivesSheet.getRows();
  
  const archives = rows.map(r => ({
    id: String(r.get('id') || '').trim(),
    name: String(r.get('name') || '').trim(),
    edition: String(r.get('edition') || '').trim(),
    startDate: String(r.get('startDate') || '').trim(),
    totalDays: String(r.get('totalDays') || '').trim(),
    totalMembers: String(r.get('totalMembers') || '').trim(),
    trackerSheetTitle: String(r.get('trackerSheetTitle') || '').trim(),
    leadersSheetTitle: String(r.get('leadersSheetTitle') || '').trim(),
    credsSheetTitle: String(r.get('credsSheetTitle') || '').trim(),
    archivedAt: String(r.get('archivedAt') || '').trim()
  })).filter(a => a.id && a.trackerSheetTitle);

  return archives.reverse(); // Newest archives first
}

export async function getActiveTrackerSheet(db) {
  const globalData = await fetchGlobalData();
  await db.loadInfo();
  if (globalData?.isArchive && globalData?.archiveInfo?.trackerSheetTitle) {
    const sheet = db.sheetsByTitle[globalData.archiveInfo.trackerSheetTitle];
    if (sheet) return sheet;
  }
  return db.sheetsByTitle["Tracker_Data"];
}

export async function getActiveLeadersSheet(db) {
  const globalData = await fetchGlobalData();
  await db.loadInfo();
  if (globalData?.isArchive && globalData?.archiveInfo?.leadersSheetTitle) {
    const sheet = db.sheetsByTitle[globalData.archiveInfo.leadersSheetTitle];
    if (sheet) return sheet;
  }
  return db.sheetsByTitle["Leaders_Tracker_Data"];
}

export async function fetchArchivedEditionData(archiveId) {
  const db = await getDatabase();
  const archives = await fetchEditionsRegistry();
  const targetArchive = archives.find(a => a.id === archiveId);

  if (!targetArchive) {
    throw new Error(`Archived edition with ID "${archiveId}" not found.`);
  }

  await db.loadInfo();
  const trackerSheet = db.sheetsByTitle[targetArchive.trackerSheetTitle];
  const leadersSheet = targetArchive.leadersSheetTitle ? db.sheetsByTitle[targetArchive.leadersSheetTitle] : null;

  if (!trackerSheet) {
    throw new Error(`Archived tracker sheet "${targetArchive.trackerSheetTitle}" was not found.`);
  }

  await trackerSheet.loadHeaderRow();
  const [trackerRows, leadersRows] = await Promise.all([
    trackerSheet.getRows(),
    leadersSheet ? (async () => { await leadersSheet.loadHeaderRow(); return leadersSheet.getRows(); })() : Promise.resolve([])
  ]);

  const trackerData = trackerRows.map(row => row.toObject());
  const leadersData = leadersRows ? leadersRows.map(row => row.toObject()) : [];

  const validTeams = Array.from(new Set(
    trackerData.map(r => String(r.Team_Name || r.Team || '').trim()).filter(Boolean)
  ));

  const archiveSettings = {
    Challenge_Name: targetArchive.name || "ECCF Bible Reading Challenge Tracker",
    Challenge_Edition: targetArchive.edition || "Archived Challenge",
    Start_Date: targetArchive.startDate || "",
    Total_Days: targetArchive.totalDays || "",
    Current_Round: "Completed",
    Is_Completed: "TRUE",
    Status: "Completed"
  };

  return {
    isArchive: true,
    archiveInfo: targetArchive,
    settings: archiveSettings,
    trackerData,
    leadersData,
    validTeams,
    teamReflection: ""
  };
}

export async function archiveAndResetChallenge({ newChallengeName, newEdition, newStartDate, newTotalDays }) {
  const db = await getDatabase();
  await db.loadInfo();

  const settingsSheet = db.sheetsByTitle["Global_Settings"];
  const trackerSheet = db.sheetsByTitle["Tracker_Data"];
  const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
  const credentialsSheet = db.sheetsByTitle["Team_Credentials"];

  if (!settingsSheet || !trackerSheet || !leadersSheet) {
    throw new Error("Core sheets missing from Google Spreadsheet.");
  }

  // 1. Read Current Challenge Settings & Stats
  const settingsRows = await settingsSheet.getRows();
  const currentSettings = {};
  settingsRows.forEach(r => {
    if (r.get('Setting_Key')) currentSettings[r.get('Setting_Key')] = r.get('Setting_Value');
  });

  await trackerSheet.loadHeaderRow();
  const currentTrackerRows = await trackerSheet.getRows();
  const totalMembers = currentTrackerRows.length;

  const currentEditionName = currentSettings['Challenge_Edition'] || currentSettings['Challenge_Name'] || 'Challenge';
  const cleanEditionSlug = String(currentEditionName).replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 30) || 'Edition';
  const timestampStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const randomSuffix = Math.floor(100 + Math.random() * 900);

  const trackerArchiveTitle = `Archive_Tracker_${cleanEditionSlug}_${timestampStr}_${randomSuffix}`.slice(0, 95);
  const leadersArchiveTitle = `Archive_Leaders_${cleanEditionSlug}_${timestampStr}_${randomSuffix}`.slice(0, 95);
  const credsArchiveTitle = `Archive_Creds_${cleanEditionSlug}_${timestampStr}_${randomSuffix}`.slice(0, 95);

  // 2. Duplicate Active Sheets for Permanent Archive
  await trackerSheet.duplicate({ title: trackerArchiveTitle });
  await leadersSheet.duplicate({ title: leadersArchiveTitle });
  if (credentialsSheet) {
    await credentialsSheet.duplicate({ title: credsArchiveTitle });
  }

  // 3. Register in Challenge_Archives sheet
  const archivesSheet = await getOrCreateArchivesSheet(db);
  const archiveId = `arch_${Date.now()}`;
  await archivesSheet.addRow({
    id: archiveId,
    name: currentSettings['Challenge_Name'] || "ECCF Bible Reading Challenge Tracker",
    edition: currentEditionName,
    startDate: currentSettings['Start_Date'] || "",
    totalDays: currentSettings['Total_Days'] || "",
    totalMembers: String(totalMembers),
    trackerSheetTitle: trackerArchiveTitle,
    leadersSheetTitle: leadersArchiveTitle,
    credsSheetTitle: credsArchiveTitle,
    archivedAt: new Date().toISOString()
  });

  // 4. Reset Active Tracker_Data to Clean Slate
  await trackerSheet.clearRows();
  await trackerSheet.setHeaderRow(['Team_Name', 'Member_Name', 'WhatsApp_Number', 'Status']);

  // 5. Reset Active Leaders_Tracker_Data to Clean Slate
  await leadersSheet.clearRows();
  await leadersSheet.setHeaderRow(['Team Leader', 'Status', 'Team']);

  // 6. Reset Team Credentials to Clean Slate (Blank slate for new edition teams)
  if (credentialsSheet) {
    await credentialsSheet.clearRows();
    await credentialsSheet.setHeaderRow(['Team_Name', 'PIN', 'Current_Reflection']);
  }

  // 7. Update Global Settings for the New Edition
  const newSettingsMap = {
    'Active_Edition_Id': 'live',
    'Challenge_Name': newChallengeName || currentSettings['Challenge_Name'] || "ECCF Bible Reading Challenge Tracker",
    'Challenge_Edition': newEdition || "📖 New Reading Edition",
    'Start_Date': newStartDate || new Date().toISOString().split('T')[0],
    'Total_Days': String(newTotalDays || "90"),
    'Current_Round': '1',
    'Admin_Reflection': '',
    'Is_Completed': 'FALSE',
    'Status': 'Active'
  };

  const foundKeys = new Set();
  for (const row of settingsRows) {
    const key = row.get('Setting_Key');
    if (newSettingsMap[key] !== undefined) {
      row.set('Setting_Value', newSettingsMap[key]);
      await row.save();
      foundKeys.add(key);
    }
  }
  for (const [key, val] of Object.entries(newSettingsMap)) {
    if (!foundKeys.has(key)) {
      await settingsSheet.addRow({ Setting_Key: key, Setting_Value: val });
    }
  }

  invalidateCache();
  return {
    success: true,
    archiveId,
    trackerArchiveTitle,
    leadersArchiveTitle,
    newEdition
  };
}
