const fs = require('fs');
const content = fs.readFileSync('src/app/api/update/route.js', 'utf8');

const updated = content.replace(/if \(action === 'admin_report'\) \{[\s\S]*?return NextResponse\.json\(\{ success: true \}\);\s*\}/, `if (action === 'admin_report') {
      const { day, updates, reflection, currentDayNum: globalCurrentDayNum, evictionThreshold } = payload;
      const leadersSheet = db.sheetsByTitle["Leaders_Tracker_Data"];
      
      const currentDayNum = parseInt(day.split('_')[1] || 1);
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

      let hasUpdates = false;

      // Process updates first
      for (const row of rows) {
        const rowName = String(row.get('Team Leader') || row.get('Name') || row.get('Member_Name') || '').trim();
        if (updates[rowName] !== undefined) {
           const dayCell = leadersSheet.getCell(row.rowNumber - 1, dayColIndex);
           if (String(dayCell.value || '').toUpperCase() !== String(updates[rowName]).toUpperCase() && dayCell.value !== updates[rowName]) {
              dayCell.value = updates[rowName] ? 'TRUE' : 'FALSE';
              hasUpdates = true;
           }
        }
        if (updates[rowName]) {
           for (let pastD = 1; pastD < currentDayNum; pastD++) {
              const pastColIndex = leadersSheet.headerValues.indexOf(\`Day_\${pastD}\`);
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
                    const pastColIndex = leadersSheet.headerValues.indexOf(\`Day_\${pastD}\`);
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
    }`);

fs.writeFileSync('src/app/api/update/route.js', updated, 'utf8');
console.log("Replaced successfully!");
