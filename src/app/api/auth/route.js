import { NextResponse } from 'next/server';
import { fetchGlobalData, getDatabase } from '@/lib/googleSheets';

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

async function writeLoginLog(teamName, loginType, userAgent) {
  try {
    const db = await getDatabase();
    let logsSheet = db.sheetsByTitle['Login_Logs'];
    if (!logsSheet) {
      logsSheet = await db.addSheet({
        title: 'Login_Logs',
        headerValues: ['Timestamp', 'Team_Name', 'Login_Type', 'Device']
      });
    }
    const now = new Date();
    const watTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Lagos',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: true
    }).format(now);
    await logsSheet.addRow({
      Timestamp: watTime,
      Team_Name: teamName,
      Login_Type: loginType,
      Device: parseDevice(userAgent)
    });
  } catch (e) {
    console.error('Failed to write login log:', e);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { loginType, teamName, pin } = body;
    const userAgent = request.headers.get('user-agent') || '';

    const data = await fetchGlobalData();

    if (loginType === 'Super Admin') {
      const adminPin = data.settings?.ADMIN_PIN || process.env.ADMIN_PIN || "0000";
      if (pin === adminPin) {
        writeLoginLog('Super Admin', 'Admin', userAgent); // fire-and-forget
        return NextResponse.json({ success: true, role: 'admin' });
      } else {
        return NextResponse.json({ success: false, message: 'Invalid Super Admin PIN' }, { status: 401 });
      }
    } else if (loginType === 'Team Leader') {
      if (!teamName) {
        return NextResponse.json({ success: false, message: 'Team Name is required' }, { status: 400 });
      }
      
      const expectedPin = data.credentials[teamName];
      if (expectedPin && String(pin) === String(expectedPin)) {
        writeLoginLog(teamName, 'Leader', userAgent); // fire-and-forget
        return NextResponse.json({ success: true, role: 'leader', team: teamName });
      } else {
        return NextResponse.json({ success: false, message: 'Invalid PIN for this team' }, { status: 401 });
      }
    } else {
      return NextResponse.json({ success: false, message: 'Invalid login type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
