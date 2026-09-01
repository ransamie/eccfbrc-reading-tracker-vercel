import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

function parseDevice(userAgent = '') {
  if (!userAgent) return 'Unknown';
  if (/iPhone/i.test(userAgent)) return '📱 iPhone';
  if (/iPad/i.test(userAgent)) return '📱 iPad';
  if (/Android.*Mobile/i.test(userAgent)) return '📱 Android Phone';
  if (/Android/i.test(userAgent)) return '📱 Android Tablet';
  if (/Windows/i.test(userAgent)) return '💻 Windows PC';
  if (/Macintosh/i.test(userAgent)) return '💻 Mac';
  if (/Linux/i.test(userAgent)) return '🖥️ Linux';
  return '🌐 Browser';
}

function formatWAT(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Lagos',
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true
  }).format(date);
}

function formatDuration(seconds) {
  if (!seconds || seconds < 10) return '< 1 min';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSecs = seconds % 60;
  if (mins < 60) {
    return remSecs > 10 ? `${mins}m ${remSecs}s` : `${mins} min${mins > 1 ? 's' : ''}`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export async function GET() {
  try {
    const db = await getDatabase();
    const logsSheet = db.sheetsByTitle['Login_Logs'];
    if (!logsSheet) {
      return NextResponse.json({ logs: [] });
    }
    const rows = await logsSheet.getRows();
    const logs = rows.map(r => ({
      timestamp: r.get('Timestamp') || '',
      lastActive: r.get('Last_Active') || r.get('Timestamp') || '',
      duration: r.get('Duration') || '< 1 min',
      teamName: r.get('Team_Name') || '',
      loginType: r.get('Login_Type') || '',
      device: r.get('Device') || '',
      sessionId: r.get('Session_ID') || '',
      status: r.get('Status') || 'Active',
    })).reverse(); // most recent first

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Logs fetch error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, sessionId, teamName, loginType, durationSeconds } = body;
    const userAgent = request.headers.get('user-agent') || '';

    if (!sessionId) {
      return NextResponse.json({ success: false, message: 'Session ID is required' }, { status: 400 });
    }

    const db = await getDatabase();
    let logsSheet = db.sheetsByTitle['Login_Logs'];
    
    if (!logsSheet) {
      logsSheet = await db.addSheet({
        title: 'Login_Logs',
        headerValues: ['Timestamp', 'Last_Active', 'Duration', 'Team_Name', 'Login_Type', 'Device', 'Session_ID', 'Status']
      });
    } else {
      await logsSheet.loadHeaderRow();
      const needed = ['Timestamp', 'Last_Active', 'Duration', 'Team_Name', 'Login_Type', 'Device', 'Session_ID', 'Status'];
      const headers = [...logsSheet.headerValues];
      let changed = false;
      needed.forEach(h => {
        if (!headers.includes(h)) {
          headers.push(h);
          changed = true;
        }
      });
      if (changed) {
        if (headers.length > logsSheet.columnCount) {
          await logsSheet.resize({ rowCount: logsSheet.rowCount, columnCount: headers.length + 3 });
        }
        await logsSheet.setHeaderRow(headers);
        await logsSheet.loadHeaderRow();
      }
    }

    const nowWAT = formatWAT(new Date());

    if (action === 'session_start') {
      await logsSheet.addRow({
        Timestamp: nowWAT,
        Last_Active: nowWAT,
        Duration: '< 1 min',
        Team_Name: teamName || 'Unknown',
        Login_Type: loginType || 'Leader',
        Device: parseDevice(userAgent),
        Session_ID: sessionId,
        Status: 'Active'
      });
      return NextResponse.json({ success: true });
    }

    if (action === 'session_ping' || action === 'session_end') {
      const rows = await logsSheet.getRows();
      // Look from the end for the row matching sessionId
      const matchingRow = [...rows].reverse().find(r => r.get('Session_ID') === sessionId);
      if (matchingRow) {
        matchingRow.set('Last_Active', nowWAT);
        matchingRow.set('Duration', formatDuration(durationSeconds || 0));
        if (action === 'session_end') {
          matchingRow.set('Status', 'Closed');
        }
        await matchingRow.save();
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Activity log error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
