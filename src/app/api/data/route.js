import { NextResponse } from 'next/server';
import { fetchGlobalData, fetchLeadersData, fetchEditionsRegistry, fetchArchivedEditionData } from '@/lib/googleSheets';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

const normalizeTeamName = (name) => String(name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const team = searchParams.get('team');
    const edition = searchParams.get('edition');

    if (type === 'admin') {
      const editionsList = await fetchEditionsRegistry().catch(() => []);

      if (edition && edition !== 'live') {
        const archivedData = await fetchArchivedEditionData(edition);
        return NextResponse.json({
          ...archivedData,
          editionsList
        });
      }

      const [globalData, leadersData] = await Promise.all([
        fetchGlobalData(),
        fetchLeadersData()
      ]);
      return NextResponse.json({
        isArchive: false,
        settings: globalData.settings,
        trackerData: globalData.trackerData,
        credentialsData: globalData.credentialsData,
        validTeams: globalData.validTeams,
        leadersData: leadersData,
        teamReflection: globalData.settings['Admin_Reflection'] || "",
        editionsList
      });
    }

    const globalData = await fetchGlobalData();

    if (type === 'valid_teams') {
      return NextResponse.json({ 
        validTeams: globalData.validTeams,
        settings: globalData.settings
      });
    }

    if (type === 'leader') {
      if (!team) return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
      
      const editionsList = await fetchEditionsRegistry().catch(() => []);

      if (edition && edition !== 'live') {
        const archivedData = await fetchArchivedEditionData(edition);
        const teamTrackerData = archivedData.trackerData.filter(
          row => normalizeTeamName(row.Team_Name || row.Team) === normalizeTeamName(team)
        );
        const teamLeadersInfo = archivedData.leadersData.filter(
          row => normalizeTeamName(row.Team_Name || row.Team || row['Team Name'] || row['Team Leader Team Name']) === normalizeTeamName(team)
        );

        return NextResponse.json({
          isArchive: true,
          archiveInfo: archivedData.archiveInfo,
          settings: archivedData.settings,
          trackerData: teamTrackerData,
          teamReflection: "",
          leadersData: teamLeadersInfo,
          editionsList
        });
      }

      const teamTrackerData = globalData.trackerData.filter(
        row => normalizeTeamName(row.Team_Name) === normalizeTeamName(team)
      );
      
      const leadersData = await fetchLeadersData();
      const teamLeadersInfo = leadersData.filter(
        row => normalizeTeamName(row.Team_Name || row.Team || row['Team Name'] || row['Team Leader Team Name']) === normalizeTeamName(team)
      );
      
      return NextResponse.json({
        isArchive: false,
        settings: globalData.settings,
        trackerData: teamTrackerData,
        teamReflection: globalData.teamReflections[team] || "",
        leadersData: teamLeadersInfo,
        editionsList
      });
    }

    return NextResponse.json(globalData);
  } catch (error) {
    console.error('Fetch data error:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}
