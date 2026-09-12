import { NextResponse } from 'next/server';
import { getDatabase, fetchGlobalData, invalidateCache, archiveAndResetChallenge, getActiveTrackerSheet, getActiveLeadersSheet } from '@/lib/googleSheets';
import { formatTeamName } from '@/lib/teamUtils';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

const sanitizePhoneForSheets = (val) => {
  if (val === null || val === undefined) return "";
  let text = String(val).trim();
  if (["none", "nan", "n/a", ""].includes(text.toLowerCase())) return "";
  // Strip leading +, =, @ or spaces to prevent Google Sheets formula evaluation (#ERROR!)
  text = text.replace(/^[+=@]+/, "").trim();
  // Strip .0 float artifacts from Excel
  if (text.endsWith(".0")) {
    text = text.slice(0, -2);
  }
  let digits = text.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = "234" + digits.slice(1);
  } else if (digits.length === 10 && ["7", "8", "9"].includes(digits[0])) {
    digits = "234" + digits;
  }
  return digits;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    const db = await getDatabase();

    if (action === 'admin_switch_global_edition') {
      const { editionId } = payload;
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const rows = await settingsSheet.getRows();
      let found = false;
      for (const row of rows) {
        if (row.get('Setting_Key') === 'Active_Edition_Id') {
          row.set('Setting_Value', editionId || 'live');
          await row.save();
          found = true;
          break;
        }
      }
      if (!found) {
        await settingsSheet.addRow({ Setting_Key: 'Active_Edition_Id', Setting_Value: editionId || 'live' });
      }
      invalidateCache();
      return NextResponse.json({ success: true, activeEditionId: editionId || 'live' });
    }

    if (action === 'admin_toggle_leader_reporting') {
      const { allowLeaderReporting } = payload;
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const rows = await settingsSheet.getRows();
      const valToSave = String(allowLeaderReporting).toUpperCase() === 'TRUE' || allowLeaderReporting === true ? 'TRUE' : 'FALSE';
      let found = false;
      for (const row of rows) {
        if (row.get('Setting_Key') === 'Allow_Leader_Reporting') {
          row.set('Setting_Value', valToSave);
          await row.save();
          found = true;
          break;
        }
      }
      if (!found) {
        await settingsSheet.addRow({ Setting_Key: 'Allow_Leader_Reporting', Setting_Value: valToSave });
      }
      invalidateCache();
      return NextResponse.json({ success: true, allowLeaderReporting: valToSave });
    }

    if (action === 'leader_report') {
      const { team, day, updates, leaderUpdates, reflection, currentDayNum, evictionThreshold } = payload;
      
      const globalData = await fetchGlobalData();
      const allowLeaderReporting = String(globalData.settings?.['Allow_Leader_Reporting'] ?? 'TRUE').trim().toUpperCase() !== 'FALSE';
      if (!allowLeaderReporting) {
        return NextResponse.json({ 
          success: false, 
          error: "Team leader reporting has been paused by the Global Administrator. You cannot submit or save updates at this time." 
        }, { status: 403 });
      }

      const mornStart = globalData.settings['Morning_Window_Start'] || "04:00 AM";
      const mornEnd = globalData.settings['Morning_Window_End'] || "11:00 AM";
      const eveStart = globalData.settings['Evening_Window_Start'] || "06:00 PM";
      const eveEnd = globalData.settings['Evening_Window_End'] || "11:00 PM";

      const to24 = (t12) => {
        const match = String(t12).match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return "00:00";
        let [_, h, m, mod] = match;
        if (h === '12') h = '00';
        if (mod.toUpperCase() === 'PM') h = parseInt(h, 10) + 12;
        return `${String(h).padStart(2, '0')}:${m}`;
      };

      const now = new Date();
      const watOptions = { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false };
      const watTimeStr = new Intl.DateTimeFormat('en-GB', watOptions).format(now);
      
      const inMorn = watTimeStr >= to24(mornStart) && watTimeStr <= to24(mornEnd);
      const inEve = watTimeStr >= to24(eveStart) && watTimeStr <= to24(eveEnd);

      const isHistoricalOrArchive = globalData.isArchive || (globalData.settings?.Active_Edition_Id && globalData.settings?.Active_Edition_Id !== 'live');
      const editingDayNum = parseInt(day.split('_')[1] || 1);
      const isPastDay = editingDayNum < (currentDayNum || 1);

      if (!isHistoricalOrArchive && !isPastDay && !inMorn && !inEve) {
          return NextResponse.json({ success: false, error: `Reporting is closed. The daily windows are ${mornStart} - ${mornEnd} and ${eveStart} - ${eveEnd}.` }, { status: 400 });
      }
      
      const trackerSheet = await getActiveTrackerSheet(db);
      await trackerSheet.loadHeaderRow();
      
      const totalDays = parseInt(globalData.settings?.Total_Days || 0);
      let targetDayNum = editingDayNum;
      if (totalDays > 0 && targetDayNum > totalDays) {
        targetDayNum = totalDays;
      }
      
      let headersChanged = false;
      const currentHeaders = [...trackerSheet.headerValues];
      
      for (let i = 1; i <= targetDayNum; i++) {
        const dStr = `Day_${i}`;
        if (!currentHeaders.includes(dStr)) {
          currentHeaders.push(dStr);
          headersChanged = true;
        }
      }
      
      if (!currentHeaders.includes(day) && (totalDays === 0 || parseInt(day.split('_')[1] || 1) <= totalDays)) {
        currentHeaders.push(day);
        headersChanged = true;
      }
      
      if (headersChanged) {
        if (currentHeaders.length > trackerSheet.columnCount) {
          await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: currentHeaders.length + 5 });
        }
        await trackerSheet.setHeaderRow(currentHeaders);
      }
      
      const rows = await trackerSheet.getRows();

      // Calculate rounds for eviction logic
      const daysPerRound = 10;
      const completedRounds = Math.floor((currentDayNum - 1) / daysPerRound);
      const rowsToSave = [];

      for (const row of rows) {
        const rowTeam = normalizeTeamName(row.get('Team_Name') || row.get('Team'));
        const rowName = String(row.get('Member_Name') || '').trim();

        if (rowTeam === normalizeTeamName(team)) {
          let rowChanged = false;

          // If updates exist for this user, apply them
          if (row.get('Status') === 'Active' && updates && updates[rowName] !== undefined) {
             const newVal = updates[rowName] ? 'TRUE' : 'FALSE';
             if (String(row.get(day) || '').toUpperCase() !== newVal) {
               row.set(day, newVal);
               rowChanged = true;
             }
             if (updates[rowName]) {
               const dayIndex = parseInt(day.split('_')[1] || 1);
               for (let pastD = 1; pastD < dayIndex; pastD++) {
                 const pastDStr = `Day_${pastD}`;
                 if (String(row.get(pastDStr) || '').toUpperCase() !== 'TRUE') {
                   row.set(pastDStr, 'TRUE');
                   rowChanged = true;
                 }
               }
             }
          }

          // Evaluate Evictions if active
          if (row.get('Status') === 'Active' && completedRounds > 0 && evictionThreshold) {
            for (let r = 1; r <= completedRounds; r++) {
              let missedDaysCount = 0;
              const prevRoundEnd = r * daysPerRound;
              const prevRoundStart = prevRoundEnd - daysPerRound + 1;
              for (let pastD = prevRoundStart; pastD <= prevRoundEnd; pastD++) {
                 const checkDay = `Day_${pastD}`;
                 const val = String(row.get(checkDay) || '').toUpperCase();
                 if (val === 'FALSE' || val === '') {
                    missedDaysCount++;
                 }
              }
              if (missedDaysCount > parseInt(evictionThreshold)) {
                 if (row.get('Status') !== 'Evicted') {
                   row.set('Status', 'Evicted');
                   rowChanged = true;
                 }
                 break;
              }
            }
          }

          if (rowChanged) {
            rowsToSave.push(row);
          }
        }
      }

      // Save only modified rows
      for (const r of rowsToSave) {
        await r.save();
      }

      // Save leader updates if provided
      if (leaderUpdates && Object.keys(leaderUpdates).length > 0) {
        try {
          const leadersSheet = await getActiveLeadersSheet(db);
          if (leadersSheet) {
            await leadersSheet.loadHeaderRow();
            const ldHeaders = [...leadersSheet.headerValues];
            let ldHeadersChanged = false;
            if (!ldHeaders.includes(day) && (totalDays === 0 || parseInt(day.split('_')[1] || 1) <= totalDays)) {
              ldHeaders.push(day);
              ldHeadersChanged = true;
            }
            if (ldHeadersChanged) {
              if (ldHeaders.length > leadersSheet.columnCount) {
                await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: ldHeaders.length + 5 });
              }
              await leadersSheet.setHeaderRow(ldHeaders);
              await leadersSheet.loadHeaderRow();
            }

            const ldRows = await leadersSheet.getRows();
            const ldRowsToSave = [];
            for (const row of ldRows) {
              const rowTeam = normalizeTeamName(row.get('Team') || row.get('Team_Name') || row.get('Team Leader Team Name'));
              const rowLeaderName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
              if (rowTeam === normalizeTeamName(team) && leaderUpdates[rowLeaderName] !== undefined) {
                const newVal = leaderUpdates[rowLeaderName] ? 'TRUE' : 'FALSE';
                if (String(row.get(day) || '').toUpperCase() !== newVal) {
                  row.set(day, newVal);
                  if (leaderUpdates[rowLeaderName]) {
                    const dayIndex = parseInt(day.split('_')[1] || 1);
                    for (let pastD = 1; pastD < dayIndex; pastD++) {
                      const pastDStr = `Day_${pastD}`;
                      if (String(row.get(pastDStr) || '').toUpperCase() !== 'TRUE') {
                        row.set(pastDStr, 'TRUE');
                      }
                    }
                  }
                  ldRowsToSave.push(row);
                }
              }
            }
            for (const r of ldRowsToSave) {
              await r.save();
            }
          }
        } catch (lErr) {
          console.error("Error updating leaders sheet from leader report:", lErr);
        }
      }

      // Save reflection if provided and changed
      if (reflection) {
        const credsSheet = db.sheetsByTitle["Team_Credentials"];
        if (credsSheet) {
          const credsRows = await credsSheet.getRows();
          for (const cRow of credsRows) {
            if (normalizeTeamName(cRow.get('Team_Name')) === normalizeTeamName(team)) {
              if (cRow.get('Current_Reflection') !== reflection) {
                cRow.set('Current_Reflection', reflection);
                await cRow.save();
              }
              break;
            }
          }
        }
      }

      invalidateCache();
      return NextResponse.json({ success: true });
    }
    
    if (action === 'leader_update_roster') {
      const { team, rosterUpdates } = payload;
      // rosterUpdates: { "Member_Name": "Left" }
      const trackerSheet = await getActiveTrackerSheet(db);
      const rows = await trackerSheet.getRows();
      
      const rowsToSave = [];
      for (const row of rows) {
        const rowTeam = normalizeTeamName(row.get('Team_Name') || row.get('Team'));
        const rowName = String(row.get('Member_Name') || '').trim();
        if (rowTeam === normalizeTeamName(team) && rosterUpdates[rowName] && row.get('Status') !== rosterUpdates[rowName]) {
          row.set('Status', rosterUpdates[rowName]);
          rowsToSave.push(row);
        }
      }
      for (const r of rowsToSave) {
        await r.save();
      }
      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_report') {
      const { day, updates, reflection, currentDayNum: globalCurrentDayNum, evictionThreshold } = payload;
      const leadersSheet = await getActiveLeadersSheet(db);
      
      const globalData = await fetchGlobalData();
      const totalDays = parseInt(globalData.settings?.Total_Days || 0);
      let currentDayNum = parseInt(day.split('_')[1] || 1);
      if (totalDays > 0 && currentDayNum > totalDays) {
        currentDayNum = totalDays;
      }
      const daysPerRound = 10;
      const completedRounds = Math.floor(((globalCurrentDayNum || 1) - 1) / daysPerRound);
      
      // Save Admin Reflection
      if (reflection !== undefined) {
        const settingsSheet = db.sheetsByTitle["Global_Settings"];
        const settingsRows = await settingsSheet.getRows();
        let found = false;
        for (const row of settingsRows) {
          if (row.get('Setting_Key') === 'Admin_Reflection') {
            if (row.get('Setting_Value') !== reflection) {
              row.set('Setting_Value', reflection);
              await row.save();
            }
            found = true;
            break;
          }
        }
        if (!found) {
          await settingsSheet.addRow({ Setting_Key: 'Admin_Reflection', Setting_Value: reflection });
        }
      }

      await leadersSheet.loadHeaderRow();
      
      let headersChanged = false;
      const currentHeaders = [...leadersSheet.headerValues];
      
      for (let i = 1; i <= currentDayNum; i++) {
        const dStr = `Day_${i}`;
        if (!currentHeaders.includes(dStr)) {
          currentHeaders.push(dStr);
          headersChanged = true;
        }
      }
      
      if (!currentHeaders.includes(day) && (totalDays === 0 || parseInt(day.split('_')[1] || 1) <= totalDays)) {
        currentHeaders.push(day);
        headersChanged = true;
      }
      
      if (headersChanged) {
        if (currentHeaders.length > leadersSheet.columnCount) {
          await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: currentHeaders.length + 5 });
        }
        await leadersSheet.setHeaderRow(currentHeaders);
        await leadersSheet.loadHeaderRow(); // Reload to update headerValues correctly
      }
      
      const rows = await leadersSheet.getRows();
      const rowsToSave = [];

      // Process updates and evictions
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        const currentStatus = String(row.get('Status') || '').trim().toLowerCase();
        let rowChanged = false;

        if (rowName && updates && updates[rowName] !== undefined && currentStatus === 'active') {
          const newVal = updates[rowName] ? 'TRUE' : 'FALSE';
          if (String(row.get(day) || '').toUpperCase() !== newVal) {
            row.set(day, newVal);
            rowChanged = true;
          }

          if (updates[rowName]) {
            const editingDayNum = parseInt(day.split('_')[1] || 1);
            for (let pastD = 1; pastD < editingDayNum; pastD++) {
              const pastDStr = `Day_${pastD}`;
              if (String(row.get(pastDStr) || '').toUpperCase() !== 'TRUE') {
                row.set(pastDStr, 'TRUE');
                rowChanged = true;
              }
            }
          }
        }

        // Evaluate evictions for leaders
        if (currentStatus === 'active' && completedRounds > 0 && evictionThreshold) {
          for (let r = 1; r <= completedRounds; r++) {
            let missedDaysCount = 0;
            const prevRoundEnd = r * daysPerRound;
            const prevRoundStart = prevRoundEnd - daysPerRound + 1;
            for (let pastD = prevRoundStart; pastD <= prevRoundEnd; pastD++) {
              const checkDay = `Day_${pastD}`;
              const val = String(row.get(checkDay) || '').toUpperCase();
              if (val === 'FALSE' || val === '') {
                missedDaysCount++;
              }
            }
            if (missedDaysCount > parseInt(evictionThreshold)) {
              if (row.get('Status') !== 'Evicted') {
                row.set('Status', 'Evicted');
                rowChanged = true;
              }
              break;
            }
          }
        }

        if (rowChanged) {
          rowsToSave.push(row);
        }
      }

      for (const r of rowsToSave) {
        await r.save();
      }

      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_update_roster') {
      const { rosterUpdates } = payload;
      const leadersSheet = await getActiveLeadersSheet(db);
      const rows = await leadersSheet.getRows();
      
      const rowsToSave = [];
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        if (rosterUpdates[rowName] && row.get('Status') !== rosterUpdates[rowName]) {
          row.set('Status', rosterUpdates[rowName]);
          rowsToSave.push(row);
        }
      }
      for (const r of rowsToSave) {
        await r.save();
      }
      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_settings') {
      const { 
        currentRound, 
        evictionThreshold, 
        Morning_Window_Start, 
        Morning_Window_End, 
        Evening_Window_Start, 
        Evening_Window_End,
        Challenge_Name,
        Challenge_Edition,
        Total_Days,
        Start_Date,
        Allow_Leader_Reporting
      } = payload;
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const rows = await settingsSheet.getRows();
      
      const keysToUpdate = {
        'Current_Round': currentRound,
        'Eviction_Threshold': evictionThreshold,
        'Morning_Window_Start': Morning_Window_Start,
        'Morning_Window_End': Morning_Window_End,
        'Evening_Window_Start': Evening_Window_Start,
        'Evening_Window_End': Evening_Window_End,
        'Challenge_Name': Challenge_Name,
        'Challenge_Edition': Challenge_Edition,
        'Total_Days': Total_Days,
        'Start_Date': Start_Date,
        ...(Allow_Leader_Reporting !== undefined ? { 'Allow_Leader_Reporting': String(Allow_Leader_Reporting).toUpperCase() === 'TRUE' || Allow_Leader_Reporting === true ? 'TRUE' : 'FALSE' } : {})
      };

      const foundKeys = new Set();
      for (const row of rows) {
        const key = row.get('Setting_Key');
        if (keysToUpdate[key] !== undefined) {
          row.set('Setting_Value', keysToUpdate[key]);
          await row.save();
          foundKeys.add(key);
        }
      }
      
      for (const [key, val] of Object.entries(keysToUpdate)) {
         if (!foundKeys.has(key) && val !== undefined) {
            await settingsSheet.addRow({ Setting_Key: key, Setting_Value: val });
         }
      }

      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_add_team') {
      const { newTeamName, newTeamPin } = payload;
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      await credsSheet.addRow({ Team_Name: newTeamName, PIN: newTeamPin, Current_Reflection: '' });
      invalidateCache();
      return NextResponse.json({ success: true });
    }
    
    if (action === 'admin_update_pin') {
      const { team, newPin } = payload;
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      const rows = await credsSheet.getRows();
      for (const row of rows) {
        if (normalizeTeamName(row.get('Team_Name')) === normalizeTeamName(team)) {
           row.set('PIN', newPin);
           await row.save();
           break;
        }
      }
      invalidateCache();
      return NextResponse.json({ success: true });
    }
    
    if (action === 'admin_update_super_pin') {
      const { newPin } = payload;
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const rows = await settingsSheet.getRows();
      
      let found = false;
      for (const row of rows) {
        if (row.get('Setting_Key') === 'ADMIN_PIN') {
          row.set('Setting_Value', newPin);
          await row.save();
          found = true;
          break;
        }
      }
      
      if (!found) {
        await settingsSheet.addRow({ Setting_Key: 'ADMIN_PIN', Setting_Value: newPin });
      }
      
      invalidateCache();
      return NextResponse.json({ success: true });
    }
    
    if (action === 'admin_rename_team') {
      const { oldTeamName, newTeamName } = payload;
      const promises = [];
      
      // Update Credentials
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      const credRows = await credsSheet.getRows();
      for (const row of credRows) {
        if (normalizeTeamName(row.get('Team_Name')) === normalizeTeamName(oldTeamName)) {
           row.set('Team_Name', newTeamName);
           await row.save();
        }
      }
      
      // Update Tracker Data
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      const trRows = await trackerSheet.getRows();
      for (const row of trRows) {
        if (normalizeTeamName(row.get('Team_Name')) === normalizeTeamName(oldTeamName)) {
           row.set('Team_Name', newTeamName);
           await row.save();
        }
      }
      
      // Update Leaders Tracker Data
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      const ldRows = await leadersSheet.getRows();
      for (const row of ldRows) {
        const rowTeam = normalizeTeamName(row.get('Team') || row.get('Team_Name'));
        if (rowTeam === normalizeTeamName(oldTeamName)) {
           if (row.get('Team') !== undefined) row.set('Team', newTeamName);
           if (row.get('Team_Name') !== undefined) row.set('Team_Name', newTeamName);
           await row.save();
        }
      }
      invalidateCache();
      return NextResponse.json({ success: true });
    }
    
    if (action === 'admin_delete_team') {
      const { teamName } = payload;
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      if (credsSheet) {
        const rows = await credsSheet.getRows();
        for (const row of rows) {
          if (normalizeTeamName(row.get('Team_Name')) === normalizeTeamName(teamName)) {
            await row.delete();
            break;
          }
        }
      }
      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_bulk_upload') {
      const { members } = payload; // Array of { Team_Name, Member_Name, WhatsApp_Number }
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      // Pre-fill Status as Active
      const newRows = members.map(m => ({ ...m, Status: 'Active' }));
      await trackerSheet.addRows(newRows);

      // Auto-register any new teams in Team_Credentials if they don't already exist
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      if (credsSheet) {
        const credRows = await credsSheet.getRows();
        const existingTeams = new Set(credRows.map(r => normalizeTeamName(r.get('Team_Name'))));
        const uniqueUploadedTeams = Array.from(new Set(members.map(m => String(m.Team_Name || '').trim()).filter(Boolean)));
        
        for (const t of uniqueUploadedTeams) {
          if (!existingTeams.has(normalizeTeamName(t))) {
            await credsSheet.addRow({ Team_Name: t.toUpperCase(), PIN: '1234', Current_Reflection: '' });
            existingTeams.add(normalizeTeamName(t));
          }
        }
      }

      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_archive_challenge') {
      const { newChallengeName, newEdition, newStartDate, newTotalDays } = payload;
      const result = await archiveAndResetChallenge({
        newChallengeName,
        newEdition,
        newStartDate,
        newTotalDays
      });
      return NextResponse.json(result);
    }

    if (action === 'admin_launch_new_round') {
      const { mode, settings: newSettings, members, credentials, leaders } = payload;

      // 1. If fresh mode, archive current challenge and reset sheets
      if (mode === 'fresh') {
        await archiveAndResetChallenge({
          newChallengeName: newSettings.Challenge_Name,
          newEdition: newSettings.Challenge_Edition,
          newStartDate: newSettings.Start_Date,
          newTotalDays: newSettings.Total_Days
        });
        await db.loadInfo();
      }

      // 2. Update Global_Settings
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      if (settingsSheet) {
        const rows = await settingsSheet.getRows();
        const settingsMap = {
          'Challenge_Name': newSettings.Challenge_Name,
          'Challenge_Edition': newSettings.Challenge_Edition,
          'Start_Date': newSettings.Start_Date,
          'Total_Days': String(newSettings.Total_Days),
          'Morning_Window_Start': newSettings.Morning_Window_Start || "04:00 AM",
          'Morning_Window_End': newSettings.Morning_Window_End || "11:00 AM",
          'Evening_Window_Start': newSettings.Evening_Window_Start || "06:00 PM",
          'Evening_Window_End': newSettings.Evening_Window_End || "11:00 PM",
          'Current_Round': newSettings.Current_Round || "1",
          'Status': 'Active',
          'Is_Completed': 'FALSE',
          'Active_Edition_Id': 'live',
          'Allow_Leader_Reporting': 'TRUE'
        };

        const foundKeys = new Set();
        for (const row of rows) {
          const k = row.get('Setting_Key');
          if (settingsMap[k] !== undefined) {
            row.set('Setting_Value', String(settingsMap[k]));
            await row.save();
            foundKeys.add(k);
          }
        }
        for (const [k, v] of Object.entries(settingsMap)) {
          if (!foundKeys.has(k)) {
            await settingsSheet.addRow({ Setting_Key: k, Setting_Value: String(v) });
          }
        }
      }

      // 3. Write members to Tracker_Data
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      if (trackerSheet) {
        await trackerSheet.loadHeaderRow();
        const headers = trackerSheet.headerValues;
        if (!headers.includes('System_ID')) {
          const newH = [...headers, 'System_ID'];
          if (newH.length > trackerSheet.columnCount) {
            await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: newH.length + 5 });
          }
          await trackerSheet.setHeaderRow(newH);
        }
        // Sanitize phone numbers to pure digits so Google Sheets never interprets + as a formula
        const sanitizedMembers = (members || []).map(m => ({
          ...m,
          WhatsApp_Number: sanitizePhoneForSheets(m.WhatsApp_Number)
        }));
        await trackerSheet.addRows(sanitizedMembers);
      }

      // 4. Write team credentials with generated 4-digit PINs
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      if (credsSheet) {
        await credsSheet.loadHeaderRow();
        await credsSheet.addRows(credentials);
      }

      // 5. Write Leaders_Tracker_Data with Leaders & Assistants (with sanitized phones & Assistant_Status)
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      if (leadersSheet) {
        await leadersSheet.loadHeaderRow();
        const ldHeaders = leadersSheet.headerValues;
        const neededCols = ['Team Leader', 'Role', 'Status', 'Team', 'Assistant', 'Assistant_Status', 'Leader_Phone', 'Assistant_Phone'];
        let updatedCols = [...ldHeaders];
        let needsHeaderUpdate = false;
        neededCols.forEach(col => {
          if (!updatedCols.includes(col)) {
            updatedCols.push(col);
            needsHeaderUpdate = true;
          }
        });
        if (needsHeaderUpdate) {
          if (updatedCols.length > leadersSheet.columnCount) {
            await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: updatedCols.length + 5 });
          }
          await leadersSheet.setHeaderRow(updatedCols);
        }

        const sanitizedLeaders = (leaders || []).map(l => ({
          "Team Leader": l["Team Leader"] || l.leaderName || "",
          Role: l.Role || "Team Leader",
          Status: l.Status || "Active",
          Team: l.Team || l.Team_Name || l.teamName || "",
          Assistant: l.Assistant || l.assistantName || "",
          Assistant_Status: l.Assistant_Status || (l.Assistant || l.assistantName ? "Active" : ""),
          Leader_Phone: sanitizePhoneForSheets(l.Leader_Phone || l['Leader Phone'] || l.leaderPhone),
          Assistant_Phone: sanitizePhoneForSheets(l.Assistant_Phone || l['Assistant Phone'] || l.assistantPhone)
        }));

        await leadersSheet.addRows(sanitizedLeaders);
      }

      invalidateCache();
      return NextResponse.json({ success: true, memberCount: members.length, teamCount: credentials.length });
    }

    if (action === 'admin_sync_member_names') {
      const { memberUpdates } = payload; // Array of { phone, fullName }
      if (!memberUpdates || !Array.isArray(memberUpdates) || memberUpdates.length === 0) {
        return NextResponse.json({ success: false, message: 'No member updates provided' }, { status: 400 });
      }

      const phoneMap = new Map();
      memberUpdates.forEach(u => {
        const cleanP = sanitizePhoneForSheets(u.phone);
        const nameClean = String(u.fullName || '').trim();
        if (cleanP && nameClean) {
          phoneMap.set(cleanP, nameClean);
        }
      });

      if (phoneMap.size === 0) {
        return NextResponse.json({ success: false, message: 'No valid phone-name pairs found to sync' }, { status: 400 });
      }

      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      if (!trackerSheet) {
        return NextResponse.json({ success: false, message: 'Tracker_Data sheet not found' }, { status: 404 });
      }

      await trackerSheet.loadHeaderRow();
      const headers = trackerSheet.headerValues;
      const nameColIdx = headers.indexOf('Member_Name');
      const phoneColIdx = headers.indexOf('WhatsApp_Number');

      if (nameColIdx === -1 || phoneColIdx === -1) {
        return NextResponse.json({ 
          success: false, 
          message: 'Required columns (Member_Name, WhatsApp_Number) not found in Tracker_Data' 
        }, { status: 400 });
      }

      const rows = await trackerSheet.getRows();
      if (rows.length === 0) {
        return NextResponse.json({ success: true, updatedCount: 0, message: 'Tracker_Data has no rows' });
      }

      // Load all relevant cells for fast atomic batch saving
      const totalRowCount = rows.length + 1; // 1-indexed (row 0 is headers)
      await trackerSheet.loadCells({
        startRowIndex: 1,
        endRowIndex: totalRowCount,
        startColumnIndex: 0,
        endColumnIndex: headers.length
      });

      let updatedCount = 0;
      for (let r = 1; r < totalRowCount; r++) {
        const phoneCell = trackerSheet.getCell(r, phoneColIdx);
        const cellPhoneClean = sanitizePhoneForSheets(phoneCell.value);
        if (cellPhoneClean && phoneMap.has(cellPhoneClean)) {
          const newName = phoneMap.get(cellPhoneClean);
          const nameCell = trackerSheet.getCell(r, nameColIdx);
          if (String(nameCell.value || '').trim() !== newName) {
            nameCell.value = newName;
            updatedCount++;
          }
        }
      }

      if (updatedCount > 0) {
        await trackerSheet.saveUpdatedCells();
      }

      invalidateCache();
      return NextResponse.json({ 
        success: true, 
        updatedCount, 
        totalProcessed: rows.length, 
        matchedCount: phoneMap.size 
      });
    }

    if (action === 'admin_add_member') {
      const { fullName, phone, team } = payload || {};

      const cleanName = String(fullName || '').trim();
      if (!cleanName || cleanName.length < 2) {
        return NextResponse.json({ success: false, message: 'Please provide a valid participant name (at least 2 characters).' }, { status: 400 });
      }

      const cleanPhone = sanitizePhoneForSheets(phone);
      if (!cleanPhone || cleanPhone.length < 7) {
        return NextResponse.json({ success: false, message: 'Please provide a valid WhatsApp phone number.' }, { status: 400 });
      }

      const trackerSheet = await getActiveTrackerSheet(db);
      if (!trackerSheet) {
        return NextResponse.json({ success: false, message: 'Active Tracker sheet not found.' }, { status: 404 });
      }

      await trackerSheet.loadHeaderRow();
      const currentHeaders = [...trackerSheet.headerValues];
      if (!currentHeaders.includes('System_ID')) {
        currentHeaders.push('System_ID');
        if (currentHeaders.length > trackerSheet.columnCount) {
          await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: currentHeaders.length + 5 });
        }
        await trackerSheet.setHeaderRow(currentHeaders);
      }

      const existingRows = await trackerSheet.getRows();

      // Check for duplicate phone
      const duplicate = existingRows.find(r => sanitizePhoneForSheets(r.get('WhatsApp_Number')) === cleanPhone);
      if (duplicate) {
        const dupName = duplicate.get('Member_Name');
        const dupTeam = duplicate.get('Team_Name') || duplicate.get('Team');
        return NextResponse.json({ 
          success: false, 
          message: `Phone number ${cleanPhone} is already registered under ${dupName} in ${dupTeam}.` 
        }, { status: 400 });
      }

      // 1. Gather all active teams & PINs
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      let allTeams = [];
      const teamPinMap = new Map();
      if (credsSheet) {
        const credRows = await credsSheet.getRows();
        credRows.forEach(r => {
          const tName = String(r.get('Team_Name') || r.get('Team') || '').trim();
          if (tName && tName.toLowerCase() !== 'admin') {
            allTeams.push(tName);
            teamPinMap.set(normalizeTeamName(tName), String(r.get('PIN') || '1234').trim());
          }
        });
      }

      if (allTeams.length === 0) {
        const uniqueFromTracker = Array.from(new Set(
          existingRows.map(r => String(r.get('Team_Name') || r.get('Team') || '').trim()).filter(Boolean)
        ));
        allTeams = uniqueFromTracker;
      }

      if (allTeams.length === 0) {
        allTeams = ['Team 01'];
      }

      // 2. Determine target team
      let assignedTeam = '';
      if (team && String(team).trim().toLowerCase() !== 'auto') {
        const reqNorm = normalizeTeamName(team);
        const match = allTeams.find(t => normalizeTeamName(t) === reqNorm);
        assignedTeam = match || team.trim();
      } else {
        // Calculate member counts per team and auto-assign to team with fewest members
        const counts = {};
        allTeams.forEach(t => { counts[t] = 0; });

        existingRows.forEach(r => {
          const rTeam = String(r.get('Team_Name') || r.get('Team') || '').trim();
          for (const t of allTeams) {
            if (normalizeTeamName(t) === normalizeTeamName(rTeam)) {
              counts[t] = (counts[t] || 0) + 1;
              break;
            }
          }
        });

        // Pick team with lowest count, tie-breaker: natural alphanumeric sort
        const sortedTeams = [...allTeams].sort((a, b) => {
          const countDiff = (counts[a] || 0) - (counts[b] || 0);
          if (countDiff !== 0) return countDiff;
          return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
        });

        assignedTeam = sortedTeams[0];
      }

      // 3. Generate sequential System_ID
      let prefix = "ECCFBRC";
      let maxSeq = 0;
      const idRegex = /^([A-Za-z0-9_-]+)-(\d+)$/;
      existingRows.forEach(r => {
        const sid = String(r.get('System_ID') || '').trim();
        const m = sid.match(idRegex);
        if (m) {
          prefix = m[1];
          const num = parseInt(m[2], 10);
          if (num > maxSeq) maxSeq = num;
        }
      });

      if (maxSeq === 0) {
        maxSeq = existingRows.length;
      }

      const nextSeq = maxSeq + 1;
      const padLength = Math.max(3, String(nextSeq).length);
      const generatedSystemId = `${prefix}-${String(nextSeq).padStart(padLength, '0')}`;

      // 4. Add row to Tracker_Data
      const newMemberRow = {
        Team_Name: assignedTeam,
        Member_Name: cleanName,
        WhatsApp_Number: cleanPhone,
        Status: 'Active',
        System_ID: generatedSystemId
      };

      await trackerSheet.addRow(newMemberRow);

      // 5. Build the updated Team Leader WhatsApp message
      const globalData = await fetchGlobalData();
      const editionTitle = globalData.settings?.Challenge_Edition || globalData.settings?.Challenge_Name || "ECCF Bible Reading Challenge";
      const pin = teamPinMap.get(normalizeTeamName(assignedTeam)) || "1234";

      // Fetch leader & assistant info for assignedTeam
      let leaderName = "";
      let leaderPhone = "";
      let assistantName = "";
      let assistantPhone = "";

      const leadersSheet = await getActiveLeadersSheet(db);
      if (leadersSheet) {
        const ldRows = await leadersSheet.getRows();
        const normAssigned = normalizeTeamName(assignedTeam);
        for (const row of ldRows) {
          const rTeam = normalizeTeamName(row.get('Team') || row.get('Team_Name'));
          if (rTeam === normAssigned) {
            const role = String(row.get('Role') || '').trim().toLowerCase();
            const isAsst = role.includes('asst') || role.includes('assistant');
            const rowLeaderCol = String(row.get('Team Leader') || row.get('Name') || '').trim();
            const rowLeaderPhone = sanitizePhoneForSheets(row.get('Leader_Phone') || row.get('Leader Phone') || row.get('Phone'));
            const rowAsstCol = String(row.get('Assistant') || '').trim();
            const rowAsstPhone = sanitizePhoneForSheets(row.get('Assistant_Phone'));

            if (isAsst) {
              assistantName = rowLeaderCol || assistantName;
              assistantPhone = rowLeaderPhone || assistantPhone;
            } else {
              leaderName = rowLeaderCol || leaderName;
              leaderPhone = rowLeaderPhone || leaderPhone;
              if (rowAsstCol) assistantName = rowAsstCol;
              if (rowAsstPhone) assistantPhone = rowAsstPhone;
            }
          }
        }
      }

      // Collect all members in assigned team including the new one
      const assignedMembers = [];
      existingRows.forEach(r => {
        const rTeam = normalizeTeamName(r.get('Team_Name') || r.get('Team'));
        if (rTeam === normalizeTeamName(assignedTeam)) {
          const p = sanitizePhoneForSheets(r.get('WhatsApp_Number'));
          if (p) assignedMembers.push(p);
        }
      });
      // Add the new member's phone
      assignedMembers.push(cleanPhone);

      const leaderDisplay = leaderName || "[TEAM LEADER'S NAME]";
      const leaderWaLink = leaderPhone ? `https://wa.me/${leaderPhone}` : "https://wa.me/";
      const assistantWaLink = assistantPhone ? `https://wa.me/${assistantPhone}` : "https://wa.me/";
      const assistantText = assistantName 
        ? `${assistantName} [${assistantWaLink}]`
        : "[ASSISTANT NAME] [https://wa.me/]";

      const membersList = assignedMembers.map((p, idx) => `${idx + 1}. https://wa.me/${p}`).join("\n");
      const displayTeamFormatted = formatTeamName(assignedTeam);

      const messageText = 
        `Good Morning Dear ECCFBRC Team Leader. I believe you've already created your Group chat, and have added your Assistant, if not please do that as soon as possible, and then move on to send each of your members this message;\n\n` +
        `-----------------------------------------------------------\n` +
        `Hello!\n\n` +
        `I am ${leaderDisplay}, your Team Leader for ${displayTeamFormatted} in the ECCF Bible Reading Challenge (${editionTitle}).\n\n` +
        `I am reaching out to welcome you and to request your permission to add you to our team's group chat for mutual follow-up and accountability.\n\n` +
        `If you are happy to proceed, you can join the group directly using the invite link below:\n\n` +
        `[LINK TO TEAM GROUP CHAT]\n\n` +
        `I look forward to welcoming you to the team!\n` +
        `-----------------------------------------------------------\n` +
        `Ensure to replace the brackets with your actual details.\n\n` +
        `-----------------------------------------------------------\n` +
        `*${displayTeamFormatted}*\n` +
        `*Team Leader*: ${leaderDisplay} [${leaderWaLink}]\n` +
        `*Assistant*: ${assistantText}\n` +
        `*Team Login PIN*: ${pin}\n\n` +
        `*Members:*\n` +
        `${membersList}\n\n` +
        `Click their links to access their DMs and paste the edited message in each of them.\n` +
        `If you have any question, please feel free to ask.`;

      invalidateCache();

      return NextResponse.json({
        success: true,
        member: {
          name: cleanName,
          phone: cleanPhone,
          team: displayTeamFormatted,
          systemId: generatedSystemId,
          status: 'Active'
        },
        leaderInfo: {
          leaderName,
          leaderPhone,
          leaderWaLink,
          assistantName,
          assistantPhone,
          assistantWaLink,
          pin
        },
        updatedMessage: messageText,
        assignedTeam: displayTeamFormatted,
        totalTeamMembers: assignedMembers.length,
        message: `Successfully added ${cleanName} to ${displayTeamFormatted} (${generatedSystemId}).`
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, message: `Server Error: ${error.message}` }, { status: 500 });
  }
}
