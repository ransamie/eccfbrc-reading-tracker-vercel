import { NextResponse } from 'next/server';
import { getDatabase, fetchGlobalData, invalidateCache, archiveAndResetChallenge, getActiveTrackerSheet, getActiveLeadersSheet } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

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
        await trackerSheet.addRows(members);
      }

      // 4. Write team credentials with generated 4-digit PINs
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      if (credsSheet) {
        await credsSheet.loadHeaderRow();
        await credsSheet.addRows(credentials);
      }

      // 5. Write Leaders_Tracker_Data with Leaders & Assistants
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      if (leadersSheet) {
        await leadersSheet.loadHeaderRow();
        const ldHeaders = leadersSheet.headerValues;
        const neededCols = ['Team Leader', 'Status', 'Team', 'Assistant', 'Leader_Phone', 'Assistant_Phone'];
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
        await leadersSheet.addRows(leaders);
      }

      invalidateCache();
      return NextResponse.json({ success: true, memberCount: members.length, teamCount: credentials.length });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, message: `Server Error: ${error.message}` }, { status: 500 });
  }
}
