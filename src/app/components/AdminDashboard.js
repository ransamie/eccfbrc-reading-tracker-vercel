import { useState, useEffect, useRef } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, LogOut } from "lucide-react";
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
  const reportRef = useRef(null);

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
  const [expandBulkUpload, setExpandBulkUpload] = useState(false);
  const [expandRawData, setExpandRawData] = useState(false);

  const [settingsForm, setSettingsForm] = useState({ currentRound: 1, evictionThreshold: 5 });

  const [newTeam, setNewTeam] = useState({ name: '', pin: '' });
  const [pinUpdate, setPinUpdate] = useState({ team: '', pin: '' });
  const [superPin, setSuperPin] = useState("");
  const [renameTeam, setRenameTeam] = useState({ oldName: '', newName: '' });

  const [csvFile, setCsvFile] = useState(null);

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
        
        const startDateStr = d.settings?.Start_Date || new Date().toISOString().split('T')[0];
        const startDate = new Date(startDateStr);
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const calcCurrentDay = `Day_${diffDays}`;

        setCurrentDayNum(diffDays);
        setCurrentDayStr(calcCurrentDay);
        if (!adminSelectedDay) setAdminSelectedDay(calcCurrentDay);
        setReflection(d.teamReflection || "");

        setSettingsForm({ 
          currentRound: parseInt(d.settings?.Current_Round || 1), 
          evictionThreshold: parseInt(d.settings?.Eviction_Threshold || 5),
          mornStart: parse12to24(d.settings?.Morning_Window_Start || "04:00 AM"),
          mornEnd: parse12to24(d.settings?.Morning_Window_End || "11:00 AM"),
          eveStart: parse12to24(d.settings?.Evening_Window_Start || "06:00 PM"),
          eveEnd: parse12to24(d.settings?.Evening_Window_End || "11:00 PM")
        });

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
    Object.keys(newUpdates).forEach(k => newUpdates[k] = val);
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
    const activeLeaders = allLeaders.filter(m => String(m.Status || '').toLowerCase() === 'active');
    
    const numAssigned = allLeaders.length;
    const numCommitted = activeLeaders.length;
    const numDeclined = allLeaders.filter(m => String(m.Status || '').toLowerCase() === 'declined').length;
    const numLeft = allLeaders.filter(m => String(m.Status || '').toLowerCase() === 'left').length;
    const numEvicted = allLeaders.filter(m => String(m.Status || '').toLowerCase() === 'evicted').length;

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
      let missedDaysInCurrentRound = 0;
      for (let i = 1; i <= currentDayNum; i++) {
        const dStr = `Day_${i}`;
        const val = (i === currentDayNum && adminSelectedDay === currentDayStr) ? adminUpdates[name] : (String(m[dStr] || '').toUpperCase() === 'TRUE');
        if (!val) {
          missedDays.push(i);
          if (i >= currentRoundStart) {
            missedDaysInCurrentRound++;
          }
        }
      }
      
      const teamStr = m.Team || m.Team_Name || "Unknown";
      const memberNameStr = `${name} (${teamStr})`;
      
      if (missedDays.length > 0) {
        const daysStr = missedDays.length === 1 ? `Day ${missedDays[0]}` : `Day ${missedDays[0]} - ${missedDays[missedDays.length - 1]}`;
        yetToUpdate.push(`* @${memberNameStr} (${daysStr})`);
        if (showEvictionList && missedDaysInCurrentRound > evictionThreshold) {
           const dayWord = missedDaysInCurrentRound === 1 ? "day" : "days";
           evictionList.push(`* @${memberNameStr} (${missedDaysInCurrentRound} ${dayWord} behind this round)`);
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

    const text = `*ECCF Bible Reading Club*\\n\\n*Daily Reading Report*\\n\\n*GLOBAL TEAM LEADERS*\\n\\n*Team Status Update*\\n- *Number Assigned*: ${numAssigned.toString().padStart(2,'0')}\\n- *Number Committed*: ${numCommitted.toString().padStart(2,'0')}\\n- *Number Declined*: ${numDeclined.toString().padStart(2,'0')}\\n- *Number Left*: ${numLeft.toString().padStart(2,'0')}\\n- *Number Evicted*: ${numEvicted.toString().padStart(2,'0')}\\n- *Number Settled*: ${numCommitted.toString().padStart(2,'0')}\\n\\n*Bible Reading Team Report 📃*\\n\\n${previousRoundsStr}   *ROUND ${currentRound} ✅*\\n${roundBreakdownStr}\\n\\n*YET TO UPDATE 🤲✨*\\n${yetToUpdateStr}\\n\\n*UP-TO-DATE 🤩🚀*\\n${upToDateStr}${evictionSection}\\n\\n*REFLECTION*\\n*${reflection}*`;
    setReportText(text.replace(/\\n/g, '\n'));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        currentRound: settingsForm.currentRound,
        evictionThreshold: settingsForm.evictionThreshold,
        Morning_Window_Start: parse24to12(settingsForm.mornStart),
        Morning_Window_End: parse24to12(settingsForm.mornEnd),
        Evening_Window_Start: parse24to12(settingsForm.eveStart),
        Evening_Window_End: parse24to12(settingsForm.eveEnd)
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

  const activeLeaders = data?.leadersData?.filter(m => String(m.Status || '').toLowerCase() === 'active') || [];
  const daysList = Array.from({length: currentDayNum}, (_, i) => `Day_${i+1}`);

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
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          Admin Command Center
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <button 
            onClick={() => loadData(true)} 
            disabled={loading} 
            title="Refresh Data"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '2.5rem', height: '2.5rem', background: 'var(--surface-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-light)', borderRadius: '0.5rem', transition: 'all 0.2s ease', opacity: loading ? 0.5 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={18} />
          </button>
          <button 
            onClick={onLogout} 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '0 1rem', height: '2.5rem', borderRadius: '0.5rem', fontWeight: '600', transition: 'all 0.2s ease' }} 
            onMouseOver={(e) => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; }} 
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--accent)'; }}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      <div className="st-tabs">
        <button className={`st-tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Overview</button>
        <button className={`st-tab ${activeTab === 'leaders' ? 'active' : ''}`} onClick={() => setActiveTab('leaders')}>Reports</button>
        <button className={`st-tab ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>Roster</button>
        <button className={`st-tab ${activeTab === 'settings' ? 'active' : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
      </div>

      {activeTab === 'leaders' && (
        <div className="card">


          <h3 className="mb-2">Mark Daily Updates for Team Leaders</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem', background: 'var(--surface-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => {
                const currentNum = parseInt(adminSelectedDay.split('_')[1]);
                if (currentNum > 1) setAdminSelectedDay(`Day_${currentNum - 1}`);
              }}
              disabled={parseInt(adminSelectedDay.split('_')[1] || "1") <= 1}
              style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.4rem', padding: '0.5rem', cursor: parseInt(adminSelectedDay.split('_')[1] || "1") <= 1 ? 'not-allowed' : 'pointer', color: parseInt(adminSelectedDay.split('_')[1] || "1") <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', opacity: parseInt(adminSelectedDay.split('_')[1] || "1") <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={20} />
            </button>
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Updating</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: '1' }}>{adminSelectedDay.replace('_', ' ')}</span>
              <button 
                onClick={() => adminSelectedDay !== currentDayStr && setAdminSelectedDay(currentDayStr)} 
                title={adminSelectedDay === currentDayStr ? "Already viewing today" : "Jump to Today"} 
                style={{ 
                  background: adminSelectedDay === currentDayStr ? 'rgba(255,255,255,0.05)' : 'var(--accent-light)', 
                  border: `1px solid ${adminSelectedDay === currentDayStr ? 'var(--border-light)' : 'var(--accent)'}`, 
                  color: adminSelectedDay === currentDayStr ? 'var(--text-secondary)' : 'var(--accent)', 
                  cursor: adminSelectedDay === currentDayStr ? 'default' : 'pointer', 
                  display: 'flex',
                  alignItems: 'center', 
                  padding: '0.3rem 0.8rem',
                  fontSize: '0.8rem',
                  borderRadius: '1rem',
                  fontWeight: '600',
                  marginTop: '0.2rem',
                  transition: 'all 0.2s ease'
                }}
              >
                <CalendarDays size={14} style={{ marginRight: '6px' }} /> {adminSelectedDay === currentDayStr ? "Today" : "Jump to Today"}
              </button>
            </div>

            <button 
              onClick={() => {
                const currentNum = parseInt(adminSelectedDay.split('_')[1]);
                if (currentNum < currentDayNum) setAdminSelectedDay(`Day_${currentNum + 1}`);
              }}
              disabled={adminSelectedDay === currentDayStr}
              style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.4rem', padding: '0.5rem', cursor: adminSelectedDay === currentDayStr ? 'not-allowed' : 'pointer', color: adminSelectedDay === currentDayStr ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', opacity: adminSelectedDay === currentDayStr ? 0.5 : 1 }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {activeLeaders.length === 0 ? <p>No active leaders.</p> : activeLeaders.map(m => {
                const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
                return (
                  <label key={name} className="checkbox-label">
                    <input type="checkbox" checked={adminUpdates[name] || false} onChange={() => handleAdminCheckbox(name)} />
                    {name} ({m.Team || m.Team_Name || "Unknown"})
                  </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
              {(() => {
                const allSelected = activeLeaders.length > 0 && activeLeaders.every(m => adminUpdates[String(m['Team Leader'] || m.Name || m.Member_Name || '').trim()]);
                return (
                  <button 
                    onClick={() => handleAdminSelectAll(!allSelected)} 
                    style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.25rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {allSelected ? '✕ Deselect All' : '✓ Select All'}
                  </button>
                );
              })()}
            </div>

            <hr style={{ borderColor: 'var(--border-light)', opacity: 0.5, margin: '1.5rem 0' }} />

            {adminSelectedDay === currentDayStr && (
              <div className="mb-3" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label className="label">Daily Reflection Scripture (Auto-saved for this session):</label>
                <textarea className="input-field" rows="3" value={reflection} onChange={e => setReflection(e.target.value)} placeholder="e.g., 'But he that shall endure...' Matt. 24:13"></textarea>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              <button 
                onClick={() => handleSaveAdminReport(false)} 
                disabled={saving} 
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s ease' }}
              >
                {saving ? 'Saving...' : `💾 Save ${adminSelectedDay.replace('_', ' ')} Updates`}
              </button>
              
              {adminSelectedDay === currentDayStr && (
                 <button onClick={() => handleSaveAdminReport(true)} disabled={saving} style={{ backgroundColor: '#047857', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                   📋 Generate Daily Report
                 </button>
              )}
            </div>
          </div>

          {reportText && (
            <div ref={reportRef} className="card mt-4">
              <div style={{ padding: '0.5rem' }}>
                <h3 className="mb-2">📱 Copy Your Daily Report</h3>
                <pre style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>{reportText}</pre>
                <button className="btn-primary mt-2" onClick={() => { navigator.clipboard.writeText(reportText); showToast("Copied to clipboard!"); }}>Copy to Clipboard</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="card">
          <h3 className="mb-2">Manage Team Leaders Roster</h3>
          <p className="label mb-3">Update a leader's status if they have been evicted or declined the challenge. Changes made here will update the Leaders Tracker Data.</p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data?.leadersData || []).map(m => {
              const name = String(m['Team Leader'] || m.Name || m.Member_Name || '').trim();
              if (!name) return null;
              const currentStatus = adminRosterUpdates[name] || m.Status || 'Active';
              
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
        const dfActive = dfTracker.filter(m => String(m.Status || '').toLowerCase() === 'active');
        const totalMembers = dfTracker.length;
        const activeMembers = dfActive.length;
        const evictedMembers = dfTracker.filter(m => String(m.Status || '').toLowerCase() === 'evicted').length;
        const declinedMembers = dfTracker.filter(m => String(m.Status || '').toLowerCase() === 'declined').length;

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
          if (!teamsMap[t]) teamsMap[t] = { active: 0, evicted: 0, declined: 0, total: 0, todayReads: 0 };
          teamsMap[t].total++;
          const status = String(m.Status || '').toLowerCase();
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
                        {leaderboardData.slice(0, 10).map((t, idx) => (
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
                    <th style={{ padding: '0.4rem 0.6rem', textAlign: 'right', border: '1px solid var(--border-light)' }}>PIN</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.credentialsData?.filter(c => c.Team_Name && c.Team_Name.toLowerCase() !== 'admin').map((c) => (
                    <tr key={c.Team_Name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '0.4rem 0.6rem', fontWeight: 'bold', border: '1px solid var(--border-light)' }}>{c.Team_Name}</td>
                      <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', fontFamily: 'monospace', border: '1px solid var(--border-light)' }}>{c.PIN}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="st-expander mb-3">
            <div className="st-expander-content" style={{borderTop: 'none'}}>
              <h3 className="mb-2">⚙️ Modify Global Settings</h3>
              <p className="label">Update the active reading round and the maximum missed days before eviction.</p>
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
              <button className="btn-primary" onClick={handleSaveSettings} disabled={saving}>{saving ? 'Saving...' : '💾 Save System Policies'}</button>
            </div>
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandAddTeam(!expandAddTeam)}>
              <span>➕ Register a New Team</span>
              <span>{expandAddTeam ? '▼' : '▶'}</span>
            </button>
            {expandAddTeam && (
              <div className="st-expander-content">
                <input type="text" className="input-field" placeholder="New Team Name (e.g., GRACE)" value={newTeam.name} onChange={e => setNewTeam({...newTeam, name: e.target.value})}/>
                <input type="text" className="input-field" placeholder="Set 4-Digit PIN (e.g., 1234)" maxLength="4" value={newTeam.pin} onChange={e => setNewTeam({...newTeam, pin: e.target.value})}/>
                <button className="btn-primary" onClick={handleAddTeam} disabled={saving}>Add Team</button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandUpdatePin(!expandUpdatePin)}>
              <span>🔑 Update Team PIN</span>
              <span>{expandUpdatePin ? '▼' : '▶'}</span>
            </button>
            {expandUpdatePin && (
              <div className="st-expander-content">
                <select className="input-field" value={pinUpdate.team} onChange={e => setPinUpdate({...pinUpdate, team: e.target.value})}>
                  <option value="">Select Team</option>
                  {data?.validTeams?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="text" className="input-field" placeholder="New 4-Digit PIN (e.g., 5678)" maxLength="4" value={pinUpdate.pin} onChange={e => setPinUpdate({...pinUpdate, pin: e.target.value})}/>
                <button className="btn-primary" onClick={handleUpdatePin} disabled={saving}>Update PIN</button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandSuperPin(!expandSuperPin)}>
              <span>🔐 Super Admin Security</span>
              <span>{expandSuperPin ? '▼' : '▶'}</span>
            </button>
            {expandSuperPin && (
              <div className="st-expander-content">
                <p className="label mb-2">Change the global Super Admin login PIN.</p>
                <input type="password" className="input-field" placeholder="New Super Admin PIN" value={superPin} onChange={e => setSuperPin(e.target.value)}/>
                <button className="btn-primary" onClick={handleUpdateSuperPin} disabled={saving}>Update Super Admin PIN</button>
              </div>
            )}
          </div>

          <div className="st-expander mb-3">
            <button className="st-expander-header" onClick={() => setExpandRenameTeam(!expandRenameTeam)}>
              <span>⚠️ Rename Team & Cascade Updates</span>
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
                <button className="btn-primary" onClick={handleRenameTeam} disabled={saving}>Rename Team & Cascade</button>
              </div>
            )}
          </div>

          <div className="st-expander">
            <button className="st-expander-header" onClick={() => setExpandBulkUpload(!expandBulkUpload)}>
              <span>📤 Bulk Onboard Members</span>
              <span>{expandBulkUpload ? '▼' : '▶'}</span>
            </button>
            {expandBulkUpload && (
              <div className="st-expander-content">
                <p className="label mb-3">Upload a CSV file containing `Team_Name`, `Member_Name`, and `WhatsApp_Number`.</p>
                <input type="file" className="input-field" accept=".csv" onChange={handleFileUpload} />
                <button className="btn-primary" onClick={handleBulkUpload} disabled={saving || !csvFile}>{saving ? 'Uploading...' : 'Upload to Database'}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
