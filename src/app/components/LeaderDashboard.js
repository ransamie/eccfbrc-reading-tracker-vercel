import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, RefreshCw, LogOut } from "lucide-react";
import InstallPwaButton from "./InstallPwaButton";

export default function LeaderDashboard({ team, onLogout }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedDay, setSelectedDay] = useState("");
  const [currentDay, setCurrentDay] = useState("");
  const [currentDayNum, setCurrentDayNum] = useState(1);
  
  const [updates, setUpdates] = useState({});
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [reportText, setReportText] = useState("");
  const reportRef = useRef(null);
  
  useEffect(() => {
    if (reportText && reportRef.current) {
      reportRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [reportText]);
  
  const [activeTab, setActiveTab] = useState("report");
  const [rosterUpdates, setRosterUpdates] = useState({});
  const [showDays, setShowDays] = useState(false);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
  };

  const loadData = (isManualRefresh = false) => {
    setLoading(true);
    return fetch(`/api/data?type=leader&team=${encodeURIComponent(team)}&t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(d => {
        setData(d);
        
        const startDateStr = d.settings.Start_Date || new Date().toISOString().split('T')[0];
        const startDate = new Date(startDateStr);
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        const calcCurrentDay = `Day_${diffDays}`;
        
        setCurrentDay(calcCurrentDay);
        setCurrentDayNum(diffDays);
        if (!selectedDay) setSelectedDay(calcCurrentDay);
        
        setReflection(d.teamReflection || "");
        
        const initialUpdates = {};
        d.trackerData.forEach(member => {
          if (String(member.Status || '').toLowerCase() === 'active') {
            const memberName = String(member.Member_Name || '').trim();
            initialUpdates[memberName] = String(member[selectedDay || calcCurrentDay] || '').toUpperCase() === 'TRUE';
          }
        });
        setUpdates(initialUpdates);
        if (isManualRefresh === true) showToast("Dashboard is up-to-date!");
        return d;
      })
      .catch(err => {
        if (isManualRefresh === true) showToast("Error refreshing data", "error");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [team]);

  useEffect(() => {
    if (data) {
      const newUpdates = {};
      data.trackerData.forEach(member => {
        if (String(member.Status || '').toLowerCase() === 'active') {
          const memberName = String(member.Member_Name || '').trim();
          newUpdates[memberName] = String(member[selectedDay] || '').toUpperCase() === 'TRUE';
        }
      });
      setUpdates(newUpdates);
    }
  }, [selectedDay]);

  const handleCheckbox = (name) => { setUpdates(prev => ({ ...prev, [name]: !prev[name] })); };

  const handleSelectAll = (val) => {
    const newUpdates = { ...updates };
    Object.keys(newUpdates).forEach(k => newUpdates[k] = val);
    setUpdates(newUpdates);
  };

  const parse12to24 = (t12) => {
    const match = String(t12).match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return "00:00";
    let [_, h, m, mod] = match;
    if (h === '12') h = '00';
    if (mod.toUpperCase() === 'PM') h = parseInt(h, 10) + 12;
    return `${String(h).padStart(2, '0')}:${m}`;
  };

  const mornStart = data?.settings?.Morning_Window_Start || "04:00 AM";
  const mornEnd = data?.settings?.Morning_Window_End || "11:00 AM";
  const eveStart = data?.settings?.Evening_Window_Start || "06:00 PM";
  const eveEnd = data?.settings?.Evening_Window_End || "11:00 PM";

  const now = new Date();
  const watOptions = { timeZone: 'Africa/Lagos', hour: '2-digit', minute: '2-digit', hour12: false };
  const watTimeStr = new Intl.DateTimeFormat('en-GB', watOptions).format(now);
  
  const inMorn = watTimeStr >= parse12to24(mornStart) && watTimeStr <= parse12to24(mornEnd);
  const inEve = watTimeStr >= parse12to24(eveStart) && watTimeStr <= parse12to24(eveEnd);
  const isReportingWindow = inMorn || inEve;
  
  const closedMessage = `Reporting is closed. The daily windows are ${mornStart} - ${mornEnd} and ${eveStart} - ${eveEnd}.`;

  const handleSaveReport = async (generateReport = false) => {
    if (!isReportingWindow) {
      showToast(closedMessage, "error");
      return;
    }

    if (generateReport && !reflection && selectedDay === currentDay) {
      alert("Please paste the reflection scripture to generate the report.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leader_report',
          payload: {
            team,
            day: selectedDay,
            updates,
            reflection: selectedDay === currentDay ? reflection : undefined,
            currentDayNum: currentDayNum,
            evictionThreshold: data.settings.Eviction_Threshold || 5
          }
        })
      });
      if (!res.ok) {
        let errMessage = "Failed to save report";
        try { const errData = await res.json(); errMessage = errData.message || errData.error || errMessage; } catch(e) {}
        throw new Error(errMessage);
      }
      
      const freshData = await loadData();
      
      if (generateReport) {
        generateWhatsappText(freshData);
      } else {
        showToast(`Saved updates for ${selectedDay.replace('_', ' ')} successfully!`);
      }
    } catch (e) {
      showToast(e.message || "Error saving data", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRoster = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'leader_update_roster',
          payload: { team, rosterUpdates }
        })
      });
      if (!res.ok) {
        let errMessage = "Failed to save report";
        try { const errData = await res.json(); errMessage = errData.message || errData.error || errMessage; } catch(e) {}
        throw new Error(errMessage);
      }
      showToast("Team roster successfully updated!");
      loadData();
    } catch (e) {
      showToast(e.message || "Error saving roster", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateWhatsappText = (freshData = null) => {
    const useData = freshData || data;
    const allMembers = useData.trackerData || [];
    const activeMembers = allMembers.filter(m => String(m.Status || '').trim().toLowerCase() === 'active');
    
    const numAssigned = allMembers.length;
    const numCommitted = activeMembers.length;
    const numDeclined = allMembers.filter(m => String(m.Status || '').trim().toLowerCase() === 'declined').length;
    const numLeft = allMembers.filter(m => String(m.Status || '').trim().toLowerCase() === 'left').length;
    const numEvicted = allMembers.filter(m => String(m.Status || '').trim().toLowerCase() === 'evicted').length;

    const daysPerRound = 10;
    const currentRound = Math.floor((currentDayNum - 1) / daysPerRound) + 1;
    const evictionThreshold = parseInt(useData.settings?.Eviction_Threshold || 5);
    const currentRoundStart = Math.floor((currentDayNum - 1) / daysPerRound) * daysPerRound + 1;
    
    // Previous rounds formatting
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
          activeMembers.forEach(m => {
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

    // Current round breakdown
    let currentRoundBreakdownList = [];
    for (let d = currentRoundStart; d <= currentDayNum; d++) {
      const dayCol = `Day_${d}`;
      let completedCount = 0;
      activeMembers.forEach(m => {
        const memberName = String(m.Member_Name || '').trim();
        const val = (d === currentDayNum && selectedDay === currentDay) ? updates[memberName] : (String(m[dayCol] || '').toUpperCase() === 'TRUE');
        if (val) completedCount++;
      });
      currentRoundBreakdownList.push(`- Day ${d}: ${completedCount.toString().padStart(2,'0')}/${numCommitted.toString().padStart(2,'0')}`);
    }
    const roundBreakdownStr = currentRoundBreakdownList.join('\\n');

    // Missed days
    let yetToUpdate = [];
    let upToDate = [];
    let evictionList = [];
    
    const daysLeftInRound = (currentRoundStart + daysPerRound - 1) - currentDayNum;
    const showEvictionList = daysLeftInRound <= 3; // The last 4 days of the round

    activeMembers.forEach(m => {
      let missedDays = [];
      const memberName = String(m.Member_Name || '').trim();
      let missedDaysInCurrentRound = 0;
      const currentRoundStartDay = (currentRound - 1) * daysPerRound + 1;
      
      for (let i = 1; i <= currentDayNum; i++) {
        const dStr = `Day_${i}`;
        const val = (i === currentDayNum && selectedDay === currentDay) ? updates[memberName] : (String(m[dStr] || '').toUpperCase() === 'TRUE');
        if (!val) {
          missedDays.push(i);
          if (i >= currentRoundStartDay) {
            missedDaysInCurrentRound++;
          }
        }
      }
      
      const memberNameStr = m.Member_Name.trim();
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

    const text = `*ECCF Bible Reading Club*\\n\\n*Daily Reading Report*\\n\\n*TEAM ${team.toUpperCase()}*\\n\\n*Team Status Update*\\n- *Number Assigned*: ${numAssigned.toString().padStart(2,'0')}\\n- *Number Committed*: ${numCommitted.toString().padStart(2,'0')}\\n- *Number Declined*: ${numDeclined.toString().padStart(2,'0')}\\n- *Number Left*: ${numLeft.toString().padStart(2,'0')}\\n- *Number Evicted*: ${numEvicted.toString().padStart(2,'0')}\\n- *Number Settled*: ${numCommitted.toString().padStart(2,'0')}\\n\\n*Bible Reading Team Report 📃*\\n\\n${previousRoundsStr}   *ROUND ${currentRound} ✅*\\n${roundBreakdownStr}\\n\\n*YET TO UPDATE 🤲✨*\\n${yetToUpdateStr}\\n\\n*UP-TO-DATE 🤩🚀*\\n${upToDateStr}${evictionSection}\\n\\n*REFLECTION*\\n*${reflection}*`;
    setReportText(text.replace(/\\n/g, '\n'));
  };

  if (loading && !data) return <div className="loader-container"><div className="spinner"></div><p>Loading Team Dashboard...</p></div>;

  const allMembers = data?.trackerData || [];
  const activeMembers = allMembers.filter(m => String(m.Status || '').trim().toLowerCase() === 'active');
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '600' }}>Team {team}</div>
            {data?.leadersData && (
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                Leader: {data.leadersData[0]?.Member_Name || data.leadersData[0]?.Name || data.leadersData[0]?.['Team Leader'] || 'N/A'}
                {data.leadersData[1] && ` | Assistant: ${data.leadersData[1]?.Member_Name || data.leadersData[1]?.Name || data.leadersData[1]?.['Team Leader']}`}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <InstallPwaButton />
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
        <button className={`st-tab ${activeTab === 'report' ? 'active' : ''}`} onClick={() => setActiveTab('report')}>Report</button>
        <button className={`st-tab ${activeTab === 'roster' ? 'active' : ''}`} onClick={() => setActiveTab('roster')}>Roster</button>
      </div>

      {activeTab === 'report' && (
        <div className="card">
          
          <h3 className="mb-2">Mark Daily Updates for Your Team</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', marginTop: '1rem', background: 'var(--surface-secondary)', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-light)' }}>
            <button 
              onClick={() => {
                const currentNum = parseInt(selectedDay.split('_')[1]);
                if (currentNum > 1) setSelectedDay(`Day_${currentNum - 1}`);
              }}
              disabled={parseInt(selectedDay.split('_')[1] || "1") <= 1}
              style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.4rem', padding: '0.5rem', cursor: parseInt(selectedDay.split('_')[1] || "1") <= 1 ? 'not-allowed' : 'pointer', color: parseInt(selectedDay.split('_')[1] || "1") <= 1 ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', opacity: parseInt(selectedDay.split('_')[1] || "1") <= 1 ? 0.5 : 1 }}
            >
              <ChevronLeft size={20} />
            </button>
            
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>Updating</span>
              <span style={{ fontSize: '1.4rem', fontWeight: '800', lineHeight: '1' }}>{selectedDay.replace('_', ' ')}</span>
              <button 
                onClick={() => selectedDay !== currentDay && setSelectedDay(currentDay)} 
                title={selectedDay === currentDay ? "Already viewing today" : "Jump to Today"} 
                style={{ 
                  background: selectedDay === currentDay ? 'rgba(255,255,255,0.05)' : 'var(--accent-light)', 
                  border: `1px solid ${selectedDay === currentDay ? 'var(--border-light)' : 'var(--accent)'}`, 
                  color: selectedDay === currentDay ? 'var(--text-secondary)' : 'var(--accent)', 
                  cursor: selectedDay === currentDay ? 'default' : 'pointer', 
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
                <CalendarDays size={14} style={{ marginRight: '6px' }} /> {selectedDay === currentDay ? "Today" : "Jump to Today"}
              </button>
            </div>

            <button 
              onClick={() => {
                const currentNum = parseInt(selectedDay.split('_')[1]);
                if (currentNum < currentDayNum) setSelectedDay(`Day_${currentNum + 1}`);
              }}
              disabled={selectedDay === currentDay}
              style={{ background: 'var(--surface)', border: '1px solid var(--border-light)', borderRadius: '0.4rem', padding: '0.5rem', cursor: selectedDay === currentDay ? 'not-allowed' : 'pointer', color: selectedDay === currentDay ? 'var(--text-secondary)' : 'var(--text-primary)', display: 'flex', alignItems: 'center', opacity: selectedDay === currentDay ? 0.5 : 1 }}
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {activeMembers.length === 0 ? <p>No active members.</p> : activeMembers.map(m => {
                const nameTrimmed = String(m.Member_Name || '').trim();
                return (
                <label key={nameTrimmed} className="checkbox-label">
                  <input type="checkbox" checked={updates[nameTrimmed] || false} onChange={() => handleCheckbox(nameTrimmed)} />
                  {nameTrimmed}
                </label>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginBottom: '1rem' }}>
              {(() => {
                const allSelected = activeMembers.length > 0 && activeMembers.every(m => updates[String(m.Member_Name || '').trim()]);
                return (
                  <button 
                    onClick={() => handleSelectAll(!allSelected)} 
                    style={{ background: 'transparent', border: '1px solid var(--accent)', color: 'var(--accent)', padding: '0.25rem 0.75rem', borderRadius: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: '600' }}
                  >
                    {allSelected ? '✕ Deselect All' : '✓ Select All'}
                  </button>
                );
              })()}
            </div>

            <hr style={{ borderColor: 'var(--border-light)', opacity: 0.5, margin: '1.5rem 0' }} />

            {selectedDay === currentDay && (
              <div className="mb-3" style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '0.5rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <label className="label">Daily Reflection Scripture (Auto-saved for reuse):</label>
                <textarea 
                  className="input-field" 
                  rows="3" 
                  value={reflection} 
                  onChange={e => setReflection(e.target.value)}
                  placeholder="'But he that shall endure...' Matt. 24:13"
                ></textarea>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
              {!isReportingWindow && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '0.75rem', borderRadius: '0.5rem', marginBottom: '0.5rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  ⚠️ <span>{closedMessage} You cannot submit updates at this time.</span>
                </div>
              )}
              <button 
                onClick={() => handleSaveReport(false)} 
                disabled={saving || !isReportingWindow} 
                style={{ backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: (saving || !isReportingWindow) ? 'not-allowed' : 'pointer', opacity: (saving || !isReportingWindow) ? 0.5 : 1, transition: 'all 0.2s ease' }}
              >
                {saving ? 'Saving...' : `💾 Save ${selectedDay.replace('_', ' ')} Updates`}
              </button>
              
              {selectedDay === currentDay && (
                 <button onClick={() => handleSaveReport(true)} disabled={saving || !isReportingWindow} style={{ backgroundColor: '#047857', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: (saving || !isReportingWindow) ? 'not-allowed' : 'pointer', opacity: (saving || !isReportingWindow) ? 0.5 : 1, transition: 'all 0.2s ease' }}>
                   📋 Generate Report
                 </button>
              )}
            </div>
          </div>

          {reportText && (
            <div ref={reportRef} className="card mt-4">
              <div style={{ padding: '0.5rem' }}>
                <h3 className="mb-2">📱 Copy Your Daily Report</h3>
                <pre style={{ background: 'var(--surface-secondary)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  {reportText}
                </pre>
                <button className="btn-primary mt-2" onClick={() => { navigator.clipboard.writeText(reportText); showToast("Copied to clipboard!"); }}>Copy to Clipboard</button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'roster' && (
        <div className="card">
          <h3 className="mb-2">Manage Team Roster</h3>
          <p className="label mb-3">Update a member's status if they have left the group chat or declined the challenge. Changes made here will automatically update your active checklist and WhatsApp report.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {allMembers.map(m => {
                  const currentStatus = rosterUpdates[m.Member_Name] || String(m.Status || '').trim() || 'Active';
                  
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
                    <div key={m.Member_Name} style={{ 
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
                           {m.Member_Name.trim().charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.95rem', fontWeight: '600', lineHeight: '1.2', display: 'block', wordBreak: 'break-word' }}>{m.Member_Name}</span>
                      </div>
                      <select 
                        className="input-field" 
                        style={{ 
                          width: '95px', 
                          flexShrink: 0,
                          marginBottom: 0, 
                          padding: '0.4rem 0.2rem',
                          color: statusColor,
                          backgroundColor: statusBg,
                          border: `1px solid ${statusBorder}`,
                          fontWeight: '600',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontSize: '0.85rem'
                        }} 
                        value={currentStatus}
                        onChange={(e) => setRosterUpdates(prev => ({ ...prev, [m.Member_Name]: e.target.value }))}
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
              <button onClick={handleSaveRoster} disabled={saving} style={{ marginTop: '1rem', backgroundColor: 'var(--accent)', color: '#ffffff', border: 'none', fontWeight: 'bold', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)', fontSize: '1rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, transition: 'all 0.2s ease', width: '100%' }}>{saving ? 'Saving...' : '💾 Save Roster Updates'}</button>
        </div>
      )}
    </div>
  );
}
