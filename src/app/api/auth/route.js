import { NextResponse } from 'next/server';
import { fetchGlobalData } from '@/lib/googleSheets';

export async function POST(request) {
  try {
    const body = await request.json();
    const { loginType, teamName, pin } = body;

    const data = await fetchGlobalData();

    if (loginType === 'Super Admin') {
      const adminPin = process.env.ADMIN_PIN || "0000";
      if (pin === adminPin) {
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
