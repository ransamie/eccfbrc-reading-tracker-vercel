import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Clean all emojis and non-standard characters that break standard PDF fonts
function cleanText(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    // Strip emojis and miscellaneous symbols
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}\u{2B50}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
    // Strip non-printable or non-ASCII characters
    .replace(/[^\x20-\x7E\t\n\r]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Convert high-quality logo to crisp Base64 for razor-sharp PDF rendering
async function getCompressedLogoBase64(url = '/logo.png') {
  try {
    const loadImage = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

    let img;
    try {
      img = await loadImage(url);
    } catch {
      img = await loadImage('/eccfbrclogo.png');
    }

    const canvas = document.createElement('canvas');
    // High-resolution for ultra-crisp 300+ DPI print quality
    const naturalW = img.naturalWidth || 1024;
    const naturalH = img.naturalHeight || 1024;
    const maxDim = 1024;
    const scale = Math.min(1, maxDim / Math.max(naturalW, naturalH));
    
    canvas.width = Math.round(naturalW * scale);
    canvas.height = Math.round(naturalH * scale);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png', 0.95);
  } catch (e) {
    console.error('Failed to load logo for PDF:', e);
    return null;
  }
}

function normalizeTeam(name) {
  return cleanText(name).toLowerCase();
}

function getLeaderNames(teamName, leadersData = []) {
  const norm = normalizeTeam(teamName);
  const teamLeaders = leadersData.filter(l => {
    const lTeam = l.Team_Name || l.Team || l['Team Name'] || l['Team Leader Team Name'];
    return normalizeTeam(lTeam) === norm;
  });
  const leader = cleanText(teamLeaders[0]?.Member_Name || teamLeaders[0]?.Name || teamLeaders[0]?.['Team Leader'] || 'N/A');
  const asst = cleanText(teamLeaders[1]?.Member_Name || teamLeaders[1]?.Name || teamLeaders[1]?.['Team Leader'] || '');
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

function formatChallengePeriod(startDateStr, totalDays) {
  if (!startDateStr) return `${totalDays} Days`;
  try {
    const [sYear, sMonth, sDay] = String(startDateStr).split('-').map(Number);
    const startDate = sYear ? new Date(sYear, sMonth - 1, sDay) : new Date(startDateStr);
    
    const daysToAdd = Math.max(0, parseInt(totalDays, 10) - 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysToAdd);

    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const startFormatted = new Intl.DateTimeFormat('en-GB', options).format(startDate);
    const endFormatted = new Intl.DateTimeFormat('en-GB', options).format(endDate);

    return `${startFormatted} - ${endFormatted} (${totalDays} Days)`;
  } catch (e) {
    return `${totalDays} Days`;
  }
}

function getDatesBreakdown(startDateStr, totalDays) {
  if (!startDateStr) return { startFormatted: 'N/A', endFormatted: 'N/A', totalDays };
  try {
    const [sYear, sMonth, sDay] = String(startDateStr).split('-').map(Number);
    const startDate = sYear ? new Date(sYear, sMonth - 1, sDay) : new Date(startDateStr);
    const daysToAdd = Math.max(0, parseInt(totalDays, 10) - 1);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + daysToAdd);

    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return {
      startFormatted: new Intl.DateTimeFormat('en-GB', options).format(startDate),
      endFormatted: new Intl.DateTimeFormat('en-GB', options).format(endDate),
      totalDays
    };
  } catch (e) {
    return { startFormatted: 'N/A', endFormatted: 'N/A', totalDays };
  }
}

// -------------------------------------------------------------
// 1. GENERAL CHALLENGE REPORT (ALL TEAMS COMBINED)
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
  const contentWidth = pageWidth - (margin * 2); // 523.28 pt

  const totalDays = parseInt(settings.Total_Days || 87, 10);
  const challengeTitle = cleanText(settings.Challenge_Name || 'ECCF Bible Reading Challenge');
  const challengeEdition = cleanText(settings.Challenge_Edition || 'Reading Challenge');
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Lagos'
  }).format(new Date()) + ' (WAT)';

  // Calculate Numbers
  let totalAssigned = trackerData.length;
  let totalActive = 0;
  let totalEvicted = 0;
  let totalDeclined = 0;
  let totalCompleted100 = 0;

  const completersList = [];

  trackerData.forEach(m => {
    const status = cleanText(m.Status || '').toLowerCase();
    const { completedDays, is100Percent } = calculateMemberProgress(m, totalDays);

    if (status === 'active') {
      totalActive++;
      if (is100Percent) {
        totalCompleted100++;
        completersList.push({
          name: cleanText(m.Member_Name || 'Participant'),
          team: cleanText(m.Team_Name || 'Unassigned'),
          phone: cleanText(m.WhatsApp_Number || m.Whatsapp_Number || m.Phone || 'N/A'),
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

  // Calculate Team Breakdown
  const teamsMap = {};
  trackerData.forEach(m => {
    const rawTeam = m.Team_Name || 'Unassigned';
    const team = cleanText(rawTeam);
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
    const status = cleanText(m.Status || '').toLowerCase();
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
  }));

  const startDateStr = settings.Start_Date || '';
  const periodStr = formatChallengePeriod(startDateStr, totalDays);

  // --- HEADER SECTION ---
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(0, 0, pageWidth, 80, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 12, 56, 56);
  }

  const textStartX = logoBase64 ? margin + 68 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(challengeTitle.toUpperCase(), textStartX, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text(`${challengeEdition}  |  ${periodStr}`, textStartX, 46);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`General Executive Report  |  Generated: ${dateStr}`, textStartX, 60);

  let currentY = 98;

  // --- SUMMARY OVERVIEW CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('SUMMARY OVERVIEW', margin, currentY);
  currentY += 8;

  const cards = [
    { label: 'REGISTERED', value: totalAssigned.toString(), color: [30, 41, 59], sub: 'Total Participants' },
    { label: 'ACTIVE READERS', value: totalActive.toString(), color: [37, 99, 235], sub: `${overallRetentionRate}% Active` },
    { label: 'COMPLETED 100%', value: totalCompleted100.toString(), color: [16, 185, 129], sub: `${overallCompletionRate}% Finished All` },
    { label: 'EVICTED', value: totalEvicted.toString(), color: [239, 68, 68], sub: 'Missed Threshold' },
    { label: 'DECLINED / LEFT', value: totalDeclined.toString(), color: [245, 158, 11], sub: 'Exited Reading' },
  ];

  const cardGap = 8;
  const cardWidth = (contentWidth - (cardGap * 4)) / 5;
  const cardHeight = 44;

  cards.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, 'FD');

    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, cardWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + (cardWidth / 2), currentY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + (cardWidth / 2), currentY + 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + (cardWidth / 2), currentY + 37, { align: 'center' });
  });

  currentY += cardHeight + 16;

  // --- TEAM PERFORMANCE BREAKDOWN TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TEAM PERFORMANCE BREAKDOWN', margin, currentY);
  currentY += 8;

  const tableRows = teamBreakdown.map((t, index) => [
    (index + 1).toString(),
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
    tableWidth: contentWidth,
    head: [[
      'S/N', 'Team Name', 'Team Leaders', 'Registered', 'Active', 'Completed', 'Evicted', 'Declined', 'Success Rate'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 85 },
      2: { halign: 'left', fontSize: 7, cellWidth: 120 },
      3: { halign: 'center', cellWidth: 45 },
      4: { halign: 'center', cellWidth: 40, fontStyle: 'bold', textColor: [37, 99, 235] },
      5: { halign: 'center', cellWidth: 55, fontStyle: 'bold', textColor: [16, 185, 129] },
      6: { halign: 'center', cellWidth: 40, textColor: [239, 68, 68] },
      7: { halign: 'center', cellWidth: 40, textColor: [245, 158, 11] },
      8: { halign: 'center', cellWidth: 68, fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    }
  });

  // --- LIST OF SUCCESSFUL COMPLETED PARTICIPANTS (PAGE BREAK) ---
  if (completersList.length > 0) {
    doc.addPage();
    
    // Mini Top Banner
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 32, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(`${challengeTitle.toUpperCase()}  |  LIST OF SUCCESSFUL COMPLETED PARTICIPANTS`, margin, 20);

    currentY = 50;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(5, 150, 105);
    doc.text(`List of Successful Completed Participants (${completersList.length} Members)`, margin, currentY);
    currentY += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Participants who successfully completed all ${totalDays} reading days.`, margin, currentY + 8);
    currentY += 16;

    const completersRows = completersList
      .sort((a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name))
      .map((c, idx) => [
        (idx + 1).toString(),
        c.name,
        c.team,
        c.phone,
        `${c.completedDays}/${totalDays} Days`,
        'Completed'
      ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: margin, right: margin },
      tableWidth: contentWidth,
      head: [['S/N', 'Participant Name', 'Team', 'WhatsApp Number', 'Reading Record', 'Status']],
      body: completersRows,
      theme: 'grid',
      headStyles: {
        fillColor: [5, 150, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'center'
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 30 },
        1: { halign: 'left', fontStyle: 'bold', cellWidth: 145 },
        2: { halign: 'left', cellWidth: 100 },
        3: { halign: 'center', cellWidth: 95 },
        4: { halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105], cellWidth: 75 },
        5: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 78 }
      },
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: 3.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.5,
        overflow: 'linebreak'
      },
      alternateRowStyles: {
        fillColor: [240, 253, 244]
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

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    doc.text('ECCF Bible Reading Club  |  General Challenge Report', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  const filename = `ECCF_General_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}


// -------------------------------------------------------------
// 2. INDIVIDUAL SINGLE TEAM REPORT
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
  const contentWidth = pageWidth - (margin * 2); // 523.28 pt

  const cleanTeam = cleanText(teamName);
  const totalDays = parseInt(settings.Total_Days || 87, 10);
  const challengeTitle = cleanText(settings.Challenge_Name || 'ECCF Bible Reading Challenge');
  const challengeEdition = cleanText(settings.Challenge_Edition || 'Reading Challenge');
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Lagos'
  }).format(new Date()) + ' (WAT)';

  // Filter Members
  const normTeam = normalizeTeam(teamName);
  const teamMembers = trackerData.filter(m => normalizeTeam(m.Team_Name) === normTeam);
  const leaderNames = getLeaderNames(teamName, leadersData);

  let assigned = teamMembers.length;
  let active = 0;
  let evicted = 0;
  let declined = 0;
  let completed100 = 0;

  const rosterList = [];

  teamMembers.forEach(m => {
    const status = cleanText(m.Status || '').toLowerCase();
    const { completedDays, is100Percent } = calculateMemberProgress(m, totalDays);
    const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    let finalBadge = 'Active';
    if (status === 'active') {
      active++;
      if (is100Percent) {
        completed100++;
        finalBadge = 'Completed';
      } else {
        finalBadge = 'Active';
      }
    } else if (status === 'evicted') {
      evicted++;
      finalBadge = 'Evicted';
    } else if (status === 'declined' || status === 'left') {
      declined++;
      finalBadge = 'Left / Declined';
    }

    rosterList.push({
      name: cleanText(m.Member_Name || 'Member'),
      phone: cleanText(m.WhatsApp_Number || m.Whatsapp_Number || m.Phone || 'N/A'),
      completedDays,
      progressPct,
      finalBadge,
      is100Percent,
      rawStatus: status
    });
  });

  const completionRate = assigned > 0 ? ((completed100 / assigned) * 100).toFixed(1) : '0.0';
  const retentionRate = assigned > 0 ? ((active / assigned) * 100).toFixed(1) : '0.0';

  const startDateStr = settings.Start_Date || '';
  const periodStr = formatChallengePeriod(startDateStr, totalDays);

  const logoBase64 = await getCompressedLogoBase64();

  // --- HEADER BANNER ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 80, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 12, 56, 56);
  }

  const textStartX = logoBase64 ? margin + 68 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`TEAM REPORT: ${cleanTeam.toUpperCase()}`, textStartX, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text(`${challengeEdition}  |  ${periodStr}`, textStartX, 46);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Team Leaders: ${leaderNames}  |  Generated: ${dateStr}`, textStartX, 60);

  let currentY = 98;

  // --- TEAM SUMMARY CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`TEAM ${cleanTeam.toUpperCase()} SUMMARY`, margin, currentY);
  currentY += 8;

  const cards = [
    { label: 'REGISTERED', value: assigned.toString(), color: [30, 41, 59], sub: 'Team Members' },
    { label: 'ACTIVE READERS', value: active.toString(), color: [37, 99, 235], sub: `${retentionRate}% Active` },
    { label: 'COMPLETED 100%', value: completed100.toString(), color: [16, 185, 129], sub: `${completionRate}% Finished All` },
    { label: 'EVICTED', value: evicted.toString(), color: [239, 68, 68], sub: 'Missed Threshold' },
    { label: 'DECLINED / LEFT', value: declined.toString(), color: [245, 158, 11], sub: 'Exited Reading' },
  ];

  const cardGap = 8;
  const cardWidth = (contentWidth - (cardGap * 4)) / 5;
  const cardHeight = 44;

  cards.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, 'FD');

    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, cardWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + (cardWidth / 2), currentY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + (cardWidth / 2), currentY + 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + (cardWidth / 2), currentY + 37, { align: 'center' });
  });

  currentY += cardHeight + 16;

  // --- TEAM MEMBER ROSTER TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('MEMBER ROSTER & READING PROGRESS', margin, currentY);
  currentY += 8;

  const sortedRoster = [...rosterList].sort((a, b) => b.completedDays - a.completedDays || a.name.localeCompare(b.name));

  const tableRows = sortedRoster.map((m, index) => [
    (index + 1).toString(),
    m.name,
    m.phone,
    `${m.completedDays} / ${totalDays} Days`,
    `${m.progressPct}%`,
    m.finalBadge
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: [[
      'S/N', 'Participant Name', 'WhatsApp Number', 'Reading Record', 'Progress', 'Status'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 155 },
      2: { halign: 'center', cellWidth: 105 },
      3: { halign: 'center', cellWidth: 85, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 83, fontStyle: 'bold' }
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
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak'
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
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    doc.text(`ECCF Bible Reading Club  |  Team ${cleanTeam} Report`, margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  const cleanFileTeam = cleanTeam.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `ECCF_Report_Team_${cleanFileTeam}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}


// -------------------------------------------------------------
// 3. TEAM LEADERS REPORT
// -------------------------------------------------------------
export async function generateLeadersPdfReport({ leadersData = [], settings = {} }) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2); // 523.28 pt

  const totalDays = parseInt(settings.Total_Days || 87, 10);
  const challengeTitle = cleanText(settings.Challenge_Name || 'ECCF Bible Reading Challenge');
  const challengeEdition = cleanText(settings.Challenge_Edition || 'Reading Challenge');
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Lagos'
  }).format(new Date()) + ' (WAT)';

  let totalLeaders = leadersData.length;
  let completedLeadersCount = 0;
  let activeLeadersCount = 0;
  let evictedLeadersCount = 0;

  const leadersList = [];

  leadersData.forEach(l => {
    const rawName = l.Member_Name || l.Name || l['Team Leader'] || 'Leader';
    const name = cleanText(rawName);
    const team = cleanText(l.Team_Name || l.Team || l['Team Name'] || l['Team Leader Team Name'] || 'Assigned Team');
    const status = cleanText(l.Status || 'Active');
    const { completedDays, is100Percent } = calculateMemberProgress(l, totalDays);
    const progressPct = totalDays > 0 ? Math.round((completedDays / totalDays) * 100) : 0;

    let finalBadge = 'Active';
    if (status.toLowerCase() === 'active') {
      activeLeadersCount++;
      if (is100Percent) {
        completedLeadersCount++;
        finalBadge = 'Completed';
      } else {
        finalBadge = 'Active';
      }
    } else if (status.toLowerCase() === 'evicted') {
      evictedLeadersCount++;
      finalBadge = 'Evicted';
    } else {
      finalBadge = status || 'Active';
    }

    leadersList.push({
      name,
      team,
      completedDays,
      progressPct,
      finalBadge
    });
  });

  const leaderCompletionRate = totalLeaders > 0 ? ((completedLeadersCount / totalLeaders) * 100).toFixed(1) : '0.0';
  const leaderRetentionRate = totalLeaders > 0 ? ((activeLeadersCount / totalLeaders) * 100).toFixed(1) : '0.0';

  const startDateStr = settings.Start_Date || '';
  const periodStr = formatChallengePeriod(startDateStr, totalDays);

  const logoBase64 = await getCompressedLogoBase64();

  // --- HEADER SECTION ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 80, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 12, 56, 56);
  }

  const textStartX = logoBase64 ? margin + 68 : margin;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('TEAM LEADERS READING REPORT', textStartX, 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(147, 197, 253);
  doc.text(`${challengeEdition}  |  ${periodStr}`, textStartX, 46);

  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Team Leaders Reading Summary  |  Generated: ${dateStr}`, textStartX, 60);

  let currentY = 98;

  // --- LEADERS SUMMARY CARDS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('LEADERS SUMMARY', margin, currentY);
  currentY += 8;

  const cards = [
    { label: 'TOTAL LEADERS', value: totalLeaders.toString(), color: [30, 41, 59], sub: 'Team Leaders & Assistants' },
    { label: 'ACTIVE LEADERS', value: activeLeadersCount.toString(), color: [37, 99, 235], sub: `${leaderRetentionRate}% Active` },
    { label: 'COMPLETED 100%', value: completedLeadersCount.toString(), color: [16, 185, 129], sub: `${leaderCompletionRate}% Finished All` },
    { label: 'EVICTED / INACTIVE', value: evictedLeadersCount.toString(), color: [239, 68, 68], sub: 'Missed Threshold' }
  ];

  const cardGap = 10;
  const cardWidth = (contentWidth - (cardGap * 3)) / 4;
  const cardHeight = 44;

  cards.forEach((c, idx) => {
    const x = margin + (idx * (cardWidth + cardGap));
    
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, cardHeight, 3, 3, 'FD');

    doc.setFillColor(c.color[0], c.color[1], c.color[2]);
    doc.rect(x, currentY, cardWidth, 2.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(c.color[0], c.color[1], c.color[2]);
    doc.text(c.value, x + (cardWidth / 2), currentY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, x + (cardWidth / 2), currentY + 28, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text(c.sub, x + (cardWidth / 2), currentY + 37, { align: 'center' });
  });

  currentY += cardHeight + 16;

  // --- LEADERS ROSTER TABLE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TEAM LEADERS READING PROGRESS', margin, currentY);
  currentY += 8;

  const sortedLeaders = [...leadersList].sort((a, b) => b.completedDays - a.completedDays || a.team.localeCompare(b.team) || a.name.localeCompare(b.name));

  const tableRows = sortedLeaders.map((l, index) => [
    (index + 1).toString(),
    l.name,
    l.team,
    `${l.completedDays} / ${totalDays} Days`,
    `${l.progressPct}%`,
    l.finalBadge
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    tableWidth: contentWidth,
    head: [[
      'S/N', 'Team Leader Name', 'Assigned Team', 'Reading Record', 'Progress', 'Status'
    ]],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [79, 70, 229],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 30 },
      1: { halign: 'left', fontStyle: 'bold', cellWidth: 160 },
      2: { halign: 'left', cellWidth: 120 },
      3: { halign: 'center', cellWidth: 85, fontStyle: 'bold' },
      4: { halign: 'center', cellWidth: 60, fontStyle: 'bold' },
      5: { halign: 'center', cellWidth: 68, fontStyle: 'bold' }
    },
    didParseCell: function(data) {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw || '');
        if (text.includes('Completed')) {
          data.cell.styles.textColor = [5, 150, 105];
        } else if (text.includes('Evicted')) {
          data.cell.styles.textColor = [239, 68, 68];
        } else {
          data.cell.styles.textColor = [37, 99, 235];
        }
      }
    },
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak'
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
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    doc.text('ECCF Bible Reading Club  |  Team Leaders Report', margin, pageHeight - 10);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  const filename = `ECCF_Team_Leaders_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
  return filename;
}
