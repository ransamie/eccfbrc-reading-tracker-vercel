import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Convert image URL to Base64 Data URL for jsPDF
async function getLogoBase64(url = '/eccfbrclogo.png') {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to load logo for PDF:', e);
    return null;
  }
}

function normalizeTeam(name) {
  return String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function getLeaderNames(teamName, leadersData = []) {
  const norm = normalizeTeam(teamName);
  const teamLeaders = leadersData.filter(l => {
    const lTeam = l.Team_Name || l.Team || l['Team Name'] || l['Team Leader Team Name'];
    return normalizeTeam(lTeam) === norm;
  });
  const leader = teamLeaders[0]?.Member_Name || teamLeaders[0]?.Name || teamLeaders[0]?.['Team Leader'] || 'N/A';
  const asst = teamLeaders[1]?.Member_Name || teamLeaders[1]?.Name || teamLeaders[1]?.['Team Leader'] || '';
  return asst ? `${leader} & ${asst}` : leader;
}

function calculateMemberProgress(member, totalDays) {
  let completedDays = 0;
  for (let d = 1; d <= totalDays; d++) {
    const val = String(member[`Day_${d}`] || '').toUpperCase();
    if (val === 'TRUE') {
      completedDays++;
    }
  }
  const is100Percent = totalDays > 0 && completedDays >= totalDays;
  return { completedDays, is100Percent };
}

// -------------------------------------------------------------
// GENERAL GLOBAL CHALLENGE REPORT (ALL TEAMS)
// -------------------------------------------------------------
export async function generateGeneralPdfReport({ trackerData = [], settings = {}, leadersData = [], validTeams = [] }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  const totalDays = parseInt(settings.Total_Days || 87, 10);
  const challengeTitle = settings.Challenge_Name || 'ECCF Bible Reading Challenge';
  const challengeEdition = settings.Challenge_Edition || 'June-August NT Edition';
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Lagos'
  }).format(new Date()) + ' (WAT)';

  // Calculate Global Statistics
  let totalAssigned = trackerData.length;
  let totalActive = 0;
  let totalEvicted = 0;
  let totalDeclined = 0;
  let totalCompleted100 = 0;

  const completersList = [];

  trackerData.forEach(m => {
    const status = String(m.Status || '').trim().toLowerCase();
    const { completedDays, is100Percent } = calculateMemberProgress(m, totalDays);

    if (status === 'active') {
      totalActive++;
      if (is100Percent) {
        totalCompleted100++;
        completersList.push({
          name: String(m.Member_Name || '').trim(),
          team: m.Team_Name || 'Unassigned',
          phone: m.WhatsApp_Number || m.Whatsapp_Number || m.Phone || 'N/A',
          completedDays
        });
      }
    } else if (status === 'evicted') {
      totalEvicted++;
    } else if (status === 'declined' || status === 'left') {
      totalDeclined++;
    }
  });

  const overallRetentionRate = totalAssigned > 0 ? ((totalActive / totalAssigned) * 100).toFixed(1) : '0.0';
  const overallCompletionRate = totalAssigned > 0 ? ((totalCompleted100 / totalAssigned) * 100).toFixed(1) : '0.0';

  // Calculate Per-Team Breakdown
  const teamsMap = {};
  trackerData.forEach(m => {
    const team = m.Team_Name || 'Unassigned';
    if (!teamsMap[team]) {
      teamsMap[team] = {
        team,
        assigned: 0,
        active: 0,
        evicted: 0,
        declined: 0,
        completed100: 0,
        leaderName: getLeaderNames(team, leadersData)
      };
    }
    teamsMap[team].assigned++;
    const status = String(m.Status || '').trim().toLowerCase();
    const { is100Percent } = calculateMemberProgress(m, totalDays);

    if (status === 'active') {
      teamsMap[team].active++;
      if (is100Percent) teamsMap[team].completed100++;
    } else if (status === 'evicted') {
      teamsMap[team].evicted++;
    } else if (status === 'declined' || status === 'left') {
      teamsMap[team].declined++;
    }
  });

  const teamBreakdown = Object.values(teamsMap).map(t => ({
    ...t,
    completionRate: t.assigned > 0 ? ((t.completed100 / t.assigned) * 100).toFixed(1) + '%' : '0.0%',
    retentionRate: t.assigned > 0 ? ((t.active / t.assigned) * 100).toFixed(1) + '%' : '0.0%'
  })).sort((a, b) => b.completed100 - a.completed100 || b.active - a.active);

  // Load Logo
  const logoBase64 = await getLogoBase64();

  // --- HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 90, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 15, 60, 60);
  }

  const textStartX = logoBase64 ? margin + 72 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(challengeTitle.toUpperCase(), textStartX, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(147, 197, 253); // Blue 300
  doc.text(`${challengeEdition} • Total Challenge Duration: ${totalDays} Days`, textStartX, 54);

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // Slate 300
  doc.text(`Official Executive Summary Report • Generated: ${dateStr}`, textStartX, 68);

  let currentY = 110;

  // --- EXECUTIVE SUMMARY METRICS BANNER ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('EXECUTIVE OVERVIEW', margin, currentY);
  currentY += 12;

  // Metric Cards
  const cards = [
    { label: 'TOTAL ASSIGNED', value: totalAssigned.toString(), color: [30, 41, 59], sub: 'Registered Members' },
    { label: 'ACTIVE / COMMITTED', value: totalActive.toString(), color: [37, 99, 235], sub: `${overallRetentionRate}% Retention` },
    { label: 'COMPLETED 100%', value: totalCompleted100.toString(), color: [16, 185, 129], sub: `${overallCompletionRate}% Finished All Days` },
    { label: 'TOTAL EVICTED', value: totalEvicted.toString(), color: [239, 68, 68], sub: `Behind Threshold` },
    { label: 'LEFT / DECLINED', value: totalDeclined.toString(), color: [245, 158, 11], sub: `Voluntary / Exited` },
  ];

  const cardGap = 8;
  const cardWidth = (contentWidth - (cardGap * 4)) / 5;
  const cardHeight = 52;

  cards.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    
    // Background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 4, 4, 'FD');

    // Accent Top Line
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, cardWidth, 3, 'F');

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + (cardWidth / 2), currentY + 22, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + (cardWidth / 2), currentY + 34, { align: 'center' });

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + (cardWidth / 2), currentY + 44, { align: 'center' });
  });

  currentY += cardHeight + 22;

  // --- TEAM PERFORMANCE BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('TEAM PERFORMANCE & RETENTION BREAKDOWN', margin, currentY);
  currentY += 8;

  const tableRows = teamBreakdown.map((t, index) => [
    `#${index + 1}`,
    t.team,
    t.leaderName,
    t.assigned.toString(),
    t.active.toString(),
    t.completed100.toString(),
    t.evicted.toString(),
    t.declined.toString(),
    t.completionRate
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'Rank', 'Team Name', 'Team Leaders', 'Assigned', 'Active', '100% Done', 'Evicted', 'Declined', 'Success Rate'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 85 },
      2: { halign: 'left', fontSize: 7.5, cellWidth: 105 },
      3: { halign: 'center', cellWidth: 46 },
      4: { halign: 'center', cellWidth: 42, fontStyle: 'bold', textColor: [37, 99, 235] },
      5: { halign: 'center', cellWidth: 55, fontStyle: 'bold', textColor: [16, 185, 129] },
      6: { halign: 'center', cellWidth: 42, textColor: [239, 68, 68] },
      7: { halign: 'center', cellWidth: 44, textColor: [245, 158, 11] },
      8: { halign: 'center', cellWidth: 62, fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 4.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // --- HONOR ROLL OF 100% COMPLETERS (PAGE BREAK) ---
  if (completersList.length > 0) {
    doc.addPage();
    
    // Mini Top Banner on subsequent pages
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${challengeTitle} • HONOR ROLL OF 100% READING FINISHERS`, margin, 25);

    currentY = 60;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129); // Green
    doc.text(`🏆 CHALLENGE COMPLETION HONOR ROLL (${completersList.length} Members)`, margin, currentY);
    currentY += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`The following faithful participants successfully completed all ${totalDays} reading days without missing a single day!`, margin, currentY + 8);
    currentY += 18;

    const completersRows = completersList
      .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))
      .map((c, idx) => [
        (idx + 1).toString(),
        c.name,
        c.team,
        c.phone,
        `${c.completedDays}/${totalDays} Days (100%)`,
        'COMPLETED 🏆'
      ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      head: [['#', 'Participant Name', 'Team', 'WhatsApp Number', 'Progress', 'Status']],
      body: completersRows,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105], // Emerald 600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'left', fontStyle: 'bold' },
        2: { halign: 'left' },
        3: { halign: 'center' },
        4: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
        5: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129] }
      },
      styles: {
        fontSize: 8,
        cellPadding: 4,
        lineColor: [226, 232, 240],
        lineWidth: 0.5
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244] // Emerald 50
      }
    });
  }

  // --- FOOTER & PAGE NUMBERING ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    // Footer line
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    // Left: Branding
    doc.text('ECCF Bible Reading Club • Official Executive Report', margin, pageHeight - 14);

    // Right: Page Numbers
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  // Save / Download
  const filename = `ECCF_Challenge_Report_Global_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}


// -------------------------------------------------------------
// INDIVIDUAL SINGLE TEAM REPORT
// -------------------------------------------------------------
export async function generateTeamPdfReport({ teamName, trackerData = [], settings = {}, leadersData = [] }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  const totalDays = parseInt(settings.Total_Days || 87, 10);
  const challengeTitle = settings.Challenge_Name || 'ECCF Bible Reading Challenge';
  const challengeEdition = settings.Challenge_Edition || 'June-August NT Edition';
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Lagos'
  }).format(new Date()) + ' (WAT)';

  // Filter Members for this team
  const normTeam = normalizeTeam(teamName);
  const teamMembers = trackerData.filter(m => normalizeTeam(m.Team_Name) === normTeam);
  const leaderNames = getLeaderNames(teamName, leadersData);

  // Statistics
  let assigned = teamMembers.length;
  let active = 0;
  let evicted = 0;
  let declined = 0;
  let completed100 = 0;

  const rosterList = [];

  teamMembers.forEach(m => {
    const status = String(m.Status || '').trim().toLowerCase();
    const { completedDays, is100Percent } = calculateMemberProgress(m, totalDays);
    const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    let finalBadge = 'Active';
    if (status === 'active') {
      active++;
      if (is100Percent) {
        completed100++;
        finalBadge = 'Completed 🏆';
      } else {
        finalBadge = 'Active';
      }
    } else if (status === 'evicted') {
      evicted++;
      finalBadge = 'Evicted 🚨';
    } else if (status === 'declined' || status === 'left') {
      declined++;
      finalBadge = 'Left / Declined';
    }

    rosterList.push({
      name: String(m.Member_Name || '').trim(),
      phone: m.WhatsApp_Number || m.Whatsapp_Number || m.Phone || 'N/A',
      completedDays,
      progressPct,
      finalBadge,
      is100Percent,
      rawStatus: status
    });
  });

  const completionRate = assigned > 0 ? ((completed100 / assigned) * 100).toFixed(1) : '0.0';
  const retentionRate = assigned > 0 ? ((active / assigned) * 100).toFixed(1) : '0.0';

  // Load Logo
  const logoBase64 = await getLogoBase64();

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 90, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 15, 60, 60);
  }

  const textStartX = logoBase64 ? margin + 72 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`TEAM REPORT: ${teamName.toUpperCase()}`, textStartX, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.setTextColor(147, 197, 253);
  doc.text(`${challengeTitle} • ${challengeEdition}`, textStartX, 52);

  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Team Leaders: ${leaderNames} • Generated: ${dateStr}`, textStartX, 68);

  let currentY = 110;

  // --- TEAM METRIC TILES ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`TEAM ${teamName.toUpperCase()} PERFORMANCE SUMMARY`, margin, currentY);
  currentY += 12;

  const cards = [
    { label: 'TOTAL ASSIGNED', value: assigned.toString(), color: [30, 41, 59], sub: 'Team Members' },
    { label: 'COMMITTED / ACTIVE', value: active.toString(), color: [37, 99, 235], sub: `${retentionRate}% Retention` },
    { label: '100% COMPLETERS', value: completed100.toString(), color: [16, 185, 129], sub: `${completionRate}% Finished All` },
    { label: 'TOTAL EVICTED', value: evicted.toString(), color: [239, 68, 68], sub: 'Behind Eviction Rule' },
    { label: 'LEFT / DECLINED', value: declined.toString(), color: [245, 158, 11], sub: 'Exited Challenge' },
  ];

  const cardGap = 8;
  const cardWidth = (contentWidth - (cardGap * 4)) / 5;
  const cardHeight = 52;

  cards.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    
    // Background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 4, 4, 'FD');

    // Accent Line
    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, cardWidth, 3, 'F');

    // Value
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + (cardWidth / 2), currentY + 22, { align: 'center' });

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + (cardWidth / 2), currentY + 34, { align: 'center' });

    // Subtext
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.8);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + (cardWidth / 2), currentY + 44, { align: 'center' });
  });

  currentY += cardHeight + 22;

  // --- TEAM MEMBER ROSTER TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(`COMPLETE MEMBER ROSTER & READING PROGRESS`, margin, currentY);
  currentY += 8;

  // Sort by progress descending, then name
  const sortedRoster = [...rosterList].sort((a, b) => b.completedDays - a.completedDays || a.name.localeCompare(b.name));

  const tableRows = sortedRoster.map((m, index) => [
    `#${index + 1}`,
    m.name,
    m.phone,
    `${m.completedDays} / ${totalDays} Days`,
    `${m.progressPct}%`,
    m.finalBadge
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      '#', 'Participant Name', 'WhatsApp Number', 'Reading Record', 'Progress %', 'Final Status'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138], // Indigo 900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 32 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 150 },
      2: { halign: 'center', cellWidth: 110 },
      3: { halign: 'center', cellWidth: 90, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 85, fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw || '');
        if (text.includes('Completed')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text.includes('Evicted')) {
          data.cell.styles.textColor = [239, 68, 68];
        } else if (text.includes('Left') || text.includes('Declined')) {
          data.cell.styles.textColor = [245, 158, 11];
        } else {
          data.cell.styles.textColor = [37, 99, 235];
        }
      }
    },
    styles: {
      fontSize: 8,
      cellPadding: 4.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // --- FOOTER & PAGE NUMBERING ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    doc.text(`ECCF Bible Reading Club • Team ${teamName} Official Report`, margin, pageHeight - 14);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 14, { align: 'right' });
  }

  // Save / Download
  const cleanTeamName = teamName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ECCF_Report_Team_${cleanTeamName}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}
