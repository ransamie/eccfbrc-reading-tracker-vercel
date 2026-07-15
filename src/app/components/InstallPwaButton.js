"use client";
import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";

export default function InstallPwaButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [showIosInstruction, setShowIosInstruction] = useState(false);
  const [showGenericInstruction, setShowGenericInstruction] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (!isStandalone) {
      setIsInstallable(true);
    }

    if (window.deferredPWA) {
      setDeferredPrompt(window.deferredPWA);
    }

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      window.deferredPWA = e;
      setIsInstallable(true);
    };

    // Also poll for it just in case the event listener missed it and the script caught it early
    const interval = setInterval(() => {
      if (window.deferredPWA && !deferredPrompt) {
        setDeferredPrompt(window.deferredPWA);
        setIsInstallable(true);
        clearInterval(interval);
      }
    }, 500);

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      window.deferredPWA = null;
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      clearInterval(interval);
    };
  }, []);

  const handleInstallClick = async () => {
    // Check global variable one last time right when they click it
    const promptToUse = deferredPrompt || window.deferredPWA;
    
    if (promptToUse) {
      // Chrome/Android: show native prompt
      promptToUse.prompt();
      const { outcome } = await promptToUse.userChoice;
      if (outcome === "accepted") {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
      window.deferredPWA = null;
    } else {
      // Safari/iOS or browsers that don't support beforeinstallprompt
      const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isIos) {
        setShowIosInstruction(true);
      } else {
        setShowGenericInstruction(true);
      }
    }
  };

  if (!isInstallable) return null;

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install App"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          background: "var(--accent)",
          color: "#ffffff",
          border: "none",
          padding: "0 0.8rem",
          height: "2.5rem",
          borderRadius: "0.5rem",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s ease",
          whiteSpace: "nowrap",
        }}
      >
        <Download size={16} /> <span className="hide-on-mobile">Install App</span>
      </button>

      {showIosInstruction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }} onClick={() => setShowIosInstruction(false)}>
          <div style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            maxWidth: '350px',
            position: 'relative',
            border: '1px solid var(--border-light)'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowIosInstruction(false)}
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1rem', marginTop: 0 }}>Install on iOS</h3>
            <p style={{ lineHeight: '1.5', margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              To install this app on your iPhone/iPad:
              <br /><br />
              1. Tap the <strong>Share</strong> icon at the bottom of the screen.
              <br /><br />
              2. Scroll down and tap <strong>Add to Home Screen</strong>.
            </p>
            <button 
              onClick={() => setShowIosInstruction(false)}
              style={{ 
                width: '100%', 
                marginTop: '1.5rem',
                backgroundColor: 'var(--accent)', 
                color: '#ffffff', 
                border: 'none', 
                fontWeight: 'bold', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                cursor: 'pointer' 
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}

      {showGenericInstruction && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }} onClick={() => setShowGenericInstruction(false)}>
          <div style={{
            background: 'var(--surface)',
            color: 'var(--text-primary)',
            padding: '1.5rem',
            borderRadius: '0.5rem',
            maxWidth: '350px',
            position: 'relative',
            border: '1px solid var(--border-light)'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={() => setShowGenericInstruction(false)}
              style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1rem', marginTop: 0 }}>Install App</h3>
            <p style={{ lineHeight: '1.5', margin: 0, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
              Your browser doesn't support automatic installation prompts.
              <br /><br />
              You can usually install the app by clicking the <strong>Install</strong> icon (usually a screen with a down arrow) located in the right side of your browser's address bar, or from the browser menu (e.g. <strong>More Tools &gt; Create Shortcut...</strong>).
            </p>
            <button 
              onClick={() => setShowGenericInstruction(false)}
              style={{ 
                width: '100%', 
                marginTop: '1.5rem',
                backgroundColor: 'var(--accent)', 
                color: '#ffffff', 
                border: 'none', 
                fontWeight: 'bold', 
                padding: '0.75rem', 
                borderRadius: '0.5rem', 
                cursor: 'pointer' 
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
