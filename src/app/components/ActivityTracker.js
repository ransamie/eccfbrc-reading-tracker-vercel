"use client";
import { useEffect, useRef } from "react";

export default function ActivityTracker({ session }) {
  const sessionStartedRef = useRef(false);
  const sessionIdRef = useRef("");
  const startTimeRef = useRef(0);

  useEffect(() => {
    if (!session || !session.role) return;

    // Generate unique sessionId for this tab/window opening
    const sessId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    sessionIdRef.current = sessId;
    startTimeRef.current = Date.now();
    sessionStartedRef.current = true;

    const teamName = session.team || (session.role === 'admin' ? 'Super Admin' : 'Unknown');
    const loginType = session.role === 'admin' ? 'Admin' : 'Leader';

    // 1. Log Session Start
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'session_start',
        sessionId: sessId,
        teamName,
        loginType
      })
    }).catch(err => console.error('Activity tracker start error:', err));

    // 2. Heartbeat Ping every 45 seconds to update duration
    const interval = setInterval(() => {
      if (!sessionStartedRef.current) return;
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session_ping',
          sessionId: sessId,
          durationSeconds
        })
      }).catch(() => {});
    }, 45000);

    // 3. Log Session End on page unload or close
    const handleUnload = () => {
      if (!sessionStartedRef.current) return;
      const durationSeconds = Math.round((Date.now() - startTimeRef.current) / 1000);
      const data = JSON.stringify({
        action: 'session_end',
        sessionId: sessId,
        durationSeconds
      });
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/logs', data);
      } else {
        fetch('/api/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: data,
          keepalive: true
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
      handleUnload();
    };
  }, [session?.role, session?.team]);

  return null;
}
