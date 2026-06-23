"use client";
import { useState, useEffect } from "react";
import AdminDashboard from "./components/AdminDashboard";
import LeaderDashboard from "./components/LeaderDashboard";
import { Eye, EyeOff } from "lucide-react";

export default function Home() {
  const [session, setSession] = useState(null); // { role: 'admin' | 'leader', team?: string }
  const [loginType, setLoginType] = useState("Team Leader");
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/data?type=valid_teams")
      .then((res) => res.json())
      .then((data) => {
        if (data.validTeams) {
          setTeams(data.validTeams);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to connect to database");
        setLoading(false);
      });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loginType,
          teamName: loginType === "Team Leader" ? selectedTeam : undefined,
          pin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSession({ role: data.role, team: data.team });
      } else {
        setError(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      setError("An error occurred during login.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setPin("");
  };

  if (session?.role === "admin") {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  if (session?.role === "leader") {
    return <LeaderDashboard team={session.team} onLogout={handleLogout} />;
  }

  return (
    <div className="container" style={{ maxWidth: "600px", marginTop: "10vh", padding: "1rem" }}>
      <div className="text-center mb-4">
        <div style={{
          width: '120px', height: '120px', backgroundColor: '#000', borderRadius: '50%',
          display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 1.5rem auto'
        }}>
          <img src="/logo.png" alt="ECCF Logo" style={{ maxHeight: '90px', maxWidth: '90px', borderRadius: '50%' }} />
        </div>
        <h2 style={{ fontSize: "2.2rem", fontWeight: "700", margin: "0", textAlign: "center" }}>ECCF Bible Reading Challenge Tracker</h2>
        <p style={{ color: "var(--text-secondary)", fontWeight: 500, marginTop: "10px", textAlign: "center", fontSize: "1.1rem" }}>
          📖 June-August NT Edition
        </p>
      </div>

      <div style={{ marginTop: "2.5rem" }}>
        {error && <div className="alert alert-error mb-3" style={{ color: 'var(--accent)' }}>{error}</div>}

        {loading && !teams.length ? (
          <div className="text-center">
            <div className="spinner" style={{ margin: "0 auto 1rem auto" }}></div>
            <p>Loading database connection...</p>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "0.95rem", fontWeight: "400", marginBottom: "1rem" }}>Select Login Type:</p>
            <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem" }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="loginType" 
                  checked={loginType === "Team Leader"} 
                  onChange={() => { setLoginType("Team Leader"); setError(""); }} 
                  style={{ accentColor: "var(--accent)", width: "18px", height: "18px" }} 
                />
                <span>Team Leader</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="loginType" 
                  checked={loginType === "Super Admin"} 
                  onChange={() => { setLoginType("Super Admin"); setError(""); }} 
                  style={{ accentColor: "var(--accent)", width: "18px", height: "18px" }} 
                />
                <span>Super Admin</span>
              </label>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)', margin: '2rem 0' }} />

            <div style={{ 
              border: '1px solid var(--border-light)', 
              borderRadius: '0.5rem', 
              padding: '1.5rem',
              backgroundColor: 'transparent'
            }}>
              <form onSubmit={handleLogin}>
                {loginType === "Team Leader" && (
                  <div className="mb-3">
                    <label className="label" style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.75rem" }}>Select Your Team:</label>
                    <select
                      className="input-field"
                      value={selectedTeam}
                      onChange={(e) => setSelectedTeam(e.target.value)}
                      required
                      style={{ marginBottom: 0 }}
                    >
                      <option value="" disabled>Tap to select your team...</option>
                      {teams.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mb-4">
                  <label className="label" style={{ fontWeight: "700", fontSize: "1rem", marginBottom: "0.75rem" }}>
                    {loginType === "Super Admin" ? "Enter Super Admin PIN" : "Enter Team PIN"}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPin ? "text" : "password"}
                      className="input-field"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      required
                      placeholder=""
                      style={{ marginBottom: 0, paddingRight: "40px" }}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {showPin ? <Eye size={20} /> : <EyeOff size={20} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  style={{ 
                    width: '100%', 
                    padding: '0.6rem', 
                    backgroundColor: 'transparent', 
                    color: 'var(--text-primary)', 
                    border: '1px solid var(--border-light)', 
                    borderRadius: '0.4rem',
                    fontSize: '1rem',
                    transition: 'border 0.2s, color 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                >
                  {loading ? "Verifying..." : "Login"}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
