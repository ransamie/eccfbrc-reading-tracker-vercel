const fs = require('fs');

const file = 'src/app/api/update/route.js';
let content = fs.readFileSync(file, 'utf8');

// Update leader_report header generation
content = content.replace(
  `        if (!trackerSheet.headerValues.includes(day)) {
          const newHeaders = [...trackerSheet.headerValues, day];
          if (newHeaders.length > trackerSheet.columnCount) {
            await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: newHeaders.length + 5 });
          }
          await trackerSheet.setHeaderRow(newHeaders);
        }`,
  `        let trackerHeadersChanged = false;
        let trackerNewHeaders = [...trackerSheet.headerValues];
        for (let d = 1; d <= currentDayNum; d++) {
          const dStr = \`Day_\${d}\`;
          if (!trackerNewHeaders.includes(dStr)) {
            trackerNewHeaders.push(dStr);
            trackerHeadersChanged = true;
          }
        }
        if (trackerHeadersChanged) {
          if (trackerNewHeaders.length > trackerSheet.columnCount) {
            await trackerSheet.resize({ rowCount: trackerSheet.rowCount, columnCount: trackerNewHeaders.length + 5 });
          }
          await trackerSheet.setHeaderRow(trackerNewHeaders);
          await trackerSheet.loadHeaderRow();
        }`
);

// Update admin_report header generation
content = content.replace(
  `        if (!leadersSheet.headerValues.includes(day)) {
          const newHeaders = [...leadersSheet.headerValues, day];
          if (newHeaders.length > leadersSheet.columnCount) {
            await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: newHeaders.length + 5 });
          }
          await leadersSheet.setHeaderRow(newHeaders);
          await leadersSheet.loadHeaderRow(); // Reload to update headerValues correctly
        }`,
  `        let leadersHeadersChanged = false;
        let leadersNewHeaders = [...leadersSheet.headerValues];
        for (let d = 1; d <= currentDayNum; d++) {
          const dStr = \`Day_\${d}\`;
          if (!leadersNewHeaders.includes(dStr)) {
            leadersNewHeaders.push(dStr);
            leadersHeadersChanged = true;
          }
        }
        if (leadersHeadersChanged) {
          if (leadersNewHeaders.length > leadersSheet.columnCount) {
            await leadersSheet.resize({ rowCount: leadersSheet.rowCount, columnCount: leadersNewHeaders.length + 5 });
          }
          await leadersSheet.setHeaderRow(leadersNewHeaders);
          await leadersSheet.loadHeaderRow(); // Reload to update headerValues correctly
        }`
);

fs.writeFileSync(file, content);
console.log("Updated route.js");
