import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    const db = await getDatabase();

    if (action === 'leader_report') {
      const { team, day, updates, reflection, currentDayNum, evictionThreshold } = payload;
      
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const settingsRows = await settingsSheet.getRows();
      let mornStart = "04:00 AM", mornEnd = "11:00 AM", eveStart = "06:00 PM", eveEnd = "11:00 PM";
      for (const r of settingsRows) {
         if (r.get('Setting_Key') === 'Morning_Window_Start') mornStart = r.get('Setting_Value') || "04:00 AM";
         if (r.get('Setting_Key') === 'Morning_Window_End') mornEnd = r.get('Setting_Value') || "11:00 AM";
         if (r.get('Setting_Key') === 'Evening_Window_Start') eveStart = r.get('Setting_Value') || "06:00 PM";
         if (r.get('Setting_Key') === 'Evening_Window_End') eveEnd = r.get('Setting_Value') || "11:00 PM";
      }

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

      if (!inMorn && !inEve) {
          return NextResponse.json({ success: false, error: `Reporting is closed. The daily windows are ${mornStart} - ${mornEnd} and ${eveStart} - ${eveEnd}.` }, { status: 400 });
      }
      
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      await trackerSheet.loadHeaderRow();
      if (!trackerSheet.headerValues.includes(day)) {
        const newHeaders = [...trackerSheet.headerValues, day];
        if (newHeaders.length > trackerSheet.columnCount) {
          await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: newHeaders.length + 5 });
        }
        await trackerSheet.setHeaderRow(newHeaders);
      }
      
      const rows = await trackerSheet.getRows();

      const promises = [];
      
      // Calculate rounds for eviction logic
      const daysPerRound = 10;
      const completedRounds = Math.floor((currentDayNum - 1) / daysPerRound);

      for (const row of rows) {
        const rowTeam = normalizeTeamName(row.get('Team_Name'));
        const rowName = String(row.get('Member_Name') || '').trim();

        if (rowTeam === normalizeTeamName(team)) {
          // If updates exist for this user, apply them
          if (row.get('Status') === 'Active' && updates && updates[rowName] !== undefined) {
             row.set(day, updates[rowName] ? 'TRUE' : 'FALSE');
             if (updates[rowName]) {
               const editingDayNum = parseInt(day.split('_')[1] || 1);
               for (let pastD = 1; pastD < editingDayNum; pastD++) {
                 const pastDStr = `Day_${pastD}`;
                 if (String(row.get(pastDStr) || '').toUpperCase() !== 'TRUE') {
                   row.set(pastDStr, 'TRUE');
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
                 row.set('Status', 'Evicted');
                 break;
              }
            }
          }
          // We save if anything was updated (either the day's read status or eviction)
          await row.save();
        }
      }

      // Save reflection if today
      if (reflection) {
        const credsSheet = db.sheetsByTitle["Team_Credentials"];
        const credsRows = await credsSheet.getRows();
        for (const cRow of credsRows) {
          if (normalizeTeamName(cRow.get('Team_Name')) === normalizeTeamName(team)) {
            cRow.set('Current_Reflection', reflection);
            await cRow.save();
            break;
          }
        }
      }

      return NextResponse.json({ success: true });
    }
    
    if (action === 'leader_update_roster') {
      const { team, rosterUpdates } = payload;
      // rosterUpdates: { "Member_Name": "Left" }
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      const rows = await trackerSheet.getRows();
      
      const promises = [];
      for (const row of rows) {
        const rowTeam = normalizeTeamName(row.get('Team_Name'));
        const rowName = String(row.get('Member_Name') || '').trim();
        if (rowTeam === normalizeTeamName(team) && rosterUpdates[rowName]) {
          row.set('Status', rosterUpdates[rowName]);
          await row.save();
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_report') {
      const { day, updates, reflection, currentDayNum: globalCurrentDayNum, evictionThreshold } = payload;
      
      // Save Admin Reflection
      if (reflection !== undefined) {
        const settingsSheet = db.sheetsByTitle["Global_Settings"];
        const settingsRows = await settingsSheet.getRows();
        let found = false;
        for (const row of settingsRows) {
          if (row.get('Setting_Key') === 'Admin_Reflection') {
            row.set('Setting_Value', reflection);
            await row.save();
            found = true;
            break;
          }
        }
        if (!found) {
          await settingsSheet.addRow({ Setting_Key: 'Admin_Reflection', Setting_Value: reflection });
        }
      }

      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      await leadersSheet.loadHeaderRow();
      if (!leadersSheet.headerValues.includes(day)) {
        const newHeaders = [...leadersSheet.headerValues, day];
        if (newHeaders.length > leadersSheet.columnCount) {
          await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: newHeaders.length + 5 });
        }
        await leadersSheet.setHeaderRow(newHeaders);
        await leadersSheet.loadHeaderRow(); // Reload to update headerValues correctly
      }
      
      const dayColIndex = leadersSheet.headerValues.indexOf(day);
      const statusColIndex = leadersSheet.headerValues.indexOf('Status');
      await leadersSheet.loadCells();
      const rows = await leadersSheet.getRows();

      // Calculate rounds for eviction logic
      const daysPerRound = 10;
      const completedRounds = Math.floor(((globalCurrentDayNum || 1) - 1) / daysPerRound);

      let hasUpdates = false;
      const currentDayNum = parseInt(day.split('_')[1] || 1);
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        if (updates[rowName] !== undefined) {
          const cell = leadersSheet.getCell(row.rowNumber - 1, dayColIndex);
          const newVal = updates[rowName] ? 'TRUE' : 'FALSE';
          if (cell.value !== newVal) {
            cell.value = newVal;
            hasUpdates = true;
          }
          if (updates[rowName]) {
             for (let pastD = 1; pastD < currentDayNum; pastD++) {
                const pastColIndex = leadersSheet.headerValues.indexOf(`Day_${pastD}`);
                if (pastColIndex !== -1) {
                   const pastCell = leadersSheet.getCell(row.rowNumber - 1, pastColIndex);
                   if (String(pastCell.value || '').toUpperCase() !== 'TRUE' && pastCell.value !== true) {
                      pastCell.value = 'TRUE';
                      hasUpdates = true;
                   }
                }
             }
          }
        }
        
        // Evaluate Evictions if active
        if (statusColIndex !== -1 && completedRounds > 0 && evictionThreshold) {
           const statusCell = leadersSheet.getCell(row.rowNumber - 1, statusColIndex);
           if (String(statusCell.value || '').toLowerCase() === 'active') {
              for (let r = 1; r <= completedRounds; r++) {
                 let missedDaysCount = 0;
                 const prevRoundEnd = r * daysPerRound;
                 const prevRoundStart = prevRoundEnd - daysPerRound + 1;
                 for (let pastD = prevRoundStart; pastD <= prevRoundEnd; pastD++) {
                    const pastColIndex = leadersSheet.headerValues.indexOf(`Day_${pastD}`);
                    let val = 'FALSE';
                    if (pastColIndex !== -1) {
                       val = String(leadersSheet.getCell(row.rowNumber - 1, pastColIndex).value || '').toUpperCase();
                    }
                    if (val !== 'TRUE') {
                       missedDaysCount++;
                    }
                 }
                 if (missedDaysCount > parseInt(evictionThreshold)) {
                    statusCell.value = 'Evicted';
                    hasUpdates = true;
                    break;
                 }
              }
           }
        }
      }
      
      if (hasUpdates) {
        await leadersSheet.saveUpdatedCells();
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_update_roster') {
      const { rosterUpdates } = payload;
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      await leadersSheet.loadHeaderRow();
      const statusColIndex = leadersSheet.headerValues.indexOf('Status');
      if (statusColIndex === -1) return NextResponse.json({ success: true });
      await leadersSheet.loadCells();
      const rows = await leadersSheet.getRows();
      
      let hasUpdates = false;
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        if (rosterUpdates[rowName]) {
           const statusCell = leadersSheet.getCell(row.rowNumber - 1, statusColIndex);
           if (statusCell.value !== rosterUpdates[rowName]) {
              statusCell.value = rosterUpdates[rowName];
              hasUpdates = true;
           }
        }
      }
      if (hasUpdates) {
        await leadersSheet.saveUpdatedCells();
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_settings') {
      const { currentRound, evictionThreshold, Morning_Window_Start, Morning_Window_End, Evening_Window_Start, Evening_Window_End } = payload;
      const settingsSheet = db.sheetsByTitle["Global_Settings"];
      const rows = await settingsSheet.getRows();
      
      const keysToUpdate = {
        'Current_Round': currentRound,
        'Eviction_Threshold': evictionThreshold,
        'Morning_Window_Start': Morning_Window_Start,
        'Morning_Window_End': Morning_Window_End,
        'Evening_Window_Start': Evening_Window_Start,
        'Evening_Window_End': Evening_Window_End
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

      return NextResponse.json({ success: true });
    }

    if (action === 'admin_add_team') {
      const { newTeamName, newTeamPin } = payload;
      const credsSheet = db.sheetsByTitle["Team_Credentials"];
      await credsSheet.addRow({ Team_Name: newTeamName, PIN: newTeamPin, Current_Reflection: '' });
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
      return NextResponse.json({ success: true });
    }
    
    if (action === 'admin_bulk_upload') {
      const { members } = payload; // Array of { Team_Name, Member_Name, WhatsApp_Number }
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      // Pre-fill Status as Active
      const newRows = members.map(m => ({ ...m, Status: 'Active' }));
      await trackerSheet.addRows(newRows);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
