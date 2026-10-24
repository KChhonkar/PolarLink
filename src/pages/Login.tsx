import { useState } from "react";

// ⚠️ DEMO-ONLY AUTH — for hackathon prototype purposes only.
// These credentials are hardcoded and shipped in the client bundle, so
// they are NOT secure and must never be reused with real data. The
// production version of PolarLink authenticates through Firebase Auth
// with server-verified roles per station, not a client-side array.
const SCIENTISTS = [
  { id: "NCPOR-MAI-001", password: "maitri2024", name: "Dr. Priya Nair", station: "Maitri", role: "Station Commander" },
  { id: "NCPOR-BHA-002", password: "bharati2024", name: "Dr. Arjun Mehta", station: "Bharati", role: "Chief Scientist" },
  { id: "NCPOR-HIM-003", password: "himadri2024", name: "Dr. Sneha Rao", station: "Himadri", role: "Glaciologist" },
  { id: "NCPOR-HSH-004", password: "himansh2024", name: "Dr. Vikram Singh", station: "Himansh", role: "Field Researcher" },
  { id: "NCPOR-ADM-000", password: "admin2024", name: "Admin Officer", station: "All Stations", role: "Content Administrator" },
];

interface LoginProps {
  onLogin: (user: typeof SCIENTISTS[0]) => void;
  onBack: () => void;
}

export default function Login({ onLogin, onBack }: LoginProps) {
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const user = SCIENTISTS.find(
        (s) => s.id === id.trim().toUpperCase() && s.password === password
      );
      if (user) {
        onLogin(user);
      } else {
        setError("Invalid Scientist ID or password. Please try again.");
        setLoading(false);
      }
    }, 900);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#070d1a",
    border: "1px solid #1a2e4a",
    borderRadius: "4px",
    color: "#f0f6ff",
    fontSize: "0.9rem",
    padding: "12px 14px",
    outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: "border-color 0.2s",
    letterSpacing: "0.01em",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.7rem",
    fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.1em",
    color: "#64748b",
    textTransform: "uppercase",
    marginBottom: "6px",
    display: "block",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#04080f",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "30%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: "radial-gradient(circle, rgba(34,211,238,0.05) 0%, transparent 65%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.025,
        backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
        backgroundSize: "60px 60px",
      }} />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <button
            onClick={onBack}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 10,
              marginBottom: "2rem", color: "inherit", padding: 0,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #22d3ee, #0e7490 60%, #0a1220)",
              boxShadow: "0 0 20px #22d3ee33",
            }} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", fontWeight: 600, color: "#f0f6ff", letterSpacing: "-0.02em" }}>
              PolarLink
            </span>
          </button>
          <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em", color: "#22d3ee", textTransform: "uppercase" }}>
            Scientist Portal · Secure Login
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#0a1220",
          border: "1px solid #1a2e4a",
          borderRadius: "8px",
          overflow: "hidden",
        }}>
          <div style={{
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #1a2e4a",
            background: "#070d1a",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap",
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.08em" }}>
                NCPOR SECURE ACCESS · MoES
              </span>
            </span>
            <span className="demo-badge" title="This login uses hardcoded demo credentials for the hackathon prototype. Production authenticates via Firebase Auth.">Demo Mode</span>
          </div>

          <form onSubmit={handleSubmit} style={{ padding: "2rem" }}>
            <h2 style={{
              fontFamily: "'Fraunces', serif", fontSize: "1.6rem", fontWeight: 400,
              letterSpacing: "-0.025em", marginBottom: "0.4rem",
            }}>
              Sign in
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "2rem", lineHeight: 1.6 }}>
              Use your assigned Scientist ID and station password to access the upload portal and admin tools.
            </p>

            <div style={{ marginBottom: "1.25rem" }}>
              <label style={labelStyle}>Scientist ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => { setId(e.target.value); setError(""); }}
                placeholder="NCPOR-XXX-000"
                required
                autoComplete="username"
                style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.06em" }}
                onFocus={(e) => (e.target.style.borderColor = "#22d3ee55")}
                onBlur={(e) => (e.target.style.borderColor = error ? "#ef444455" : "#1a2e4a")}
              />
            </div>

            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: "42px" }}
                  onFocus={(e) => (e.target.style.borderColor = "#22d3ee55")}
                  onBlur={(e) => (e.target.style.borderColor = error ? "#ef444455" : "#1a2e4a")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 0, lineHeight: 1,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                >
                  {showPass ? (
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                      <path fillRule="evenodd" d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.373l1.091 1.092a4 4 0 0 0-5.557-5.557Z" clipRule="evenodd" />
                      <path d="M10.748 13.93l2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                      <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                      <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41Z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: "1.25rem", padding: "10px 14px",
                background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
                borderRadius: "4px", display: "flex", alignItems: "center", gap: 8,
              }}>
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14, color: "#ef4444", flexShrink: 0 }}>
                  <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm0-4a.75.75 0 0 1-.75-.75v-3.5a.75.75 0 0 1 1.5 0v3.5A.75.75 0 0 1 8 11Zm0 2.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
                </svg>
                <span style={{ fontSize: "0.8rem", color: "#fca5a5" }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", padding: "13px",
                background: loading ? "#0a1220" : "#22d3ee",
                border: "1px solid",
                borderColor: loading ? "#1a2e4a" : "#22d3ee",
                borderRadius: "4px",
                color: loading ? "#334155" : "#04080f",
                fontSize: "0.9rem", fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#38bdf8"; }}
              onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = "#22d3ee"; }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: "2px solid #1a2e4a",
                    borderTopColor: "#22d3ee", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", display: "inline-block",
                  }} />
                  Authenticating…
                </>
              ) : "Sign In to Portal"}
            </button>

            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#334155", textAlign: "center", lineHeight: 1.6 }}>
              Access restricted to authorised NCPOR personnel.<br />
              Contact your station coordinator for credentials.
            </p>
          </form>
        </div>

        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, margin: "1.5rem auto 0",
            background: "none", border: "none", color: "#475569", cursor: "pointer",
            fontSize: "0.8rem", fontFamily: "'Inter', system-ui, sans-serif",
            transition: "color 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
        >
          <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 12, height: 12 }}>
            <path fillRule="evenodd" d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Back to PolarLink
        </button>

        {/* Demo credentials hint */}
        <div style={{
          marginTop: "1.5rem", padding: "1rem 1.25rem",
          border: "1px solid #1a2e4a", borderRadius: "6px",
          background: "#070d1a",
        }}>
          <p style={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", color: "#334155", letterSpacing: "0.06em", marginBottom: "0.6rem", textTransform: "uppercase" }}>Demo credentials</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {[
              { id: "NCPOR-MAI-001", pass: "maitri2024", label: "Maitri Station" },
              { id: "NCPOR-ADM-000", pass: "admin2024", label: "Admin Officer" },
            ].map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setId(c.id); setPassword(c.pass); setError(""); }}
                style={{
                  background: "none", border: "none", cursor: "pointer", padding: "4px 0",
                  textAlign: "left", display: "flex", gap: 8, alignItems: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <span style={{ fontSize: "0.7rem", color: "#22d3ee" }}>{c.id}</span>
                <span style={{ fontSize: "0.65rem", color: "#334155" }}>·</span>
                <span style={{ fontSize: "0.7rem", color: "#475569" }}>{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

export type { };
export { SCIENTISTS };
