import { NextResponse } from 'next/server';
import { fetchGlobalData, fetchLeadersData, fetchEditionsRegistry } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const team = searchParams.get('team');

    const editionsList = await fetchEditionsRegistry().catch(() => []);
    const [globalData, leadersData] = await Promise.all([
      fetchGlobalData(),
      fetchLeadersData()
    ]);

    if (type === 'admin') {
      return NextResponse.json({
        isArchive: Boolean(globalData.isArchive),
        archiveInfo: globalData.archiveInfo || null,
        settings: globalData.settings,
        trackerData: globalData.trackerData,
        credentialsData: globalData.credentialsData,
        validTeams: globalData.validTeams,
        leadersData: leadersData,
        teamReflection: globalData.settings['Admin_Reflection'] || "",
        editionsList,
        activeEditionId: globalData.settings?.Active_Edition_Id || 'live'
      });
    }

    if (type === 'valid_teams') {
      return NextResponse.json({ 
        validTeams: globalData.validTeams,
        settings: globalData.settings,
        isArchive: Boolean(globalData.isArchive),
        activeEditionId: globalData.settings?.Active_Edition_Id || 'live'
      });
    }

    if (type === 'leader') {
      if (!team) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
      
      const teamTrackerData = globalData.trackerData.filter(
        row => normalizeTeamName(row.Team_Name || row.Team) === normalizeTeamName(team)
      );
      
      const teamLeadersInfo = leadersData.filter(
        row => normalizeTeamName(row.Team_Name || row.Team || row['Team Name'] || row['Team Leader Team Name']) === normalizeTeamName(team)
      );
      
      return NextResponse.json({
        isArchive: Boolean(globalData.isArchive),
        archiveInfo: globalData.archiveInfo || null,
        settings: globalData.settings,
        trackerData: teamTrackerData,
        teamReflection: globalData.teamReflections[team] || "",
        leadersData: teamLeadersInfo,
        editionsList,
        activeEditionId: globalData.settings?.Active_Edition_Id || 'live'
      });
    }

    return NextResponse.json({
      ...globalData,
      leadersData,
      editionsList
    });
  } catch (error) {
    console.error('Fetch data error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
