import { NextResponse } from 'next/server';
import { fetchGlobalData, fetchLeadersData } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

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
        leadersData: leadersData,
        teamReflection: globalData.settings['Admin_Reflection'] || ""
      });
    }

    const globalData = await fetchGlobalData();

    if (type === 'valid_teams') {
      return NextResponse.json({ validTeams: globalData.validTeams });
    }

    if (type === 'leader') {
      if (!team) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
      
      const teamTrackerData = globalData.trackerData.filter(
        row => normalizeTeamName(row.Team_Name) === normalizeTeamName(team)
      );
      
      const leadersData = await fetchLeadersData();
      const teamLeadersInfo = leadersData.filter(
        row => normalizeTeamName(row.Team_Name || row.Team || row['Team Name']) === normalizeTeamName(team)
      );
      
      return NextResponse.json({
        settings: globalData.settings,
        trackerData: teamTrackerData,
        teamReflection: globalData.teamReflections[team] || "",
        leadersData: teamLeadersInfo
      });
    }

    return NextResponse.json(globalData);
  } catch (error) {
    console.error('Fetch data error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
