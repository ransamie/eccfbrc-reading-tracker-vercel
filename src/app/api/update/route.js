import { NextResponse } from 'next/server';
import { getDatabase, fetchGlobalData, invalidateCache } from '@/lib/googleSheets';

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
      
      const globalData = await fetchGlobalData();
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

      if (!inMorn && !inEve) {
          return NextResponse.json({ success: false, error: `Reporting is closed. The daily windows are ${mornStart} - ${mornEnd} and ${eveStart} - ${eveEnd}.` }, { status: 400 });
      }
      
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      await trackerSheet.loadHeaderRow();
      
      const totalDays = parseInt(globalData.settings?.Total_Days || 0);
      let editingDayNum = parseInt(day.split('_')[1] || 1);
      if (totalDays > 0 && editingDayNum > totalDays) {
        editingDayNum = totalDays;
      }
      
      let headersChanged = false;
      const currentHeaders = [...trackerSheet.headerValues];
      
      for (let i = 1; i <= editingDayNum; i++) {
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

      invalidateCache();
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
      invalidateCache();
      return NextResponse.json({ success: true });
    }

    if (action === 'admin_report') {
      const { day, updates, reflection, currentDayNum: globalCurrentDayNum, evictionThreshold } = payload;
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      
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
      
      const dayColIndex = leadersSheet.headerValues.indexOf(day);
      const statusColIndex = leadersSheet.headerValues.indexOf('Status');
      await leadersSheet.loadCells();
      const rows = await leadersSheet.getRows();

      let hasUpdates = false;

      // Process updates first
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        if (rowName && updates && updates[rowName] !== undefined) {
          const val = updates[rowName] ? 'TRUE' : 'FALSE';
          const rIndex = row.rowIndex - 1;
          
          if (dayColIndex !== -1) {
            const cell = leadersSheet.getCell(rIndex, dayColIndex);
            cell.value = val;
            hasUpdates = true;
          }
          
          if (updates[rowName]) {
            const editingDayNum = parseInt(day.split('_')[1] || 1);
            for (let pastD = 1; pastD < editingDayNum; pastD++) {
              const pastDStr = `Day_${pastD}`;
              const pastColIndex = leadersSheet.headerValues.indexOf(pastDStr);
              if (pastColIndex !== -1) {
                const pastCell = leadersSheet.getCell(rIndex, pastColIndex);
                if (String(pastCell.value || '').toUpperCase() !== 'TRUE') {
                  pastCell.value = 'TRUE';
                  hasUpdates = true;
                }
              }
            }
          }
        }
      }

      // Process eviction logic based on updated values
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        
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
                       const pastCell = leadersSheet.getCell(row.rowNumber - 1, pastColIndex);
                       try {
                          val = String(pastCell.value || '').toUpperCase();
                       } catch (e) {
                          val = 'TRUE';
                       }
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
      invalidateCache();
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
        Total_Days
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
        'Total_Days': Total_Days
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
    
    if (action === 'admin_bulk_upload') {
      const { members } = payload; // Array of { Team_Name, Member_Name, WhatsApp_Number }
      const trackerSheet = db.sheetsByTitle["Tracker_Data"];
      // Pre-fill Status as Active
      const newRows = members.map(m => ({ ...m, Status: 'Active' }));
      await trackerSheet.addRows(newRows);
      invalidateCache();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ success: false, message: `Server Error: ${error.message}` }, { status: 500 });
  }
}
