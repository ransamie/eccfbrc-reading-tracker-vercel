import React, { useState, useEffect } from "react";
import { Bell, BellOff, BellRing, Check, X, ShieldAlert, Sparkles, Send, Clock, AlertTriangle } from "lucide-react";
import { 
  isNotificationSupported, 
  getNotificationPermission, 
  requestNotificationPermission, 
  sendLocalNotification,
  getStoredReminderSettings,
  saveStoredReminderSettings
} from "@/lib/notificationManager";

export default function NotificationReminderModal({ isOpen, onClose, teamName = "Your Team" }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("default");
  const [settings, setSettings] = useState(getStoredReminderSettings());
  const [testing, setTesting] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSupported(isNotificationSupported());
      setPermission(getNotificationPermission());
      setSettings(getStoredReminderSettings());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggleEnable = async () => {
    if (permission !== "granted") {
      const res = await requestNotificationPermission();
      setPermission(res.status);
      if (res.success) {
        const updated = { ...settings, enabled: true };
        setSettings(updated);
        saveStoredReminderSettings(updated);
        // Fire welcoming notification
        await sendLocalNotification({
          title: `🔔 Reminders Active: ${teamName}`,
          body: `You'll now receive timely notifications to record Bible reading updates for your team!`
        });
      }
    } else {
      const updated = { ...settings, enabled: !settings.enabled };
      setSettings(updated);
      saveStoredReminderSettings(updated);
    }
  };

  const handleOptionChange = (key, val) => {
    const updated = { ...settings, [key]: val };
    setSettings(updated);
    saveStoredReminderSettings(updated);
  };

  const handleSendTestNotification = async () => {
    setTesting(true);
    setTestSuccess(false);
    try {
      if (permission !== "granted") {
        const res = await requestNotificationPermission();
        setPermission(res.status);
        if (!res.success) {
          setTesting(false);
          return;
        }
      }
      const sent = await sendLocalNotification({
        title: `📖 Time to Update ${teamName}!`,
        body: `Daily Bible reading reporting is active. Tap here to mark today's chapter updates!`,
        tag: `test-reminder-${Date.now()}`
      });
      if (sent) {
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(false), 3000);
      }
    } catch (e) {
      console.error("Test notification error:", e);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: 'var(--surface, #1E293B)',
          border: '1px solid var(--border-light, rgba(255, 255, 255, 0.12))',
          borderRadius: '1rem',
          maxWidth: '520px',
          width: '100%',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          animation: 'slideUp 0.25s ease-out',
          color: 'var(--text-primary, #F8FAFC)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border-light, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12) 0%, rgba(30, 41, 59, 0.5) 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '0.6rem',
              backgroundColor: settings.enabled && permission === 'granted' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(37, 99, 235, 0.18)',
              color: settings.enabled && permission === 'granted' ? '#34D399' : '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${settings.enabled && permission === 'granted' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(37, 99, 235, 0.35)'}`
            }}>
              {settings.enabled && permission === 'granted' ? <BellRing size={20} /> : <Bell size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
                Daily Push Reminders
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)' }}>
                Timely reminders to update {teamName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary, #94A3B8)',
              cursor: 'pointer',
              padding: '0.35rem',
              borderRadius: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {!supported ? (
            <div style={{
              padding: '1rem',
              borderRadius: '0.65rem',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: '#FCA5A5',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}>
              <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notifications Not Supported:</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  This browser does not support Web Push notifications. On iPhone/iPad, make sure to add this app to your Home Screen first to enable system notifications.
                </p>
              </div>
            </div>
          ) : permission === "denied" ? (
            <div style={{
              padding: '1rem',
              borderRadius: '0.65rem',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              color: '#FCD34D',
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem',
              marginBottom: '1rem'
            }}>
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Notifications Are Blocked</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', opacity: 0.9 }}>
                  Notifications were blocked in your browser site settings. Tap the lock/info icon next to the URL in your browser bar and select <strong>Allow Notifications</strong>.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Primary Master Switch */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 1.15rem',
                backgroundColor: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-light, rgba(255, 255, 255, 0.1))',
                borderRadius: '0.75rem',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.98rem' }}>
                    Enable Push Notifications
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary, #94A3B8)', marginTop: '0.15rem' }}>
                    Receive native pop-up reminders on phone or PC
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleToggleEnable}
                  style={{
                    width: '52px',
                    height: '28px',
                    borderRadius: '14px',
                    backgroundColor: (settings.enabled && permission === 'granted') ? '#10B981' : 'rgba(255, 255, 255, 0.18)',
                    border: 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    padding: 0
                  }}
                >
                  <div style={{
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: (settings.enabled && permission === 'granted') ? '27px' : '3px',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                  }} />
                </button>
              </div>

              {/* Reminder Channels */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginBottom: '1.25rem',
                opacity: (settings.enabled && permission === 'granted') ? 1 : 0.5,
                pointerEvents: (settings.enabled && permission === 'granted') ? 'auto' : 'none',
                transition: 'opacity 0.2s ease'
              }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-secondary, #94A3B8)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Reminder Preferences
                </div>

                {/* Morning Window */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-light, rgba(255, 255, 255, 0.06))',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌅</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Morning Window Reminder</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94A3B8)' }}>Prompt when morning reporting window opens</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.morningReminder}
                    onChange={(e) => handleOptionChange('morningReminder', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                </label>

                {/* Evening Window */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-light, rgba(255, 255, 255, 0.06))',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>🌆</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Evening Window Reminder</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94A3B8)' }}>Prompt when evening reporting window opens</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.eveningReminder}
                    onChange={(e) => handleOptionChange('eveningReminder', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                </label>

                {/* Closing Alert */}
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-light, rgba(255, 255, 255, 0.06))',
                  borderRadius: '0.55rem',
                  cursor: 'pointer'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>⏳</span>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>30-Minute Closing Alert</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94A3B8)' }}>Warn before reporting window closes if report unsaved</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.closingAlert}
                    onChange={(e) => handleOptionChange('closingAlert', e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                  />
                </label>
              </div>

              {/* Test Notification Action */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '0.65rem',
                gap: '0.75rem',
                flexWrap: 'wrap'
              }}>
                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#93C5FD' }}>
                    Want to test your phone or PC?
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary, #94A3B8)' }}>
                    Sends an instant test notification right now
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendTestNotification}
                  disabled={testing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '0.45rem',
                    backgroundColor: testSuccess ? '#10B981' : '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: testing ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {testSuccess ? <Check size={14} /> : <Send size={14} />}
                  <span>{testing ? 'Sending...' : testSuccess ? 'Sent! Check device' : 'Send Test Notification'}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '1rem 1.5rem',
          borderTop: '1px solid var(--border-light, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '0.75rem'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '0.5rem',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-primary, #F8FAFC)',
              border: '1px solid var(--border-light, rgba(255, 255, 255, 0.15))',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
