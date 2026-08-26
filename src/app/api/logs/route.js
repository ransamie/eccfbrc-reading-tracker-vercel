import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

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
      teamName: r.get('Team_Name') || '',
      loginType: r.get('Login_Type') || '',
      device: r.get('Device') || '',
    })).reverse(); // most recent first

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Logs fetch error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
