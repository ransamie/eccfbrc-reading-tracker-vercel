import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, LogOut, Trophy, Check, Search, BookOpen, Sparkles, CheckCheck, BarChart3, Users, Settings, FileText, X, Activity, FileDown, Archive, FolderArchive, Layers, PlusCircle, AlertTriangle, Sliders, Save, UserPlus, KeyRound, ShieldCheck, UploadCloud, AlertCircle, Trash2, Power, Lock, Unlock } from "lucide-react";
import InstallPwaButton from "./InstallPwaButton";
import { generateGeneralPdfReport, generateTeamPdfReport, generateLeadersPdfReport } from "@/lib/pdfReportGenerator";
import { AgGridReact } from 'ag-grid-react';
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';

ModuleRegistry.registerModules([AllCommunityModule]);

const parse12to24 = (time12h) => {
  if (!time12h) return "";
  const match = String(time12h).match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return time12h;
  let [_, hours, minutes, modifier] = match;
  if (hours === '12') hours = '00';
  if (modifier.toUpperCase() === 'PM') hours = parseInt(hours, 10) + 12;
  return `${String(hours).padStart(2, '0')}:${minutes}`;
};

const parse24to12 = (time24h) => {
  if (!time24h) return "";
  let [hours, minutes] = time24h.split(':');
  let h = parseInt(hours, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${minutes} ${ampm}`;
};

const RawTrackingTable = ({ dfTracker }) => {
  if (!dfTracker || dfTracker.length === 0) return <p style={{color: 'var(--text-secondary)'}}>No data available.</p>;

  const allKeys = Object.keys(dfTracker[0]).filter(k => k !== '_sheet' && k !== '_rowNumber' && k !== '_rawData');
  
  const columnDefs = [
    { headerName: '#', valueGetter: 'node.rowIndex', pinned: 'left', width: 70 },
    ...allKeys.map(k => {
      const isPinned = k === 'Team_Name' || k === 'Member_Name';
      return { 
        field: k, 
        pinned: isPinned ? 'left' : null,
        minWidth: 120
      };
    })
  ];

  const defaultColDef = {
    sortable: true,
    filter: true,
    resizable: true,
    width: 150
  };

  return (
    <div className="ag-theme-alpine-dark" style={{ width: '100%', borderRadius: '0.5rem', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
      <AgGridReact
        rowData={dfTracker}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        suppressCellFocus={true}
        enableCellTextSelection={true}
        domLayout="autoHeight"
      />
    </div>
  )
}

export default function AdminDashboard({ onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("leaders");
  const [saving, setSaving] = useState(false);

  // Data
  const [currentDayNum, setCurrentDayNum] = useState(1);
  const [currentDayStr, setCurrentDayStr] = useState("");

  // Tabs states
  const [adminUpdates, setAdminUpdates] = useState({});
  const [adminRosterUpdates, setAdminRosterUpdates] = useState({});
  const [adminSelectedDay, setAdminSelectedDay] = useState("");
  const [showAdminDays, setShowAdminDays] = useState(false);
  const [reflection, setReflection] = useState("");
  const [reportText, setReportText] = useState("");
  const [leaderSearchQuery, setLeaderSearchQuery] = useState("");
  const [rosterSearchQuery, setRosterSearchQuery] = useState("");
  const reportRef = useRef(null);

  // Logs tab
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (reportText && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [reportText]);

  // Expanders
  const [expandAddTeam, setExpandAddTeam] = useState(false);
  const [expandUpdatePin, setExpandUpdatePin] = useState(false);
  const [expandSuperPin, setExpandSuperPin] = useState(false);
  const [expandRenameTeam, setExpandRenameTeam] = useState(false);
  const [expandManageTeams, setExpandManageTeams] = useState(false);
  const [expandBulkUpload, setExpandBulkUpload] = useState(false);
  const [expandRawData, setExpandRawData] = useState(false);

  const [settingsForm, setSettingsForm] = useState({ 
    currentRound: 1, 
    evictionThreshold: 5,
    challengeName: "",
    challengeEdition: "",
    totalDays: "",
    startDate: "",
    mornStart: "",
    mornEnd: "",
    eveStart: "",
    eveEnd: "",
    allowLeaderReporting: true
  });

  const [newTeam, setNewTeam] = useState({ name: '', pin: '' });
  const [pinUpdate, setPinUpdate] = useState({ team: '', pin: '' });
  const [superPin, setSuperPin] = useState("");
  const [renameTeam, setRenameTeam] = useState({ oldName: '', newName: '' });

  const [csvFile, setCsvFile] = useState(null);

  // Challenge Edition Switcher & Archiving States
  const [selectedEdition, setSelectedEdition] = useState('live');
  const [editionsList, setEditionsList] = useState([]);
  const [expandArchiveSection, setExpandArchiveSection] = useState(false);
  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [newEditionForm, setNewEditionForm] = useState({
    challengeName: '',
    challengeEdition: '',
    startDate: '',
    totalDays: '90'
  });
  const [archiving, setArchiving] = useState(false);

  // PDF Report Export States
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfScope, setPdfScope] = useState('general'); // 'general' | 'team'
  const [selectedPdfTeam, setSelectedPdfTeam] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [isReadingCompleted, setIsReadingCompleted] = useState(false);

  const handleGeneratePdf = async () => {
    setPdfGenerating(true);
    try {
      if (pdfScope === 'general') {
        const filename = await generateGeneralPdfReport({
          trackerData: data?.trackerData || [],
          settings: data?.settings || {},
          leadersData: data?.leadersData || [],
          validTeams: data?.validTeams || []
        });
        showToast(`Downloaded: ${filename}`);
      } else if (pdfScope === 'leaders') {
        const filename = await generateLeadersPdfReport({
          leadersData: data?.leadersData || [],
          settings: data?.settings || {}
        });
        showToast(`Downloaded: ${filename}`);
      } else {
        if (!selectedPdfTeam) {
          showToast("Please select a team to generate report.", "error");
          setPdfGenerating(false);
          return;
        }
        const filename = await generateTeamPdfReport({
          teamName: selectedPdfTeam,
          trackerData: data?.trackerData || [],
          settings: data?.settings || {},
          leadersData: data?.leadersData || []
        });
        showToast(`Downloaded: ${filename}`);
      }
      setShowPdfModal(false);
    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("Failed to generate PDF report", "error");
    } finally {
      setPdfGenerating(false);
    }
  };

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadData = (isManualRefresh = false) => {
    setLoading(true);
    return fetch(`/api/data?type=admin&t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.editionsList) setEditionsList(d.editionsList);
        setSelectedEdition(d.activeEditionId || (d.isArchive && d.archiveInfo?.id ? d.archiveInfo.id : 'live'));
        
        const isArch = d.isArchive === true;
        const startDateStr = d.settings?.Start_Date || new Date().toISOString().split('T')[0];
        const [sYear, sMonth, sDay] = startDateStr.split('-').map(Number);
        const startDate = sYear ? new Date(sYear, sMonth - 1, sDay) : new Date(startDateStr);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate.setHours(0, 0, 0, 0);

        const diffMs = today.getTime() - startDate.getTime();
        let elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
        if (elapsedDays < 1) elapsedDays = 1;

        const totalDays = parseInt(d.settings?.Total_Days || 0);

        // Challenge is completed once today's date reaches or passes the end date (or if in archive mode)
        const isCompleted = isArch || (totalDays > 0 && elapsedDays >= totalDays) ||
                            String(d.settings?.Is_Completed || '').toUpperCase() === 'TRUE' ||
                            String(d.settings?.Status || '').toLowerCase() === 'completed';
        setIsReadingCompleted(isCompleted);

        let activeDay = isArch && totalDays > 0 ? totalDays : elapsedDays;
        if (totalDays > 0 && activeDay > totalDays) {
          activeDay = totalDays;
        }
        const calcCurrentDay = `Day_${activeDay}`;

        setCurrentDayNum(activeDay);
        setCurrentDayStr(calcCurrentDay);
        if (!adminSelectedDay || isArch) setAdminSelectedDay(calcCurrentDay);
        setReflection(d.teamReflection || "");

        if (!isArch) {
          setSettingsForm({ 
            currentRound: parseInt(d.settings?.Current_Round || 1), 
            evictionThreshold: parseInt(d.settings?.Eviction_Threshold || 5),
            challengeName: d.settings?.Challenge_Name || "ECCF Bible Reading Challenge Tracker",
            challengeEdition: d.settings?.Challenge_Edition || "",
            totalDays: d.settings?.Total_Days || "",
            startDate: d.settings?.Start_Date || "",
            mornStart: parse12to24(d.settings?.Morning_Window_Start || "04:00 AM"),
            mornEnd: parse12to24(d.settings?.Morning_Window_End || "11:00 AM"),
            eveStart: parse12to24(d.settings?.Evening_Window_Start || "06:00 PM"),
            eveEnd: parse12to24(d.settings?.Evening_Window_End || "11:00 PM"),
            allowLeaderReporting: String(d.settings?.Allow_Leader_Reporting ?? 'TRUE').trim().toUpperCase() !== 'FALSE'
          });
        }

        const initialUpdates = {};
        if (d.leadersData) {
          d.leadersData.forEach(member => {
            if (String(member.Status || '').toLowerCase() === 'active') {
               const name = String(member['Team Leader'] || member.Name || member.Member_Name || '').trim();
               initialUpdates[name] = String(member[adminSelectedDay || calcCurrentDay] || '').toUpperCase() === 'TRUE';
            }
          });
        }
        setAdminUpdates(initialUpdates);
        setLoading(false);
        if (isManualRefresh === true) showToast("Dashboard is up-to-date!");
      })
      .catch(err => {
        setLoading(false);
        if (isManualRefresh === true) showToast("Error refreshing data", "error");
      });
  };

  const handleSwitchGlobalEdition = async (editionId) => {
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_switch_global_edition',
          payload: { editionId }
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.message || "Failed to switch edition");
      setSelectedEdition(editionId);
      showToast(editionId === 'live' ? "Globally switched system to Live Edition!" : "Globally switched system to Archived Edition!");
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Failed to switch active edition", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveChallenge = async () => {
    if (!newEditionForm.challengeEdition || !newEditionForm.startDate) {
      return showToast("Please provide the New Edition Subtitle and Start Date.", "error");
    }
    setArchiving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_archive_challenge',
          payload: {
            newChallengeName: newEditionForm.challengeName || data?.settings?.Challenge_Name,
            newEdition: newEditionForm.challengeEdition,
            newStartDate: newEditionForm.startDate,
            newTotalDays: newEditionForm.totalDays || "90"
          }
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.message || "Failed to archive challenge");
      
      showToast(`Challenge archived successfully! Blank slate ready for ${newEditionForm.challengeEdition}`);
      setArchiveModalOpen(false);
      setSelectedEdition('live');
      await loadData(false);
    } catch (e) {
      console.error(e);
      showToast(e.message || "Error archiving challenge", "error");
    } finally {
      setArchiving(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (data && data.leadersData) {
      const newUpdates = {};
      data.leadersData.forEach(member => {
        if (String(member.Status || '').toLowerCase() === 'active') {
          const name = String(member['Team Leader'] || member.Name || member.Member_Name || '').trim();
          newUpdates[name] = String(member[adminSelectedDay] || '').toUpperCase() === 'TRUE';
        }
      });
      setAdminUpdates(newUpdates);
    }
  }, [adminSelectedDay]);

  const handleAdminCheckbox = (name) => {
    setAdminUpdates(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleAdminSelectAll = (val) => {
    const newUpdates = { ...adminUpdates };
    const filteredLeaders = (data?.leadersData?.filter(m => String(m.Status || '').trim().toLowerCase() === 'active') || []).filter(m => {
      const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
      const team = String(m.Team || m.Team_Name || '').trim();
      const q = leaderSearchQuery.toLowerCase();
      return name.toLowerCase().includes(q) || team.toLowerCase().includes(q);
    });
    filteredLeaders.forEach(m => {
      const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
      newUpdates[name] = val;
    });
    setAdminUpdates(newUpdates);
  };

  const handleSaveAdminReport = async (generateReport = false) => {
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_report',
          payload: { 
            day: adminSelectedDay, 
            updates: adminUpdates, 
            reflection: adminSelectedDay === currentDayStr ? reflection : undefined,
            currentDayNum: parseInt(currentDayStr.split('_')[1] || "1"),
            evictionThreshold: parseInt(data?.settings?.Eviction_Threshold || "5")
          }
        })
      });
      if (!res.ok) {
        let errMessage = "Failed to save admin report";
        try { const errData = await res.json(); errMessage = errData.message || errData.error || errMessage; } catch(e) {}
        if (errMessage.includes('429') || errMessage.includes('Quota exceeded')) errMessage = "Server is busy (Code: 429). Please try again in a minute.";
        else if (errMessage.includes('Google API error')) errMessage = "Server Error (Code: 500). Please notify the admin.";
        throw new Error(errMessage);
      }
      
      const freshData = await loadData();
      
      if (generateReport) generateAdminWhatsappText(freshData);
      else showToast(`Saved Leaders updates for ${adminSelectedDay.replace('_', ' ')} successfully!`);
    } catch (e) {
      showToast(e.message || "FALLBACK ERROR: " + String(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdminRoster = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_update_roster',
          payload: { rosterUpdates: adminRosterUpdates }
        })
      });
      if (!res.ok) throw new Error("Failed to update team leaders roster");
      showToast("Leaders roster updated successfully!");
      loadData();
    } catch (e) {
      showToast("Error updating leaders roster", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateAdminWhatsappText = (freshData = null) => {
    const useData = freshData || data;
    const allLeaders = useData.leadersData || [];
    const activeLeaders = allLeaders.filter(m => String(m.Status || '').trim().toLowerCase() === 'active');
    
    const numAssigned = allLeaders.length;
    const numCommitted = activeLeaders.length;
    const numDeclined = allLeaders.filter(m => String(m.Status || '').trim().toLowerCase() === 'declined').length;
    const numLeft = allLeaders.filter(m => String(m.Status || '').trim().toLowerCase() === 'left').length;
    const numEvicted = allLeaders.filter(m => String(m.Status || '').trim().toLowerCase() === 'evicted').length;

    const daysPerRound = 10;
    const currentRound = Math.floor((currentDayNum - 1) / daysPerRound) + 1;
    const evictionThreshold = parseInt(useData.settings?.Eviction_Threshold || 5);
    const currentRoundStart = Math.floor((currentDayNum - 1) / daysPerRound) * daysPerRound + 1;
    
    let previousRoundsStr = "";
    if (currentRound > 1) {
      let prevRoundTexts = [];
      const startRound = Math.max(1, currentRound - 1);
      for (let r = startRound; r < currentRound; r++) {
        let roundIsComplete = true;
        let pastRoundBreakdown = [];
        const endDay = r * daysPerRound;
        const startDay = endDay - 4;
        
        for (let d = startDay; d <= endDay; d++) {
          const dayCol = `Day_${d}`;
          let completedCount = 0;
          activeLeaders.forEach(m => {
            if (String(m[dayCol] || '').toUpperCase() === 'TRUE') completedCount++;
          });
          pastRoundBreakdown.push(`- Day ${d}: ${completedCount.toString().padStart(2,'0')}/${numCommitted.toString().padStart(2,'0')}`);
          if (completedCount < numCommitted) roundIsComplete = false;
        }
        
        if (roundIsComplete) {
           prevRoundTexts.push(`   *ROUND ${r} ✅*\\n- Completed ✅`);
        } else {
           prevRoundTexts.push(`   *ROUND ${r}*\\n${pastRoundBreakdown.join('\\n')}`);
        }
      }
      previousRoundsStr = prevRoundTexts.join('\\n\\n') + '\\n\\n';
    }

    let currentRoundBreakdownList = [];
    for (let d = currentRoundStart; d <= currentDayNum; d++) {
      const dayCol = `Day_${d}`;
      let completedCount = 0;
      activeLeaders.forEach(m => {
        const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
        const val = (d === currentDayNum && adminSelectedDay === currentDayStr) ? adminUpdates[name] : (String(m[dayCol] || '').toUpperCase() === 'TRUE');
        if (val) completedCount++;
      });
      currentRoundBreakdownList.push(`- Day ${d}: ${completedCount.toString().padStart(2,'0')}/${numCommitted.toString().padStart(2,'0')}`);
    }
    const roundBreakdownStr = currentRoundBreakdownList.join('\\n');

    let yetToUpdate = [];
    let upToDate = [];
    let evictionList = [];
    
    const daysLeftInRound = (currentRoundStart + daysPerRound - 1) - currentDayNum;
    const showEvictionList = daysLeftInRound <= 3; 

    activeLeaders.forEach(m => {
      let missedDays = [];
      const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
      let lastCompletedDay = 0;
      for (let i = 1; i <= currentDayNum; i++) {
        const dStr = `Day_${i}`;
        const val = (i === currentDayNum && adminSelectedDay === currentDayStr) ? adminUpdates[name] : (String(m[dStr] || '').toUpperCase() === 'TRUE');
        if (!val) {
          missedDays.push(i);
        } else {
          lastCompletedDay = i;
        }
      }
      
      const daysBehindRoundEnd = (currentRound * daysPerRound) - lastCompletedDay;
      
      const teamStr = m.Team || m.Team_Name || "Unknown";
      const memberNameStr = `${name} (${teamStr})`;
      
      if (missedDays.length > 0) {
        const daysStr = missedDays.length === 1 ? `Day ${missedDays[0]}` : `Day ${missedDays[0]} - ${missedDays[missedDays.length - 1]}`;
        yetToUpdate.push(`* @${memberNameStr} (${daysStr})`);
        if (showEvictionList && daysBehindRoundEnd > evictionThreshold) {
           const dayWord = daysBehindRoundEnd === 1 ? "day" : "days";
           evictionList.push(`* @${memberNameStr} (${daysBehindRoundEnd} ${dayWord} behind)`);
        }
      } else {
        upToDate.push(`* @${memberNameStr}`);
      }
    });

    const yetToUpdateStr = yetToUpdate.length ? yetToUpdate.join('\\n') : "- None 🎉";
    const upToDateStr = upToDate.length ? upToDate.join('\\n') : "- None";
    let evictionSection = "";
    if (showEvictionList) {
       const evictStr = evictionList.length ? evictionList.join('\\n') : "- None 🎉";
       evictionSection = `\\n\\n*Eviction List 🚨🚨🚨*\\n_(Members behind by more than ${evictionThreshold} days. Eviction takes effect next round!)_\\n${evictStr}`;
    }

    const challengeHeader = data?.settings?.Challenge_Name || 'ECCF Bible Reading Club';
    const text = `*${challengeHeader}*\n\n*Daily Reading Report*\n\n*GLOBAL TEAM LEADERS*\n\n*Team Status Update*\n- *Number Assigned*: ${numAssigned.toString().padStart(2,'0')}\n- *Number Committed*: ${numCommitted.toString().padStart(2,'0')}\n- *Number Declined*: ${numDeclined.toString().padStart(2,'0')}\n- *Number Left*: ${numLeft.toString().padStart(2,'0')}\n- *Number Evicted*: ${numEvicted.toString().padStart(2,'0')}\n- *Number Settled*: ${numCommitted.toString().padStart(2,'0')}\n\n*Bible Reading Team Report 📃*\n\n${previousRoundsStr}   *ROUND ${currentRound} ✅*\n${roundBreakdownStr}\n\n*YET TO UPDATE 🤲✨*\n${yetToUpdateStr}\n\n*UP-TO-DATE 🤩🚀*\n${upToDateStr}${evictionSection}\n\n*REFLECTION*\n*${reflection}*`;
    setReportText(text.replace(/\\n/g, '\n'));
  };

  const handleToggleLeaderReporting = async (newState) => {
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_toggle_leader_reporting',
          payload: { allowLeaderReporting: newState ? 'TRUE' : 'FALSE' }
        })
      });
      const resData = await res.json();
      if (!res.ok || !resData.success) throw new Error(resData.error || resData.message || "Failed to update reporting status");
      showToast(newState ? "Team Leader reporting is now ACTIVE (Enabled)!" : "Team Leader reporting is now PAUSED (Disabled)!");
      await loadData();
    } catch (err) {
      console.error(err);
      showToast(err.message || "Error updating reporting status", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        currentRound: settingsForm.currentRound,
        evictionThreshold: settingsForm.evictionThreshold,
        Challenge_Name: settingsForm.challengeName,
        Challenge_Edition: settingsForm.challengeEdition,
        Total_Days: settingsForm.totalDays,
        Start_Date: settingsForm.startDate,
        Morning_Window_Start: parse24to12(settingsForm.mornStart),
        Morning_Window_End: parse24to12(settingsForm.mornEnd),
        Evening_Window_Start: parse24to12(settingsForm.eveStart),
        Evening_Window_End: parse24to12(settingsForm.eveEnd),
        Allow_Leader_Reporting: settingsForm.allowLeaderReporting ? 'TRUE' : 'FALSE'
      };
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_settings', payload })
      });
      if (!res.ok) throw new Error("Failed to save settings");
      showToast("System policies updated successfully!");
      loadData();
    } catch (e) { showToast("Error saving policies", "error"); } finally { setSaving(false); }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name || !newTeam.pin) return showToast("Provide both name and PIN.", "error");
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_add_team', payload: { newTeamName: newTeam.name.toUpperCase(), newTeamPin: newTeam.pin } })
      });
      if (!res.ok) throw new Error("Failed to add team");
      showToast(`Team ${newTeam.name} added!`);
      setNewTeam({name: '', pin: ''});
      loadData();
    } catch (e) { showToast("Error adding team", "error"); } finally { setSaving(false); }
  };

  const handleUpdatePin = async () => {
    if (!pinUpdate.team || !pinUpdate.pin) return showToast("Select team and provide PIN.", "error");
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_update_pin', payload: { team: pinUpdate.team, newPin: pinUpdate.pin } })
      });
      if (!res.ok) throw new Error("Failed to update PIN");
      showToast(`PIN for ${pinUpdate.team} updated!`);
      setPinUpdate({team: '', pin: ''});
      loadData();
    } catch (e) { showToast("Error updating PIN", "error"); } finally { setSaving(false); }
  };

  const handleUpdateSuperPin = async () => {
    if (!superPin) return showToast("Provide a new Super Admin PIN.", "error");
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_update_super_pin', payload: { newPin: superPin } })
      });
      if (!res.ok) throw new Error("Failed to update Super PIN");
      showToast("Super Admin PIN updated successfully!");
      setSuperPin("");
    } catch (e) { showToast("Error updating Super Admin PIN", "error"); } finally { setSaving(false); }
  };

  const handleRenameTeam = async () => {
    if (!renameTeam.oldName || !renameTeam.newName) return showToast("Provide both old and new names.", "error");
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_rename_team', payload: { oldTeamName: renameTeam.oldName, newTeamName: renameTeam.newName.toUpperCase() } })
      });
      if (!res.ok) throw new Error("Failed to rename team");
      showToast(`Successfully renamed ${renameTeam.oldName} to ${renameTeam.newName.toUpperCase()} across all databases!`);
      setRenameTeam({oldName: '', newName: ''});
      loadData();
    } catch (e) { showToast("Error renaming team", "error"); } finally { setSaving(false); }
  };

  const handleDeleteTeam = async (teamToDelete) => {
    if (!window.confirm(`Are you sure you want to permanently delete team "${teamToDelete}" from the active challenge?`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_delete_team', payload: { teamName: teamToDelete } })
      });
      if (!res.ok) throw new Error("Failed to delete team");
      showToast(`Team "${teamToDelete}" removed successfully.`);
      loadData();
    } catch (e) {
      showToast("Error deleting team", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleBulkUpload = async () => {
    if (!csvFile) return showToast("Please select a CSV file first.", "error");
    setSaving(true);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const members = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx]; });
        if (row['Team_Name'] && row['Member_Name']) members.push(row);
      }

      try {
        const res = await fetch('/api/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'admin_bulk_upload', payload: { members } })
        });
        if (!res.ok) throw new Error("Failed to upload CSV");
        showToast(`Successfully onboarded ${members.length} new members!`);
        setCsvFile(null);
        loadData();
      } catch (e) { showToast("Error uploading CSV", "error"); } finally { setSaving(false); }
    };
    reader.readAsText(csvFile);
  };


  if (loading && !data) return <div className="loader-container"><div className="spinner"></div><p>Loading Command Center...</p></div>;

  const activeLeaders = data?.leadersData?.filter(m => String(m.Status || '').trim().toLowerCase() === 'active') || [];
  const daysList = Array.from({length: currentDayNum}, (_, i) => `Day_${i+1}`);
  const isLeaderReportingAllowed = String(data?.settings?.Allow_Leader_Reporting ?? 'TRUE').trim().toUpperCase() !== 'FALSE';

  return (
    <div className="container">
      {toast.show && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'error' ? '✖' : '✔'}
            </span>
            <span className="toast-message">{toast.message}</span>
          </div>
        </div>
      )}
      <div className="tracker-header-wrap">
        <div className="tracker-header-title">
          <img src="/eccfbrclogo.png" alt="Logo" />
          <span>Admin Command Center</span>
        </div>
        <div className="tracker-header-actions">
          <a
            href="/admin/quiz"
            title="Open Quiz Control Center"
            className="tracker-btn-quiz"
          >
            <Trophy size={16} /> <span>Quiz Hub</span>
          </a>
          <InstallPwaButton />
          <button 
            onClick={() => loadData(true)} 
            disabled={loading} 
            title="Refresh Data"
            className="tracker-btn-icon"
            style={{ opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={17} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
          <button 
            onClick={onLogout} 
            className="tracker-btn-logout"
            title="Logout"
          >
            <LogOut size={16} /> <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="tracker-tabs-bar">
        <button className={`tracker-tab-pill ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
          <BarChart3 size={15} /> <span>Overview</span>
        </button>
        <button className={`tracker-tab-pill ${activeTab === 'leaders' ? 'active' : ''}`} onClick={() => setActiveTab('leaders')}>
          <FileText size={15} /> <span>Reports</span>
        </button>
        <button className={`tracker-tab-pill ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>
          <Users size={15} /> <span>Roster</span>
        </button>
        <button className={`tracker-tab-pill ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>
          <Settings size={15} /> <span>Settings</span>
        </button>
        <button className={`tracker-tab-pill ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => { setActiveTab('logs'); fetchLogs(); }}>
          <Activity size={15} /> <span>Logs</span>
        </button>
      </div>

      {/* Global Edition & Quick Actions Switcher Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.6rem 0.85rem', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border-light)', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Active Edition:
          </span>
          <select
            value={selectedEdition}
            onChange={(e) => {
              const newEdition = e.target.value;
              handleSwitchGlobalEdition(newEdition);
            }}
            className="tracker-edition-select"
          >
            <option value="live">
              🟢 Live Challenge: {data?.isArchive ? "Current Live Sheet" : (data?.settings?.Challenge_Edition || "Active Challenge")}
            </option>
            {editionsList && editionsList.map(arch => (
              <option key={arch.id} value={arch.id}>
                📁 Archive: {arch.edition} ({arch.startDate || 'Past'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => handleToggleLeaderReporting(!isLeaderReportingAllowed)}
            disabled={saving}
            title={isLeaderReportingAllowed ? "Leader reporting is currently ACTIVE. Click to Pause/Deactivate save buttons." : "Leader reporting is PAUSED. Click to Activate save buttons."}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '0.45rem',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer',
              border: isLeaderReportingAllowed 
                ? '1px solid rgba(16, 185, 129, 0.4)' 
                : '1px solid rgba(239, 68, 68, 0.4)',
              background: isLeaderReportingAllowed 
                ? 'rgba(16, 185, 129, 0.15)' 
                : 'rgba(239, 68, 68, 0.15)',
              color: isLeaderReportingAllowed ? '#34D399' : '#F87171',
              transition: 'all 0.18s ease'
            }}
          >
            <Power size={13} />
            <span>{isLeaderReportingAllowed ? 'Leader Reporting: ON' : 'Leader Reporting: OFF'}</span>
          </button>

          {isReadingCompleted && (
            <button
              onClick={() => setShowPdfModal(true)}
              className="tracker-btn-pdf"
              title="Download Official PDF Reports"
              style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
            >
              <FileDown size={14} /> <span>PDF Reports</span>
            </button>
          )}

          {data?.isArchive && (
            <button 
              onClick={() => handleSwitchGlobalEdition('live')}
              className="tracker-btn-archive-return"
              title="Return entire system to live tracking"
            >
              ↩ Return to Live Challenge
            </button>
          )}
        </div>
      </div>

      {/* Global Archive Notice Banner */}
      {data?.isArchive && (
        <div className="tracker-archive-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Archive size={20} color="#F59E0B" />
            <div>
              <div style={{ fontWeight: '700', color: '#FDE68A', fontSize: '0.92rem' }}>
                Globally Active Archived Edition: {data?.settings?.Challenge_Edition || 'Past Challenge'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#CBD5E1', marginTop: '0.15rem' }}>
                Period: {data?.settings?.Start_Date || 'N/A'} • {data?.settings?.Total_Days || '90'} Days • Active across entire system & team leader logins • Editing Enabled
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leaders' && (
        <div className="card">

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: '800', margin: 0, color: 'var(--text-primary)' }}>
                Mark Daily Updates for Team Leaders
              </h3>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Tap on each leader's card to record reading progress for the day.
              </p>
            </div>
            {isReadingCompleted && (
              <button
                onClick={() => setShowPdfModal(true)}
                className="tracker-btn-pdf"
                title="Download PDF Reports"
              >
                <FileDown size={16} /> <span>PDF Reports</span>
              </button>
            )}
          </div>
          
          {/* Modern Date Stepper Card */}
          <div className="tracker-date-card">
            <button 
              onClick={() => {
                const currentNum = parseInt(adminSelectedDay.split('_')[1]);
                if (currentNum > 1) setAdminSelectedDay(`Day_${currentNum - 1}`);
              }}
              disabled={parseInt(adminSelectedDay.split('_')[1] || "1") <= 1}
              className="tracker-stepper-btn"
              title="Previous Day"
            >
              <ChevronLeft size={20} />
            </button>
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: '800' }}>
                Updating
              </span>
              <span style={{ fontSize: '1.5rem', fontWeight: '900', lineHeight: '1.1', color: '#F9FAFB', letterSpacing: '0.5px' }}>
                {adminSelectedDay.replace('_', ' ')}
              </span>
              <button 
                onClick={() => adminSelectedDay !== currentDayStr && setAdminSelectedDay(currentDayStr)} 
                title={adminSelectedDay === currentDayStr ? "Already viewing today" : "Jump to Today"} 
                className="tracker-today-btn"
                style={{ 
                  background: adminSelectedDay === currentDayStr ? 'rgba(255,255,255,0.06)' : 'var(--accent-light)', 
                  border: `1px solid ${adminSelectedDay === currentDayStr ? 'var(--border-light)' : 'var(--accent)'}`, 
                  color: adminSelectedDay === currentDayStr ? 'var(--text-secondary)' : 'var(--accent-hover)', 
                  cursor: adminSelectedDay === currentDayStr ? 'default' : 'pointer'
                }}
              >
                <CalendarDays size={13} /> {adminSelectedDay === currentDayStr ? "Today" : "Jump to Today"}
              </button>
            </div>

            <button 
              onClick={() => {
                const currentNum = parseInt(adminSelectedDay.split('_')[1]);
                if (currentNum < currentDayNum) setAdminSelectedDay(`Day_${currentNum + 1}`);
              }}
              disabled={adminSelectedDay === currentDayStr}
              className="tracker-stepper-btn"
              title="Next Day"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div>
            {/* Search Input Bar */}
            <div className="tracker-search-wrap">
              <Search className="search-icon" size={16} />
              <input 
                type="text" 
                placeholder="Search leaders by name or team..." 
                value={leaderSearchQuery} 
                onChange={e => setLeaderSearchQuery(e.target.value)}
                className="tracker-search-input"
              />
              {leaderSearchQuery && (
                <button
                  onClick={() => setLeaderSearchQuery("")}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 0
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Stats Toolbar & Select All */}
            {(() => {
              const filteredLeaders = activeLeaders.filter(m => {
                const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
                const team = String(m.Team || m.Team_Name || '').trim();
                const q = leaderSearchQuery.toLowerCase();
                return name.toLowerCase().includes(q) || team.toLowerCase().includes(q);
              });
              const checkedCount = filteredLeaders.filter(m => adminUpdates[String(m['Team Leader'] || m.Name || m.Member_Name || '').trim()]).length;
              const allSelected = filteredLeaders.length > 0 && checkedCount === filteredLeaders.length;
              const percent = filteredLeaders.length > 0 ? Math.round((checkedCount / filteredLeaders.length) * 100) : 0;

              return (
                <div className="tracker-toolbar">
                  <span className="tracker-counter-badge">
                    <CheckCheck size={14} color="#38BDF8" />
                    <span><strong>{checkedCount}</strong> of <strong>{filteredLeaders.length}</strong> Completed ({percent}%)</span>
                  </span>

                  <button 
                    onClick={() => handleAdminSelectAll(!allSelected)} 
                    className="tracker-select-all-btn"
                  >
                    {allSelected ? '✕ Deselect All' : '✓ Select All'}
                  </button>
                </div>
              );
            })()}

            {/* Responsive Touch Tiles Grid */}
            {(() => {
              const filteredLeaders = activeLeaders.filter(m => {
                const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
                const team = String(m.Team || m.Team_Name || '').trim();
                const q = leaderSearchQuery.toLowerCase();
                return name.toLowerCase().includes(q) || team.toLowerCase().includes(q);
              });

              if (filteredLeaders.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--surface-secondary)', borderRadius: '0.65rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                    <p style={{ margin: 0, fontWeight: '600' }}>No leaders found matching "{leaderSearchQuery}"</p>
                  </div>
                );
              }

              return (
                <div className="tracker-check-grid">
                  {filteredLeaders.map(m => {
                    const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
                    const isChecked = !!adminUpdates[name];
                    const teamName = m.Team || m.Team_Name || "Team Leader";

                    return (
                      <div 
                        key={name}
                        onClick={() => handleAdminCheckbox(name)}
                        className={`tracker-check-tile ${isChecked ? 'active' : ''}`}
                      >
                        <div className="tracker-tile-checkbox">
                          {isChecked && <Check size={14} strokeWidth={3} />}
                        </div>
                        <div className="tracker-tile-info">
                          <span className="tracker-tile-name">{name}</span>
                          <span className="tracker-tile-badge">
                            {teamName}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Daily Reflection Scripture Box */}
            {adminSelectedDay === currentDayStr && (
              <div className="tracker-scripture-box">
                <div className="tracker-scripture-header">
                  <BookOpen size={16} color="#818CF8" />
                  <span>Daily Reflection Scripture (Auto-saved for this session):</span>
                </div>
                <textarea 
                  className="tracker-scripture-textarea" 
                  rows="3" 
                  value={reflection} 
                  onChange={e => setReflection(e.target.value)} 
                  placeholder="e.g., 'For the word of God is living and powerful, and sharper than any two-edged sword...' Heb. 4:12"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                onClick={() => handleSaveAdminReport(false)} 
                disabled={saving} 
                className="tracker-btn-save"
              >
                <span>{saving ? 'Saving...' : `💾 Save ${adminSelectedDay.replace('_', ' ')} Updates`}</span>
              </button>
              
              {adminSelectedDay === currentDayStr && (
                <button 
                  onClick={() => handleSaveAdminReport(true)} 
                  disabled={saving} 
                  className="tracker-btn-report"
                >
                  <span>📋 Generate Daily Report</span>
                </button>
              )}
            </div>
          </div>

          {reportText && (
            <div ref={reportRef} className="card mt-4" style={{ border: '1px solid var(--accent)' }}>
              <div style={{ padding: '0.5rem' }}>
                <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📱 <span>Copy Your Daily Report</span>
                </h3>
                <pre style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.5' }}>{reportText}</pre>
                <button className="tracker-btn-report mt-2" onClick={() => { navigator.clipboard.writeText(reportText); showToast("Copied to clipboard!"); }}>
                  <Check size={16} /> <span>Copy to Clipboard</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="card">
          <h3 className="mb-2">Manage Team Leaders Roster</h3>
          <p className="label mb-3">Update a leader's status if they have been evicted or declined the challenge. Changes made here will update the Leaders Tracker Data.</p>
          
          <input 
            type="text" 
            placeholder="Search roster by name or team..." 
            value={rosterSearchQuery} 
            onChange={e => setRosterSearchQuery(e.target.value)}
            className="input-field"
            style={{ marginBottom: '1rem' }}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data?.leadersData || []).filter(m => {
              const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
              const team = String(m.Team || m.Team_Name || '').trim();
              const q = rosterSearchQuery.toLowerCase();
              return name.toLowerCase().includes(q) || team.toLowerCase().includes(q);
            }).map(m => {
              const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
              if (!name) return null;
              const currentStatus = adminRosterUpdates[name] || String(m.Status || '').trim() || 'Active';
              
              let statusColor = "var(--text-primary)";
              let statusBg = "var(--surface)";
              let statusBorder = "var(--border-light)";
              
              if (currentStatus === "Active") {
                statusColor = "var(--success)";
                statusBorder = "var(--success)";
                statusBg = "rgba(33, 195, 84, 0.1)";
              } else if (currentStatus === "Evicted") {
                statusColor = "var(--error)";
                statusBorder = "var(--error)";
                statusBg = "rgba(255, 43, 43, 0.1)";
              } else if (currentStatus === "Left" || currentStatus === "Declined") {
                statusColor = "var(--warning)";
                statusBorder = "var(--warning)";
                statusBg = "rgba(255, 183, 3, 0.1)";
              }

              return (
                <div key={name} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  background: 'var(--surface-secondary)', 
                  padding: '0.75rem 1rem', 
                  borderRadius: '0.5rem',
                  borderLeft: `4px solid ${statusBorder}`,
                  gap: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      width: '32px', height: '32px', borderRadius: '50%', 
                      backgroundColor: 'var(--surface)', display: 'flex', 
                      justifyContent: 'center', alignItems: 'center', 
                      fontWeight: 'bold', color: 'var(--accent)', flexShrink: 0
                    }}>
                       {name.trim().charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.2', display: 'block', wordBreak: 'break-word' }}>{name}</span>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{m.Team || m.Team_Name || "Unknown Team"}</div>
                    </div>
                  </div>
                  
                  <select 
                    style={{ 
                      padding: '0.5rem', 
                      borderRadius: '0.4rem', 
                      background: statusBg, 
                      color: statusColor, 
                      border: `1px solid ${statusBorder}`,
                      fontWeight: '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontSize: '0.85rem'
                    }} 
                    value={currentStatus}
                    onChange={(e) => setAdminRosterUpdates(prev => ({ ...prev, [name]: e.target.value }))}
                  >
                    <option value="Active" style={{ color: 'var(--text-primary)', background: 'var(--surface)' }}>Active</option>
                    <option value="Evicted" style={{ color: 'var(--text-primary)', background: 'var(--surface)' }}>Evicted</option>
                    <option value="Left" style={{ color: 'var(--text-primary)', background: 'var(--surface)' }}>Left</option>
                    <option value="Declined" style={{ color: 'var(--text-primary)', background: 'var(--surface)' }}>Declined</option>
                  </select>
                </div>
              );
            })}
          </div>
          <button onClick={handleSaveAdminRoster} disabled={saving} style={{ marginTop: '1rem', backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s ease', width: '100%' }}>{saving ? 'Saving...' : '💾 Save Roster Updates'}</button>
        </div>
      )}

      {activeTab === 'analytics' && (() => {
        const dfTracker = data?.trackerData || [];
        const dfActive = dfTracker.filter(m => String(m.Status || '').trim().toLowerCase() === 'active');
        const totalMembers = dfTracker.length;
        const activeMembers = dfActive.length;
        const evictedMembers = dfTracker.filter(m => String(m.Status || '').trim().toLowerCase() === 'evicted').length;
        const declinedMembers = dfTracker.filter(m => String(m.Status || '').trim().toLowerCase() === 'declined').length;

        let todayReads = 0;
        if (activeMembers > 0) {
           todayReads = dfActive.filter(m => String(m[currentDayStr] || '').toUpperCase() === 'TRUE').length;
        }
        const completionRate = activeMembers > 0 ? todayReads / activeMembers : 0;

        const trendData = [];
        for (let i = 1; i <= currentDayNum; i++) {
          const dayCol = `Day_${i}`;
          const reads = dfTracker.filter(m => String(m[dayCol] || '').toUpperCase() === 'TRUE').length;
          trendData.push({ day: i, participants: reads });
        }

        const teamsMap = {};
        dfTracker.forEach(m => {
          const t = m.Team_Name || m.Team || m['Team Name'];
          if (!t) return;
          if (!teamsMap[t]) {
            const teamLeadersInfo = (data?.leadersData || []).filter(l => {
              const lTeam = l.Team_Name || l.Team || l['Team Name'] || l['Team Leader Team Name'];
              return String(lTeam || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase() === String(t || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
            });
            const leaderName = teamLeadersInfo[0]?.Member_Name || teamLeadersInfo[0]?.Name || teamLeadersInfo[0]?.['Team Leader'] || 'N/A';
            const assistantName = teamLeadersInfo[1]?.Member_Name || teamLeadersInfo[1]?.Name || teamLeadersInfo[1]?.['Team Leader'] || 'N/A';
            teamsMap[t] = { active: 0, evicted: 0, declined: 0, total: 0, todayReads: 0, leaderName, assistantName };
          }
          teamsMap[t].total++;
          const status = String(m.Status || '').trim().toLowerCase();
          if (status === 'active') {
            teamsMap[t].active++;
            if (String(m[currentDayStr] || '').toUpperCase() === 'TRUE') {
              teamsMap[t].todayReads++;
            }
          } else if (status === 'evicted') {
            teamsMap[t].evicted++;
          } else if (status === 'declined' || status === 'left') {
            teamsMap[t].declined++;
          }
        });

        const teamsData = Object.entries(teamsMap).map(([team, stats]) => {
          const survivalRate = stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0;
          const completionRate = stats.active > 0 ? ((stats.todayReads / stats.active) * 100).toFixed(1) : 0;
          return { team, ...stats, survivalRate: Number(survivalRate), completionRate: Number(completionRate) };
        });

        const leaderboardData = [...teamsData].sort((a, b) => b.completionRate - a.completionRate);

        const getExportFileName = (prefix) => {
          const round = data?.settings?.Current_Round || 1;
          const dateStr = new Date().toISOString().split('T')[0];
          return `${prefix}_Round_${round}_Day_${currentDayNum}_${dateStr}.png`;
        };

        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '800' }}>📊 Challenge Analytics & Reports</h2>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Real-time statistics, completion progress, and publication-ready executive reports
                </p>
              </div>
              {isReadingCompleted && (
                <button
                  onClick={() => setShowPdfModal(true)}
                  className="tracker-btn-pdf"
                  title="Download PDF Reports"
                >
                  <FileDown size={16} /> <span>PDF Reports</span>
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.5rem', textAlign: 'center' }}><p style={{fontSize:'0.9rem', color:'var(--text-secondary)', margin:0}}>Total Assigned</p><h2 style={{margin:'5px 0 0 0', fontSize:'2rem'}}>{totalMembers}</h2></div>
              <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.5rem', textAlign: 'center' }}><p style={{fontSize:'0.9rem', color:'var(--text-secondary)', margin:0}}>Active Readers</p><h2 style={{margin:'5px 0 0 0', fontSize:'2rem'}}>{activeMembers}</h2></div>
              <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.5rem', textAlign: 'center' }}><p style={{fontSize:'0.9rem', color:'var(--text-secondary)', margin:0}}>Total Evicted</p><h2 style={{margin:'5px 0 0 0', fontSize:'2rem'}}>{evictedMembers}</h2></div>
              <div style={{ padding: '1rem', background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.5rem', textAlign: 'center' }}><p style={{fontSize:'0.9rem', color:'var(--text-secondary)', margin:0}}>Declined/Left</p><h2 style={{margin:'5px 0 0 0', fontSize:'2rem'}}>{declinedMembers}</h2></div>
            </div>

            <h3 className="mb-2">🟢 Today's Live Reading Pulse</h3>
            <div style={{ width: '100%', backgroundColor: 'var(--surface-secondary)', borderRadius: '0.5rem', height: '24px', overflow: 'hidden', marginBottom: '0.5rem' }}>
               <div style={{ width: `${completionRate * 100}%`, backgroundColor: 'var(--accent)', height: '100%' }}></div>
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>{todayReads} out of {activeMembers} active members have read today ({(completionRate*100).toFixed(1)}%)</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 350px), 1fr))', gap: '2rem', marginBottom: '3rem' }}>
              
              <div style={{ maxWidth: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', margin: 0 }}>🏆 Today's Leaderboard</h3>
                  {todayReads > 0 && (
                    <button 
                      onClick={async () => {
                        const el = document.getElementById('leaderboard-table');
                        if (!el) return;
                        const html2canvas = (await import('html2canvas')).default;
                        const canvas = await html2canvas(el, { backgroundColor: '#0f172a' });
                        const pngUrl = canvas.toDataURL('image/png');
                        const a = document.createElement('a');
                        a.href = pngUrl;
                        a.download = getExportFileName('leaderboard');
                        a.click();
                      }}
                      style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                    >
                      📥 PNG
                    </button>
                  )}
                </div>
                {todayReads === 0 ? (
                  <div style={{ background: '#1e293b', color: '#60a5fa', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid #3b82f6', textAlign: 'center', width: '100%', boxSizing: 'border-box' }}>
                    No reading data available for today yet.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                    <div id="leaderboard-table" style={{ minWidth: 'max-content', background: 'var(--surface)', padding: '1.5rem' }}>
                      <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                        <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '800' }}>🏆 Daily Leaderboard</h2>
                        <p style={{ margin: '0.4rem 0 0 0', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{adminSelectedDay.replace('_', ' ')}</p>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                          <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Rank</th>
                          <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Team</th>
                          <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Completion %</th>
                          <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Reads</th>
                        </tr>
                      </thead>
                      <tbody>
                        {leaderboardData.map((t, idx) => (
                          <tr key={t.team} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>#{idx + 1}</td>
                            <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold', border: '1px solid var(--border-light)' }}>{t.team}</td>
                            <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.completionRate}</td>
                            <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.todayReads}/{t.active}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                )}
              </div>

              <div style={{ maxWidth: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem', margin: 0 }}>🏥 Team Health Check</h3>
                  <button 
                    onClick={async () => {
                      const el = document.getElementById('team-health-table');
                      if (!el) return;
                      const html2canvas = (await import('html2canvas')).default;
                      const canvas = await html2canvas(el, { backgroundColor: '#0f172a' });
                      const pngUrl = canvas.toDataURL('image/png');
                      const a = document.createElement('a');
                      a.href = pngUrl;
                      a.download = getExportFileName('team_health');
                      a.click();
                    }}
                    style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: '#ffffff', padding: '0.15rem 0.5rem', borderRadius: '0.4rem', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                  >
                    📥 PNG
                  </button>
                </div>
                <div style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                  <div id="team-health-table" style={{ minWidth: 'max-content', background: 'var(--surface)', padding: '1.5rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                      <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '800' }}>❤️ Team Health Check</h2>
                      <p style={{ margin: '0.4rem 0 0 0', color: 'var(--accent)', fontWeight: 'bold', fontSize: '1rem', letterSpacing: '1px', textTransform: 'uppercase' }}>{adminSelectedDay.replace('_', ' ')}</p>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Team</th>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Active</th>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Evicted</th>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Declined</th>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Total</th>
                        <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Surv Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamsData.sort((a, b) => a.team.localeCompare(b.team)).map((t) => (
                        <tr key={t.team} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold', border: '1px solid var(--border-light)' }}>{t.team}</td>
                          <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.active}</td>
                          <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.evicted}</td>
                          <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.declined}</td>
                          <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.total}</td>
                          <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{t.survivalRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="mb-0" style={{ fontSize: '1.8rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>📈 Historical Engagement Trend</h2>
              <button 
                onClick={() => {
                  const svgNode = document.querySelector('#engagement-chart svg');
                  if (!svgNode) return;
                  
                  const clonedNode = svgNode.cloneNode(true);
                  const rect = svgNode.getBoundingClientRect();
                  clonedNode.setAttribute('width', rect.width);
                  clonedNode.setAttribute('height', rect.height);
                  
                  const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                  bgRect.setAttribute("width", "100%");
                  bgRect.setAttribute("height", "100%");
                  bgRect.setAttribute("fill", "#0E1117");
                  clonedNode.insertBefore(bgRect, clonedNode.firstChild);
                  
                  const svgData = new XMLSerializer().serializeToString(clonedNode);
                  const sanitizedSvg = svgData
                    .replace(/var\(--border-light\)/g, 'rgba(250,250,250,0.1)')
                    .replace(/var\(--text-secondary\)/g, '#e2e8f0')
                    .replace(/var\(--accent\)/g, '#00BFFF');
                    
                  const blob = new Blob([sanitizedSvg], { type: 'image/svg+xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    
                    const pngUrl = canvas.toDataURL('image/png');
                    const a = document.createElement('a');
                    a.href = pngUrl;
                    a.download = getExportFileName('engagement_trend');
                    a.click();
                    URL.revokeObjectURL(url);
                  };
                  img.src = url;
                }}
                style={{ background: 'var(--accent)', border: '1px solid var(--accent)', color: '#ffffff', padding: '0.25rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                📥 Export PNG
              </button>
            </div>
            <div id="engagement-chart" style={{ height: '350px', width: '100%', marginBottom: '2rem' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="0" vertical={false} stroke="rgba(250, 250, 250, 0.1)" />
                  <XAxis 
                    dataKey="day" 
                    stroke="rgba(250, 250, 250, 0.1)" 
                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                    tickMargin={10}
                    label={{ value: 'Reading Days', position: 'bottom', offset: 0, fill: '#e2e8f0', fontSize: 14 }} 
                  />
                  <YAxis 
                    stroke="rgba(250, 250, 250, 0.1)" 
                    tick={{ fill: '#e2e8f0', fontSize: 12 }}
                    tickMargin={10}
                    label={{ value: 'Number of Participants', angle: -90, position: 'insideLeft', offset: 0, fill: '#e2e8f0', fontSize: 14 }} 
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#0E1117', border: '1px solid var(--accent)', borderRadius: '0.5rem', color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}
                    itemStyle={{ color: 'var(--accent)', fontWeight: 'bold', fontSize: '1rem' }}
                    labelStyle={{ color: '#e2e8f0', fontWeight: '600', marginBottom: '0.25rem' }}
                    formatter={(value) => [value, 'Readers']}
                    labelFormatter={(label) => `Day ${label}`}
                  />
                  <Line type="linear" dataKey="participants" stroke="var(--accent)" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#fff', stroke: 'var(--accent)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="st-expander mt-4 mb-3">
              <button className="st-expander-header" onClick={() => setExpandRawData(!expandRawData)}>
                <span>{expandRawData ? '▼' : '▶'} Raw Tracking Data</span>
              </button>
              {expandRawData && (
                <div className="st-expander-content">
                  <p className="label mb-3">This is a live, read-only view of the underlying Google Sheet database.</p>
                  <RawTrackingTable dfTracker={dfTracker} />
                </div>
              )}
            </div>

          </div>
        );
      })()}

      {activeTab === 'settings' && (
        <div className="card">
          <div className="mb-4">
            <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.4rem' }}>Team Directory</h3>
            <div style={{ overflowX: 'auto', background: 'var(--surface)', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Team Name</th>
                    <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Leader</th>
                    <th style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>Assistant</th>
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', border: '1px solid var(--border-light)' }}>PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.credentialsData?.filter(c => c.Team_Name && c.Team_Name.toLowerCase() !== 'admin').map((c) => {
                    const teamLeadersInfo = (data?.leadersData || []).filter(l => {
                      const lTeam = l.Team_Name || l.Team || l['Team Name'] || l['Team Leader Team Name'];
                      return String(lTeam || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase() === String(c.Team_Name || '').replace(/[^\x00-\x7F]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
                    });
                    const leaderName = teamLeadersInfo[0]?.Member_Name || teamLeadersInfo[0]?.Name || teamLeadersInfo[0]?.['Team Leader'] || 'N/A';
                    const assistantName = teamLeadersInfo[1]?.Member_Name || teamLeadersInfo[1]?.Name || teamLeadersInfo[1]?.['Team Leader'] || 'N/A';
                    
                    return (
                      <tr key={c.Team_Name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold', border: '1px solid var(--border-light)' }}>{c.Team_Name}</td>
                        <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{leaderName}</td>
                        <td style={{ padding: '0.4rem 0.6rem', border: '1px solid var(--border-light)' }}>{assistantName}</td>
                        <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'monospace', border: '1px solid var(--border-light)' }}>{c.PIN}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="st-expander mb-3">
            <div className="st-expander-content" style={{borderTop: 'none'}}>
              <h3 className="mb-2" style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <Sliders size={18} color="#818CF8" />
                <span>System Policies & Configuration</span>
              </h3>
              <p className="label">Update the reading challenge branding, active round, eviction rules, and reporting windows.</p>
              
              <div className="mb-3">
                <label className="label">Reading Challenge Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., ECCF Bible Reading Challenge Tracker" 
                  value={settingsForm.challengeName || ""} 
                  onChange={(e) => setSettingsForm({...settingsForm, challengeName: e.target.value})} 
                />
              </div>

              <div className="mb-3">
                <label className="label">Edition Subtitle (e.g., Season / Edition)</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., September - December Edition" 
                  value={settingsForm.challengeEdition || ""} 
                  onChange={(e) => setSettingsForm({...settingsForm, challengeEdition: e.target.value})} 
                />
              </div>

              <div className="mb-3">
                <label className="label">Challenge Start Date</label>
                <input 
                  type="date" 
                  className="input-field" 
                  value={settingsForm.startDate || ""} 
                  onChange={(e) => setSettingsForm({...settingsForm, startDate: e.target.value})} 
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                  The official kickoff date for Day 1 of this reading edition.
                </small>
              </div>

              <div className="mb-3">
                <label className="label">Total Reading Days (Max Challenge Length)</label>
                <input 
                  type="number" 
                  className="input-field" 
                  placeholder="e.g., 87 (Leave blank or 0 for unlimited)" 
                  value={settingsForm.totalDays || ""} 
                  onChange={(e) => setSettingsForm({...settingsForm, totalDays: e.target.value})} 
                />
                <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginTop: '0.25rem' }}>
                  When this day is reached, the app stops counting forward and prevents creating extra day columns in the database.
                </small>
              </div>

              <div className="mb-3">
                <label className="label">Current Active Round</label>
                <input type="number" className="input-field" value={settingsForm.currentRound} onChange={(e) => setSettingsForm({...settingsForm, currentRound: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="label">Max Allowed Missed Days Before Eviction</label>
                <input type="number" className="input-field" value={settingsForm.evictionThreshold} onChange={(e) => setSettingsForm({...settingsForm, evictionThreshold: e.target.value})} />
              </div>
              <div className="mb-3" style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '150px'}}>
                  <label className="label">Morning Start</label>
                  <input type="time" className="input-field" value={settingsForm.mornStart || ""} onChange={(e) => setSettingsForm({...settingsForm, mornStart: e.target.value})} />
                </div>
                <div style={{flex: 1, minWidth: '150px'}}>
                  <label className="label">Morning End</label>
                  <input type="time" className="input-field" value={settingsForm.mornEnd || ""} onChange={(e) => setSettingsForm({...settingsForm, mornEnd: e.target.value})} />
                </div>
              </div>
              <div className="mb-3" style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
                <div style={{flex: 1, minWidth: '150px'}}>
                  <label className="label">Evening Start</label>
                  <input type="time" className="input-field" value={settingsForm.eveStart || ""} onChange={(e) => setSettingsForm({...settingsForm, eveStart: e.target.value})} />
                </div>
                <div style={{flex: 1, minWidth: '150px'}}>
                  <label className="label">Evening End</label>
                  <input type="time" className="input-field" value={settingsForm.eveEnd || ""} onChange={(e) => setSettingsForm({...settingsForm, eveEnd: e.target.value})} />
                </div>
              </div>
              <div className="mb-3" style={{ padding: '0.85rem 1rem', background: 'var(--surface-secondary)', borderRadius: '0.5rem', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <label className="label" style={{ margin: 0, fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <Power size={16} color={settingsForm.allowLeaderReporting ? "#34D399" : "#F87171"} />
                    <span>Allow Team Leaders to Report & Save Updates</span>
                  </label>
                  <small style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', display: 'block', marginTop: '0.2rem' }}>
                    When turned OFF, team leaders cannot submit daily reports and their Save buttons will be deactivated.
                  </small>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setSettingsForm({ ...settingsForm, allowLeaderReporting: !settingsForm.allowLeaderReporting })}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      padding: '0.45rem 0.9rem',
                      borderRadius: '0.45rem',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      border: settingsForm.allowLeaderReporting 
                        ? '1px solid rgba(16, 185, 129, 0.4)' 
                        : '1px solid rgba(239, 68, 68, 0.4)',
                      background: settingsForm.allowLeaderReporting 
                        ? 'rgba(16, 185, 129, 0.18)' 
                        : 'rgba(239, 68, 68, 0.18)',
                      color: settingsForm.allowLeaderReporting ? '#34D399' : '#F87171'
                    }}
                  >
                    <Power size={14} />
                    <span>{settingsForm.allowLeaderReporting ? 'Enabled (ON)' : 'Disabled (OFF)'}</span>
                  </button>
                </div>
              </div>

              <button className="btn-primary" onClick={handleSaveSettings} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                <Save size={16} />
                <span>{saving ? 'Saving...' : 'Save System Policies'}</span>
              </button>
            </div>
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandAddTeam(!expandAddTeam)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserPlus size={16} color="#60A5FA" />
                <span>Register a New Team</span>
              </span>
              <span>{expandAddTeam ? '▼' : '▶'}</span>
            </button>
            {expandAddTeam && (
              <div className="st-expander-content">
                <input type="text" className="input-field" placeholder="New Team Name (e.g., GRACE)" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})}/>
                <input type="text" className="input-field" placeholder="Set 4-Digit PIN (e.g., 1234)" maxLength="4" value={newTeam.pin} onChange={e => setNewTeam({...newTeam, pin: e.target.value})}/>
                <button className="btn-primary" onClick={handleAddTeam} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <UserPlus size={15} />
                  <span>Add Team</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandUpdatePin(!expandUpdatePin)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} color="#FBBF24" />
                <span>Update Team PIN</span>
              </span>
              <span>{expandUpdatePin ? '▼' : '▶'}</span>
            </button>
            {expandUpdatePin && (
              <div className="st-expander-content">
                <select className="input-field" value={pinUpdate.team} onChange={e => setPinUpdate({...pinUpdate, team: e.target.value})}>
                  <option value="">Select Team</option>
                  {data?.validTeams?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="New 4-Digit PIN (e.g., 5678)" maxLength="4" value={pinUpdate.pin} onChange={e => setPinUpdate({...pinUpdate, pin: e.target.value})}/>
                <button className="btn-primary" onClick={handleUpdatePin} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <KeyRound size={15} />
                  <span>Update PIN</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandSuperPin(!expandSuperPin)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} color="#34D399" />
                <span>Super Admin Security PIN</span>
              </span>
              <span>{expandSuperPin ? '▼' : '▶'}</span>
            </button>
            {expandSuperPin && (
              <div className="st-expander-content">
                <p className="label mb-2">Change the global Super Admin login PIN.</p>
                <input type="password" className="input-field" placeholder="New Super Admin PIN" value={superPin} onChange={e => setSuperPin(e.target.value)}/>
                <button className="btn-primary" onClick={handleUpdateSuperPin} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <ShieldCheck size={15} />
                  <span>Update Super Admin PIN</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandRenameTeam(!expandRenameTeam)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RefreshCw size={16} color="#F87171" />
                <span>Rename Team & Cascade Updates</span>
              </span>
              <span>{expandRenameTeam ? '▼' : '▶'}</span>
            </button>
            {expandRenameTeam && (
              <div className="st-expander-content">
                <p className="label mb-2">Renaming a team will automatically move all of its members and update the global leaders board.</p>
                <select className="input-field" value={renameTeam.oldName} onChange={e => setRenameTeam({...renameTeam, oldName: e.target.value})}>
                  <option value="">Select Existing Team</option>
                  {data?.validTeams?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="New Team Name" value={renameTeam.newName} onChange={e => setRenameTeam({...renameTeam, newName: e.target.value})}/>
                <button className="btn-primary" onClick={handleRenameTeam} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <RefreshCw size={15} />
                  <span>Rename Team & Cascade</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandManageTeams(!expandManageTeams)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={16} color="#F87171" />
                <span>Manage & Remove Teams ({data?.validTeams?.length || 0})</span>
              </span>
              <span>{expandManageTeams ? '▼' : '▶'}</span>
            </button>
            {expandManageTeams && (
              <div className="st-expander-content">
                <p className="label mb-3">View and manage all active teams registered for this challenge. You can remove any team here.</p>
                {(!data?.validTeams || data.validTeams.length === 0) ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>No teams currently registered for this edition.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {data.validTeams.map(t => {
                      const cred = data?.credentialsData?.find(c => String(c.Team_Name || '').trim().toLowerCase() === t.toLowerCase());
                      const pin = cred?.PIN || '****';
                      return (
                        <div key={t} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.6rem 0.85rem',
                          background: 'rgba(255, 255, 255, 0.04)',
                          borderRadius: '0.375rem',
                          border: '1px solid var(--border-light)'
                        }}>
                          <div>
                            <span style={{ fontWeight: '600', color: '#F1F5F9' }}>{t}</span>
                            <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: '#94A3B8' }}>PIN: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.35rem', borderRadius: '3px' }}>{pin}</code></span>
                          </div>
                          <button
                            onClick={() => handleDeleteTeam(t)}
                            disabled={saving}
                            style={{
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#F87171',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '0.25rem',
                              padding: '0.3rem 0.6rem',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              fontSize: '0.75rem'
                            }}
                          >
                            <Trash2 size={13} />
                            <span>Remove</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandBulkUpload(!expandBulkUpload)}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UploadCloud size={16} color="#818CF8" />
                <span>Bulk Onboard Members</span>
              </span>
              <span>{expandBulkUpload ? '▼' : '▶'}</span>
            </button>
            {expandBulkUpload && (
              <div className="st-expander-content">
                <p className="label mb-3">Upload a CSV file containing `Team_Name`, `Member_Name`, and `WhatsApp_Number`.</p>
                <input type="file" className="input-field" accept=".csv" onChange={handleFileUpload} />
                <button className="btn-primary" onClick={handleBulkUpload} disabled={saving || !csvFile} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <UploadCloud size={15} />
                  <span>{saving ? 'Uploading...' : 'Upload to Database'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3" style={{ border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.03)' }}>
            <button className="st-expander-header" onClick={() => setExpandArchiveSection(!expandArchiveSection)} style={{ color: '#F87171' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Archive size={16} color="#F87171" />
                <span>Archive Current Challenge & Launch New Edition</span>
              </span>
              <span>{expandArchiveSection ? '▼' : '▶'}</span>
            </button>
            {expandArchiveSection && (
              <div className="st-expander-content">
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.5rem', padding: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#FCA5A5', marginBottom: '0.25rem', fontSize: '0.88rem' }}>
                    <Archive size={15} />
                    <span>Safe Automatic Archiving:</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#FCA5A5', lineHeight: '1.5' }}>
                    Starting a new challenge will permanently duplicate and save the current challenge's readings, leader progress, and roster into a dedicated archive tab in Google Sheets. It will then reset the active tracking sheets to a clean Day 1 blank slate ready for your new roster.
                  </p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setNewEditionForm({
                      challengeName: data?.settings?.Challenge_Name || "ECCF Bible Reading Challenge Tracker",
                      challengeEdition: "",
                      startDate: new Date().toISOString().split('T')[0],
                      totalDays: "90"
                    });
                    setArchiveModalOpen(true);
                  }}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem', fontWeight: '800', borderRadius: '0.5rem', background: '#DC2626', color: '#FFFFFF', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                >
                  <Archive size={18} />
                  <span>Archive Current & Launch New Edition</span>
                </button>
              </div>
            )}
          </div>

          <div className="st-expander">
            <button 
              className="st-expander-header" 
              onClick={() => setShowPdfModal(true)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={16} color="#34D399" />
                <span>Generate Executive PDF Reports</span>
              </span>
              <FileDown size={16} />
            </button>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (() => {
        const filteredLogs = logs.filter(l =>
          !logSearchQuery ||
          (l.teamName && l.teamName.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
          (l.loginType && l.loginType.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
          (l.device && l.device.toLowerCase().includes(logSearchQuery.toLowerCase())) ||
          (l.timestamp && l.timestamp.toLowerCase().includes(logSearchQuery.toLowerCase()))
        );

        // Last activity per team (logs is already sorted newest first)
        const lastLoginMap = {};
        logs.forEach(l => {
          if (l.teamName && !lastLoginMap[l.teamName]) {
            lastLoginMap[l.teamName] = l;
          }
        });

        return (
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '700' }}>📋 Activity & Usage Logs</h3>
                <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Live tracking of when leaders open the app and how long they stay.
                </p>
              </div>
              <button 
                onClick={fetchLogs} 
                disabled={logsLoading} 
                className="tracker-btn-icon" 
                style={{ cursor: logsLoading ? 'not-allowed' : 'pointer', opacity: logsLoading ? 0.6 : 1, padding: '0 0.85rem', width: 'auto', gap: '0.45rem' }}
                title="Refresh Activity Logs"
              >
                <RefreshCw size={15} style={{ animation: logsLoading ? 'spin 1s linear infinite' : 'none' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>Refresh</span>
              </button>
            </div>

            {/* Search */}
            <div className="tracker-search-wrap">
              <Search className="search-icon" size={16} />
              <input
                type="text"
                className="tracker-search-input"
                placeholder="Search by team, role, device, or date..."
                value={logSearchQuery}
                onChange={e => setLogSearchQuery(e.target.value)}
              />
              {logSearchQuery && (
                <button
                  onClick={() => setLogSearchQuery("")}
                  style={{
                    position: 'absolute',
                    right: '0.85rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Last Activity Per Team Summary Cards */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                🕐 Last Seen Per Team
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.65rem' }}>
                {Object.values(lastLoginMap).map(l => {
                  const isRecent = l.status === 'Active';
                  return (
                    <div key={l.teamName} style={{ 
                      background: 'var(--surface-secondary)', 
                      borderRadius: '0.65rem', 
                      padding: '0.75rem 0.9rem', 
                      border: '1px solid var(--border-light)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.35rem' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.92rem', color: 'var(--text-primary)' }}>{l.teamName}</span>
                        <span style={{
                          display: 'inline-block', padding: '0.1rem 0.45rem', borderRadius: '999px', fontSize: '0.7rem', fontWeight: '700',
                          background: l.loginType === 'Admin' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)',
                          color: l.loginType === 'Admin' ? '#A78BFA' : '#60A5FA'
                        }}>{l.loginType || 'Leader'}</span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                        <span>📅 Opened: <strong style={{ color: 'var(--text-primary)' }}>{l.timestamp}</strong></span>
                        <span>⏱️ Stayed: <strong style={{ color: isRecent ? '#34D399' : 'var(--text-primary)' }}>{l.duration || '< 1 min'}</strong></span>
                        <span style={{ fontSize: '0.74rem' }}>{l.device}</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(lastLoginMap).length === 0 && !logsLoading && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No activity recorded yet.</p>
                )}
              </div>
            </div>

            {/* Full Log History Table */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>
                📜 Full Activity History ({filteredLogs.length})
              </h4>
            </div>

            {logsLoading ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-secondary)' }}>
                <div className="spinner" style={{ margin: '0 auto 0.75rem auto' }}></div>
                <p>Loading activity logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '1rem 0' }}>No activity records found.</p>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-secondary)', borderBottom: '1px solid var(--border-light)' }}>
                      {['Opened At', 'Team / User', 'Role', 'Time Stayed', 'Device'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', fontWeight: '700', fontSize: '0.76rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((l, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                          {l.timestamp}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', fontWeight: '600' }}>
                          {l.teamName}
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem' }}>
                          <span style={{
                            display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: '700',
                            background: l.loginType === 'Admin' ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.15)',
                            color: l.loginType === 'Admin' ? '#A78BFA' : '#60A5FA'
                          }}>{l.loginType || 'Leader'}</span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', whiteSpace: 'nowrap' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.15rem 0.55rem',
                            borderRadius: '0.35rem',
                            fontSize: '0.78rem',
                            fontWeight: '600',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#34D399'
                          }}>
                            ⏱️ {l.duration || '< 1 min'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.85rem', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                          {l.device}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })()}

      {/* PDF Report Generator Modal */}
      {showPdfModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: 9999
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '1rem',
            maxWidth: '540px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7)',
            position: 'relative',
            boxSizing: 'border-box'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '10px',
                  backgroundColor: 'var(--surface-secondary)',
                  border: '1px solid var(--border-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34D399',
                  flexShrink: 0
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)' }}>
                    Generate PDF Reports
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    Download clean challenge summaries and reading rosters
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowPdfModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.2rem' }}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scope Selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.5rem' }}>
                Select Report Type
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setPdfScope('general')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.5rem',
                    border: `1.5px solid ${pdfScope === 'general' ? 'var(--accent)' : 'var(--border-light)'}`,
                    backgroundColor: pdfScope === 'general' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-secondary)',
                    color: pdfScope === 'general' ? '#60A5FA' : 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>General Report</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>All Teams</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfScope('team')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.5rem',
                    border: `1.5px solid ${pdfScope === 'team' ? 'var(--accent)' : 'var(--border-light)'}`,
                    backgroundColor: pdfScope === 'team' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-secondary)',
                    color: pdfScope === 'team' ? '#60A5FA' : 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Team Report</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Single Team</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPdfScope('leaders')}
                  style={{
                    padding: '0.65rem 0.5rem',
                    borderRadius: '0.5rem',
                    border: `1.5px solid ${pdfScope === 'leaders' ? 'var(--accent)' : 'var(--border-light)'}`,
                    backgroundColor: pdfScope === 'leaders' ? 'rgba(59, 130, 246, 0.12)' : 'var(--surface-secondary)',
                    color: pdfScope === 'leaders' ? '#60A5FA' : 'var(--text-primary)',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.2rem',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>Leaders Report</span>
                  <span style={{ fontSize: '0.68rem', fontWeight: 'normal', color: 'var(--text-secondary)' }}>Team Leaders</span>
                </button>
              </div>
            </div>

            {/* Team Dropdown Selector (if team scope) */}
            {pdfScope === 'team' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem' }}>
                  Choose Team
                </label>
                <select
                  className="input-field"
                  value={selectedPdfTeam}
                  onChange={(e) => setSelectedPdfTeam(e.target.value)}
                  style={{ marginBottom: 0 }}
                >
                  <option value="">-- Select Team --</option>
                  {data?.validTeams?.filter(t => t.toLowerCase() !== 'admin').map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Document Preview Description */}
            <div style={{
              backgroundColor: 'var(--surface-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: '0.65rem',
              padding: '0.85rem 1rem',
              marginBottom: '1.5rem',
              fontSize: '0.82rem'
            }}>
              <div style={{ fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.3rem' }}>
                Document Preview:
              </div>
              <p style={{ margin: '0 0 0.4rem 0', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                {pdfScope === 'general' 
                  ? `Generates complete summary report covering all ${data?.validTeams?.length || 0} teams, overall completion stats, team breakdown, and list of successful completed participants.`
                  : pdfScope === 'leaders'
                    ? `Generates report showing all ${(data?.leadersData || []).length} Team Leaders and Assistants with their assigned teams, total days read, and completion status.`
                    : selectedPdfTeam
                      ? `Generates report for Team ${selectedPdfTeam} with assigned leaders, member reading progress, and completion status.`
                      : `Select a team above to preview summary.`
                }
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '0.76rem' }}>
                <span>Challenge Length: <strong style={{ color: 'var(--text-primary)' }}>{data?.settings?.Total_Days || 87} Days</strong></span>
                <span>Tracked Records: <strong style={{ color: 'var(--text-primary)' }}>{pdfScope === 'leaders' ? (data?.leadersData || []).length : (data?.trackerData?.length || 0)}</strong></span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--surface)',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGeneratePdf}
                disabled={pdfGenerating || (pdfScope === 'team' && !selectedPdfTeam)}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '0.5rem',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  backgroundColor: 'var(--surface-secondary)',
                  color: '#34D399',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: (pdfGenerating || (pdfScope === 'team' && !selectedPdfTeam)) ? 'not-allowed' : 'pointer',
                  opacity: (pdfGenerating || (pdfScope === 'team' && !selectedPdfTeam)) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  if (!pdfGenerating && !(pdfScope === 'team' && !selectedPdfTeam)) {
                    e.currentTarget.style.backgroundColor = 'var(--surface)';
                    e.currentTarget.style.borderColor = '#34D399';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--surface-secondary)';
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.4)';
                }}
              >
                <FileDown size={16} />
                <span>{pdfGenerating ? 'Generating PDF...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Archive & Start New Challenge Modal */}
      {archiveModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '0.85rem',
            maxWidth: '560px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            color: 'var(--text-primary)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Archive size={20} color="#EF4444" />
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#F87171' }}>
                  Archive Current & Launch New Edition
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !archiving && setArchiveModalOpen(false)}
                disabled={archiving}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: archiving ? 'not-allowed' : 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Current Edition Backup Info */}
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '0.5rem', padding: '0.85rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#FBBF24', fontSize: '0.88rem', marginBottom: '0.25rem' }}>
                <Archive size={15} />
                <span>Archived Scope & Backup:</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#FEF3C7', lineHeight: '1.4' }}>
                Current edition <strong>"{data?.settings?.Challenge_Edition || 'Active Challenge'}"</strong> with all its daily reading checkmarks, leaderboard scores, and member records will be duplicated into a permanent Google Sheets archive tab. You can navigate back to view it anytime via the Edition Switcher.
              </p>
            </div>

            {/* New Edition Inputs */}
            <div style={{ marginBottom: '1.25rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '700', margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>
                Configure New Challenge Edition:
              </h4>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="label">Reading Challenge Title</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., ECCF Bible Reading Challenge Tracker" 
                  value={newEditionForm.challengeName} 
                  onChange={(e) => setNewEditionForm({...newEditionForm, challengeName: e.target.value})} 
                />
              </div>

              <div style={{ marginBottom: '0.85rem' }}>
                <label className="label">New Edition Subtitle (e.g. Season / Book name) *</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g., September - December Epistles Edition" 
                  value={newEditionForm.challengeEdition} 
                  onChange={(e) => setNewEditionForm({...newEditionForm, challengeEdition: e.target.value})} 
                />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="label">Start Date (Day 1 Kickoff) *</label>
                  <input 
                    type="date" 
                    className="input-field" 
                    value={newEditionForm.startDate} 
                    onChange={(e) => setNewEditionForm({...newEditionForm, startDate: e.target.value})} 
                  />
                </div>
                <div style={{ flex: 1, minWidth: '150px' }}>
                  <label className="label">Total Reading Days</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="e.g., 87 or 90" 
                    value={newEditionForm.totalDays} 
                    onChange={(e) => setNewEditionForm({...newEditionForm, totalDays: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Warning Message */}
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '0.5rem', padding: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: '700', color: '#FCA5A5', marginBottom: '0.2rem', fontSize: '0.82rem' }}>
                <AlertTriangle size={14} />
                <span>Blank Slate Confirmation:</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#FCA5A5', lineHeight: '1.4' }}>
                Active tracking sheets will be wiped clean for Day 1. Make sure you are ready to onboard new participants.
              </p>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setArchiveModalOpen(false)}
                disabled={archiving}
                style={{
                  padding: '0.6rem 1.1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-light)',
                  backgroundColor: 'var(--surface-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: archiving ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchiveChallenge}
                disabled={archiving || !newEditionForm.challengeEdition || !newEditionForm.startDate}
                style={{
                  padding: '0.6rem 1.4rem',
                  borderRadius: '0.5rem',
                  border: 'none',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: (archiving || !newEditionForm.challengeEdition || !newEditionForm.startDate) ? 'not-allowed' : 'pointer',
                  opacity: (archiving || !newEditionForm.challengeEdition || !newEditionForm.startDate) ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Archive size={16} />
                <span>{archiving ? 'Archiving & Launching...' : 'Confirm Archive & Launch'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
