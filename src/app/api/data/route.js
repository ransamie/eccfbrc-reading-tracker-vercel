import { NextResponse } from 'next/server';
import { fetchGlobalData, fetchLeadersData } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const team = searchParams.get('team');

    if (type === 'admin') {
      const [globalData, leadersData] = await Promise.all([
        fetchGlobalData(),
        fetchLeadersData()
      ]);
      return NextResponse.json({
        settings: globalData.settings,
        trackerData: globalData.trackerData,
        credentialsData: globalData.credentialsData,
        validTeams: globalData.validTeams,
        leadersData: leadersData
      });
    }

    const globalData = await fetchGlobalData();

    if (type === 'valid_teams') {
      return NextResponse.json({ validTeams: globalData.validTeams });
    }

    if (type === 'leader') {
      if (!team) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
      
      const teamTrackerData = globalData.trackerData.filter(
        row => String(row.Team_Name || '').trim().toLowerCase() === team.trim().toLowerCase()
      );
      
      return NextResponse.json({
        settings: globalData.settings,
        trackerData: teamTrackerData,
        teamReflection: globalData.teamReflections[team] || ""
      });
    }

    return NextResponse.json(globalData);
  } catch (error) {
    console.error('Fetch data error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
