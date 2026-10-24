import { useState, useEffect, useRef, useCallback } from "react";
import { SCIENTISTS } from "./Login";
import {
  STATIONS, CONTENT_TYPES, CONTENT_TYPE_LABELS, TYPE_ICONS,
  INITIAL_SUBMISSIONS,
  type Submission, type SubmissionStatus,
} from "../data";
import { loadSubmissions, saveSubmissions } from "../lib/submissionsStore";
import { checkAiHealth, summarizeFile } from "../lib/aiSummarize";

type User = typeof SCIENTISTS[0];

const STATUS_COLORS: Record<SubmissionStatus, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.3)", text: "#fbbf24", label: "Pending Review" },
  approved: { bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.3)", text: "#22d3ee", label: "Approved" },
  rejected: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", text: "#f87171", label: "Rejected" },
};

interface AdminProps {
  user: User;
  onLogout: () => void;
}

export default function Admin({ user, onLogout }: AdminProps) {
  // Seeded with the static defaults; the effect below loads the real,
  // shared data (server API when available, else localStorage) on mount
  // so approve/reject decisions — and uploads from other people — survive
  // a refresh and stay in sync across everyone connected to this server.
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loaded, setLoaded] = useState(false);
  // Tracks the last time *this* tab changed submissions, so the polling
  // refresh below doesn't clobber an action that's still mid-flight to
  // the server with slightly-stale data from before it landed.
  const lastLocalChangeRef = useRef(0);
  // The first submissions write after load is hydration, not a user edit.
  // Persisting it would POST seed/stale state and can overwrite a torn or
  // in-flight server write with INITIAL_SUBMISSIONS.
  const skipHydrationSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    loadSubmissions().then((subs) => {
      if (!cancelled) { setSubmissions(subs); setLoaded(true); }
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (skipHydrationSaveRef.current) {
      skipHydrationSaveRef.current = false;
      return;
    }
    lastLocalChangeRef.current = Date.now();
    saveSubmissions(submissions);
  }, [submissions, loaded]);

  // Poll for changes made elsewhere — another scientist uploading, another
  // admin approving on a different device — so this queue stays in sync
  // with everyone connected to the same locally-hosted server.
  useEffect(() => {
    if (!loaded) return;
    const id = setInterval(async () => {
      if (Date.now() - lastLocalChangeRef.current < 3000) return;
      const fresh = await loadSubmissions();
      setSubmissions((prev) => (JSON.stringify(prev) === JSON.stringify(fresh) ? prev : fresh));
    }, 4000);
    return () => clearInterval(id);
  }, [loaded]);

  const [filter, setFilter] = useState<"all" | SubmissionStatus>("all");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [activeTab, setActiveTab] = useState<"submissions" | "upload">("submissions");

  const isAdmin = user.id === "NCPOR-ADM-000";

  const visible = submissions.filter((s) => {
    if (!isAdmin && s.station !== user.station) return false;
    if (filter === "all") return true;
    return s.status === filter;
  });

  const counts = {
    all: submissions.filter((s) => isAdmin || s.station === user.station).length,
    pending: submissions.filter((s) => s.status === "pending" && (isAdmin || s.station === user.station)).length,
    approved: submissions.filter((s) => s.status === "approved" && (isAdmin || s.station === user.station)).length,
    rejected: submissions.filter((s) => s.status === "rejected" && (isAdmin || s.station === user.station)).length,
  };

  const updateStatus = (id: string, status: SubmissionStatus) => {
    setSubmissions((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    setActiveId(null);
    setRejectNote("");
  };

  const active = submissions.find((s) => s.id === activeId) ?? null;

  const navLinkStyle = (tab: typeof activeTab): React.CSSProperties => ({
    padding: "8px 16px", borderRadius: "4px", cursor: "pointer",
    fontSize: "0.82rem", fontWeight: 500, border: "none",
    background: activeTab === tab ? "rgba(34,211,238,0.1)" : "transparent",
    color: activeTab === tab ? "#22d3ee" : "#64748b",
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: "all 0.15s",
  });

  return (
    <div style={{ minHeight: "100vh", background: "#04080f", color: "#f0f6ff", display: "flex", flexDirection: "column" }}>

      {/* Top bar */}
      <header style={{
        height: 60, borderBottom: "1px solid #1a2e4a",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 1.5rem", background: "#070d1a", flexShrink: 0,
        position: "sticky", top: 0, zIndex: 40,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #22d3ee, #0e7490 60%, #0a1220)",
              boxShadow: "0 0 12px #22d3ee33",
            }} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", fontWeight: 600, color: "#f0f6ff" }}>PolarLink</span>
          </div>
          <div style={{ width: 1, height: 20, background: "#1a2e4a" }} />
          <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.06em" }}>
            {isAdmin ? "ADMIN CONSOLE" : "SCIENTIST PORTAL"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.82rem", fontWeight: 500 }}>{user.name}</div>
            <div style={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569" }}>
              {user.id} · {user.station}
            </div>
          </div>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #22d3ee22, #0e7490)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "0.85rem", fontWeight: 600, color: "#22d3ee",
            border: "1px solid #22d3ee33",
          }}>
            {user.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: "6px 14px", borderRadius: "4px",
              border: "1px solid #1a2e4a", background: "transparent",
              color: "#64748b", fontSize: "0.78rem", cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#f0f6ff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a2e4a"; e.currentTarget.style.color = "#64748b"; }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>

        {/* Sidebar */}
        <aside style={{
          width: 220, borderRight: "1px solid #1a2e4a",
          background: "#070d1a", padding: "1.5rem 1rem",
          display: "flex", flexDirection: "column", gap: "0.25rem",
          flexShrink: 0,
        }}>
          <p style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 8px", marginBottom: "0.5rem" }}>Navigation</p>

          {[
            { tab: "submissions" as const, label: "Submissions", icon: (
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path d="M5.5 3.5A1.5 1.5 0 0 1 7 2h2.879a1.5 1.5 0 0 1 1.06.44l2.122 2.12a1.5 1.5 0 0 1 .439 1.061V12.5A1.5 1.5 0 0 1 12 14H4A1.5 1.5 0 0 1 2.5 12.5v-9Z" />
              </svg>
            )},
            // Upload is only for scientists submitting content from their
            // station — admins review, they don't submit, so this tab is
            // hidden for the Content Administrator account.
            ...(!isAdmin ? [{ tab: "upload" as const, label: "Upload", icon: (
              <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                <path fillRule="evenodd" d="M8 1.5a.75.75 0 0 1 .75.75v6.19l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V2.25A.75.75 0 0 1 8 1.5ZM3 12.5a.75.75 0 0 1 .75-.75h8.5a.75.75 0 0 1 0 1.5h-8.5A.75.75 0 0 1 3 12.5Z" clipRule="evenodd" />
              </svg>
            )}] : []),
          ].map(({ tab, label, icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={navLinkStyle(tab)}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {icon}{label}
              </span>
            </button>
          ))}

          <div style={{ marginTop: "auto", paddingTop: "1.5rem", borderTop: "1px solid #1a2e4a", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ padding: "0.75rem", background: "#0a1220", borderRadius: "4px", border: "1px solid #1a2e4a" }}>
              <p style={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", marginBottom: "0.5rem" }}>Station</p>
              <p style={{ fontSize: "0.82rem", fontWeight: 500 }}>{user.station}</p>
              <p style={{ fontSize: "0.72rem", color: "#475569", marginTop: 2 }}>{user.role}</p>
            </div>
            <button
              onClick={() => {
                if (confirm("Reset all submissions back to the original demo seed data?")) {
                  setSubmissions(INITIAL_SUBMISSIONS);
                }
              }}
              style={{
                padding: "8px 10px", borderRadius: "4px",
                border: "1px solid #1a2e4a", background: "transparent",
                color: "#475569", fontSize: "0.72rem", cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.04em",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#94a3b8"; e.currentTarget.style.borderColor = "#334155"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#475569"; e.currentTarget.style.borderColor = "#1a2e4a"; }}
              title="Restores the original demo submissions — useful before a fresh walkthrough"
            >
              ↺ Reset demo data
            </button>
          </div>
        </aside>

        {/* Main */}
        <main style={{ flex: 1, overflow: "auto", padding: "2rem" }}>

          {activeTab === "upload" && (
            <UploadPortal
              user={user}
              onSubmitted={(newSubs) => {
                setSubmissions((prev) => [...newSubs, ...prev]);
              }}
            />
          )}

          {activeTab === "submissions" && !loaded && (
            <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#475569", fontSize: "0.9rem", fontFamily: "'JetBrains Mono', monospace" }}>
              Loading submissions…
            </div>
          )}

          {activeTab === "submissions" && loaded && (
          <>
          {/* Stats row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
            {(["all", "pending", "approved", "rejected"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  padding: "1rem 1.25rem", borderRadius: "6px", cursor: "pointer",
                  border: `1px solid ${filter === s ? (s === "all" ? "#22d3ee55" : STATUS_COLORS[s as SubmissionStatus]?.border ?? "#22d3ee55") : "#1a2e4a"}`,
                  background: filter === s ? (s === "all" ? "rgba(34,211,238,0.05)" : STATUS_COLORS[s as SubmissionStatus]?.bg ?? "rgba(34,211,238,0.05)") : "#0a1220",
                  textAlign: "left", transition: "all 0.15s", fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                <div style={{
                  fontSize: "1.6rem", fontFamily: "'Fraunces', serif", fontWeight: 300,
                  color: s === "all" ? "#f0f6ff" : STATUS_COLORS[s as SubmissionStatus]?.text ?? "#f0f6ff",
                  lineHeight: 1, marginBottom: 6,
                }}>
                  {counts[s]}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#64748b", textTransform: "capitalize" }}>
                  {s === "all" ? "Total" : STATUS_COLORS[s as SubmissionStatus]?.label}
                </div>
              </button>
            ))}
          </div>

          {/* Table header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", fontWeight: 400 }}>
              {filter === "all" ? "All Submissions" : STATUS_COLORS[filter]?.label}
            </h2>
            <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569" }}>
              {visible.length} {visible.length === 1 ? "item" : "items"}
            </span>
          </div>

          {/* Submission list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {visible.length === 0 && (
              <div style={{ textAlign: "center", padding: "4rem 2rem", color: "#334155", fontSize: "0.9rem" }}>
                No submissions match this filter.
              </div>
            )}
            {visible.map((sub) => {
              const sc = STATUS_COLORS[sub.status];
              return (
                <div
                  key={sub.id}
                  style={{
                    border: "1px solid #1a2e4a", borderRadius: "6px",
                    background: "#0a1220", overflow: "hidden",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#1e3a5a")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1a2e4a")}
                >
                  <div style={{
                    padding: "1rem 1.25rem",
                    display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap",
                  }}>
                    {/* Thumbnail (photo submissions) or type icon */}
                    {sub.previewUrl ? (
                      <img
                        src={sub.previewUrl}
                        alt=""
                        style={{
                          width: 40, height: 40, borderRadius: "4px",
                          objectFit: "cover", border: "1px solid #1a2e4a", flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div style={{
                        width: 40, height: 40, borderRadius: "4px",
                        background: "#0e1a2e", border: "1px solid #1a2e4a",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.1rem", flexShrink: 0,
                      }}>
                        {TYPE_ICONS[sub.type] ?? "📄"}
                      </div>
                    )}

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {sub.title}
                        </span>
                        <span style={{
                          fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace",
                          padding: "2px 8px", borderRadius: "2px",
                          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                          flexShrink: 0,
                        }}>
                          {sc.label}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                        {[sub.station, sub.type, sub.year, sub.fileExt + " · " + sub.fileSize, sub.uploadedAt].map((m, i) => (
                          <span key={i} style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569" }}>{m}</span>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      <button
                        onClick={() => setActiveId(activeId === sub.id ? null : sub.id)}
                        style={{
                          padding: "6px 14px", borderRadius: "3px",
                          border: "1px solid #1a2e4a", background: "transparent",
                          color: "#94a3b8", fontSize: "0.78rem", cursor: "pointer",
                          fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#f0f6ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a2e4a"; e.currentTarget.style.color = "#94a3b8"; }}
                      >
                        {activeId === sub.id ? "Collapse" : "Review"}
                      </button>
                      {isAdmin && sub.status === "pending" && (
                        <>
                          <button
                            onClick={() => updateStatus(sub.id, "approved")}
                            style={{
                              padding: "6px 14px", borderRadius: "3px",
                              border: "1px solid rgba(34,211,238,0.3)", background: "rgba(34,211,238,0.08)",
                              color: "#22d3ee", fontSize: "0.78rem", cursor: "pointer",
                              fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s",
                            }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setActiveId(sub.id)}
                            style={{
                              padding: "6px 14px", borderRadius: "3px",
                              border: "1px solid rgba(239,68,68,0.25)", background: "rgba(239,68,68,0.06)",
                              color: "#f87171", fontSize: "0.78rem", cursor: "pointer",
                              fontFamily: "'Inter', system-ui, sans-serif", transition: "all 0.15s",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded review panel */}
                  {activeId === sub.id && (
                    <div style={{ borderTop: "1px solid #1a2e4a", background: "#070d1a" }}>
                      {sub.previewUrl && (
                        <div style={{ padding: "1.5rem 1.25rem 0" }}>
                          <p style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>Uploaded Photo</p>
                          <img
                            src={sub.previewUrl}
                            alt={sub.title}
                            style={{
                              width: "100%", maxHeight: 340, objectFit: "cover",
                              borderRadius: "6px", border: "1px solid #1a2e4a", display: "block",
                            }}
                          />
                        </div>
                      )}
                      <div style={{ padding: "1.5rem 1.25rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.5rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap", marginBottom: "0.5rem" }}>
                            <p style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>AI Summary</p>
                            <AiOriginBadge model={sub.aiModel} failed={sub.aiFailed} />
                          </div>
                          {basisLabel(sub.aiBasis) && (
                            <p style={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", marginBottom: "0.5rem" }}>{basisLabel(sub.aiBasis)}</p>
                          )}
                          <p style={{ fontSize: "0.83rem", color: "#94a3b8", lineHeight: 1.7 }}>{sub.aiSummary}</p>
                          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
                            {sub.tags.map((t) => (
                              <span key={t} style={{
                                fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace",
                                padding: "2px 8px", border: "1px solid #1a2e4a",
                                borderRadius: "2px", color: "#475569",
                              }}>#{t}</span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.5rem" }}>AI Social Caption</p>
                          <div style={{ padding: "0.875rem", background: "#0a1220", border: "1px solid #1a2e4a", borderRadius: "4px" }}>
                            <p style={{ fontSize: "0.83rem", color: "#94a3b8", lineHeight: 1.7 }}>{sub.aiCaption}</p>
                          </div>
                        </div>
                      </div>

                      {isAdmin && sub.status === "pending" && (
                        <div style={{ borderTop: "1px solid #1a2e4a", padding: "1rem 1.25rem", display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 200 }}>
                            <label style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                              Rejection note (optional)
                            </label>
                            <input
                              type="text"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              placeholder="Reason for rejection…"
                              style={{
                                width: "100%", background: "#0a1220",
                                border: "1px solid #1a2e4a", borderRadius: "3px",
                                color: "#f0f6ff", fontSize: "0.82rem",
                                padding: "8px 12px", outline: "none",
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              onClick={() => updateStatus(sub.id, "approved")}
                              style={{
                                padding: "8px 18px", borderRadius: "3px",
                                border: "1px solid rgba(34,211,238,0.4)", background: "rgba(34,211,238,0.1)",
                                color: "#22d3ee", fontSize: "0.82rem", cursor: "pointer",
                                fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600,
                              }}
                            >
                              ✓ Approve & Publish
                            </button>
                            <button
                              onClick={() => updateStatus(sub.id, "rejected")}
                              style={{
                                padding: "8px 18px", borderRadius: "3px",
                                border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)",
                                color: "#f87171", fontSize: "0.82rem", cursor: "pointer",
                                fontFamily: "'Inter', system-ui, sans-serif",
                              }}
                            >
                              ✕ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.status !== "pending" && (
                        <div style={{
                          borderTop: "1px solid #1a2e4a", padding: "0.75rem 1.25rem",
                          background: sub.status === "approved" ? "rgba(34,211,238,0.03)" : "rgba(239,68,68,0.03)",
                          display: "flex", alignItems: "center", gap: 8,
                        }}>
                          <span style={{ fontSize: "0.75rem", color: sub.status === "approved" ? "#22d3ee" : "#f87171" }}>
                            {sub.status === "approved" ? "✓ Approved — live on public portal" : "✕ Rejected — not published"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload portal — scientist-facing, only reachable once logged in via the
// "Upload" tab above (hidden from the admin/reviewer account). Submitting
// a file here pushes it straight into the shared submissions list above
// with status "pending", so it shows up immediately in the admin's queue
// for approve/reject — no separate sync step, since this is a client-only
// demo. Production would write to Firestore instead and the admin queue
// would subscribe to that collection in real time.

type UploadState = "idle" | "uploading" | "processing" | "done" | "error";

interface UploadedFile {
  file: File;
  id: string;
  progress: number;
  state: UploadState;
  aiSummary?: string;
  aiCaption?: string;
  aiTags?: string[];
  aiModel?: string;
  aiBasis?: string;
  aiFailed?: boolean;
  // Data URL preview, generated client-side for image files only, so the
  // actual uploaded photo can be shown in the admin queue and (once
  // approved) on the public site — not just a generic file icon.
  previewUrl?: string;
}

function prettyModel(model?: string): string {
  if (!model) return "Gemma 4";
  if (/gemma\s*4/i.test(model) || model.toLowerCase().startsWith("gemma4")) return "Gemma 4";
  return model.split(":")[0] || model;
}

function basisLabel(basis?: string): string | null {
  if (basis === "text") return "Based on: document text";
  if (basis === "image") return "Based on: image";
  if (basis === "table") return "Based on: table";
  if (basis === "metadata") return "Based on: metadata only";
  return null;
}

function AiOriginBadge({ model, failed }: { model?: string; failed?: boolean }) {
  if (failed) {
    return (
      <span className="demo-badge" title="Ollama was unreachable; a metadata template was used.">
        Template fallback (AI offline)
      </span>
    );
  }
  if (model) {
    return (
      <span className="ai-live-badge" title={`Generated locally with ${model} via Ollama`}>
        {prettyModel(model)} · local
      </span>
    );
  }
  return (
    <span className="demo-badge" title="Seeded demo content for this prototype build.">
      Simulated
    </span>
  );
}

function formatTimestamp(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatFileSize(bytes: number): string {
  const mb = bytes / 1024 / 1024;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Reads an image file and produces a downscaled, JPEG-compressed data URL
// for use as a preview thumbnail. A raw phone photo can be several MB —
// stored as base64 that easily exceeds localStorage's ~5MB quota once a
// few submissions build up, which silently fails to save (see the
// try/catch below) and makes a submission vanish on refresh. Capping the
// longest edge at maxDim and re-encoding as JPEG keeps each preview to
// roughly tens of KB, which is plenty for a review-queue thumbnail.
function createImagePreview(file: File, maxDim = 640, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) { reject(new Error("Could not read file")); return; }
      const img = new Image();
      img.onerror = () => reject(new Error("Could not decode image"));
      img.onload = () => {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

interface UploadPortalProps {
  user: User;
  onSubmitted: (newSubmissions: Submission[]) => void;
}

function UploadPortal({ user, onSubmitted }: UploadPortalProps) {
  const [station, setStation] = useState(user.station !== "All Stations" ? user.station : "");
  const [contentType, setContentType] = useState("");
  const [year, setYear] = useState("2026");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [queueSent, setQueueSent] = useState(false);
  const [aiHealth, setAiHealth] = useState<{ ok: boolean; model?: string; modelInstalled?: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pushedRef = useRef(false);
  const filesRef = useRef<UploadedFile[]>([]);
  const metaRef = useRef({ station, contentType, year, title, description });

  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => {
    metaRef.current = { station, contentType, year, title, description };
  }, [station, contentType, year, title, description]);
  useEffect(() => {
    checkAiHealth().then(setAiHealth);
  }, []);

  const addFiles = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles: UploadedFile[] = Array.from(incoming).map((f) => ({
      file: f,
      id: Math.random().toString(36).slice(2),
      progress: 0,
      state: "idle" as UploadState,
    }));
    setFiles((prev) => [...prev, ...newFiles]);

    // For actual image files, generate a downscaled/compressed preview so
    // the real photo (not a placeholder icon) can be shown in the admin
    // queue and, once approved, in the public gallery — without bloating
    // localStorage past its quota (see createImagePreview above).
    newFiles.forEach((nf) => {
      if (!nf.file.type.startsWith("image/")) return;
      createImagePreview(nf.file)
        .then((previewUrl) => {
          setFiles((prev) => prev.map((f) => f.id === nf.id ? { ...f, previewUrl } : f));
        })
        .catch(() => { /* preview generation failed; submission still works, just without a photo */ });
    });
  }, []);

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const applyAiResult = (id: string, result: Awaited<ReturnType<typeof summarizeFile>>) => {
    setFiles((prev) => prev.map((f) => f.id === id ? {
      ...f,
      state: "done" as UploadState,
      aiSummary: result.summary,
      aiCaption: result.caption,
      aiTags: result.tags,
      aiModel: result.model || undefined,
      aiBasis: result.basis,
      aiFailed: !result.ok,
    } : f));
  };

  const runSummarize = async (id: string) => {
    const current = filesRef.current.find((f) => f.id === id);
    if (!current) return;
    const result = await summarizeFile(current.file, metaRef.current);
    applyAiResult(id, result);
  };

  const regenerate = (id: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, state: "processing" } : f));
    void runSummarize(id);
  };

  const simulateUpload = (id: string) => {
    setFiles((prev) => prev.map((f) => f.id === id ? { ...f, state: "uploading", progress: 0 } : f));
    let p = 0;
    const tick = setInterval(() => {
      p += Math.random() * 18 + 6;
      if (p >= 100) {
        clearInterval(tick);
        setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: 100, state: "processing" } : f));
        void runSummarize(id);
      } else {
        setFiles((prev) => prev.map((f) => f.id === id ? { ...f, progress: Math.min(p, 99) } : f));
      }
    }, 120);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.length) return;
    if (files.every((f) => f.state === "done")) {
      setQueueSent(true);
      return;
    }
    files.forEach((f) => { if (f.state === "idle") simulateUpload(f.id); });
  };

  const allDone = files.length > 0 && files.every((f) => f.state === "done");
  const anyUploading = files.some((f) => f.state === "uploading" || f.state === "processing");

  // The moment every file finishes AI processing, push them straight into
  // the shared admin review queue as "pending" submissions — this is what
  // makes a sample upload appear immediately in the admin portal for
  // approve/reject, e.g. for a live judge demo.
  useEffect(() => {
    if (allDone && queueSent && !pushedRef.current) {
      pushedRef.current = true;
      const typeLabel = CONTENT_TYPE_LABELS[contentType] ?? "Report";
      const now = new Date();
      const newSubs: Submission[] = files.map((f, i) => ({
        id: `SUB-${year}-${String(Math.floor(1000 + Math.random() * 9000))}${i}`,
        title: title || f.file.name,
        station: station || user.station,
        type: typeLabel,
        year,
        author: user.name,
        uploadedAt: formatTimestamp(now),
        status: "pending",
        fileSize: formatFileSize(f.file.size),
        fileExt: (f.file.name.split(".").pop() || "FILE").toUpperCase(),
        aiSummary: f.aiSummary || "",
        aiCaption: f.aiCaption || "",
        tags: Array.from(new Set(
          [station.toLowerCase() || user.station.toLowerCase(), contentType, "new-submission", ...(f.aiTags || [])]
            .filter(Boolean),
        )),
        previewUrl: f.previewUrl,
        aiModel: f.aiModel,
        aiBasis: f.aiBasis,
        aiFailed: f.aiFailed,
      }));
      onSubmitted(newSubs);
    }
  }, [allDone, queueSent, files, contentType, year, title, station, user, onSubmitted]);

  const inputStyle = {
    width: "100%", background: "#070d1a",
    border: "1px solid #1a2e4a", borderRadius: "4px",
    color: "#f0f6ff", fontSize: "0.875rem",
    padding: "10px 14px", outline: "none",
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: "border-color 0.2s",
  } as React.CSSProperties;

  const labelStyle = {
    fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace",
    letterSpacing: "0.08em", color: "#64748b",
    textTransform: "uppercase" as const, marginBottom: "6px", display: "block",
  };

  return (
    <section style={{ maxWidth: 900 }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: "1rem", flexWrap: "wrap" }}>
          <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", color: "#22d3ee", margin: 0, textTransform: "uppercase" }}>
            Scientist Portal
          </p>
          {aiHealth && (
            <span
              title={aiHealth.ok && aiHealth.modelInstalled ? (aiHealth.model || "Gemma 4") : undefined}
              style={{
                fontSize: "0.65rem",
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: "0.04em",
                padding: "3px 8px",
                borderRadius: "3px",
                border: "1px solid",
                color: aiHealth.ok && aiHealth.modelInstalled ? "#34d399" : aiHealth.ok ? "#fbbf24" : "#f87171",
                background: aiHealth.ok && aiHealth.modelInstalled ? "rgba(52,211,153,0.08)" : aiHealth.ok ? "rgba(234,179,8,0.08)" : "rgba(239,68,68,0.08)",
                borderColor: aiHealth.ok && aiHealth.modelInstalled ? "rgba(52,211,153,0.3)" : aiHealth.ok ? "rgba(234,179,8,0.25)" : "rgba(239,68,68,0.25)",
              }}
            >
              {aiHealth.ok && aiHealth.modelInstalled
                ? "Gemma 4 ready"
                : aiHealth.ok
                  ? "Model not installed, run `ollama pull gemma4:e4b`"
                  : "Ollama not running"}
            </span>
          )}
        </div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(1.6rem, 3vw, 2.2rem)", fontWeight: 300, letterSpacing: "-0.025em", marginBottom: "0.75rem" }}>
          Upload expedition content.
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#64748b", lineHeight: 1.7, fontWeight: 300, maxWidth: 560 }}>
          Submit reports, datasets, photos, and media from your station. AI drafts a public summary and social caption, then it lands in the admin queue for review before anything goes live.
        </p>
      </div>

      {queueSent ? (
        <div style={{
          border: "1px solid rgba(34,211,238,0.3)", borderRadius: "8px",
          background: "rgba(34,211,238,0.05)", padding: "2.5rem 2rem",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1.5rem" }}>
            <div style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "rgba(34,211,238,0.12)", border: "1px solid rgba(34,211,238,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#22d3ee",
            }}>
              <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 20, height: 20 }}>
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", fontWeight: 400 }}>Submitted for review</h3>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: 2 }}>Now visible in the admin Submissions queue, pending approval</p>
            </div>
          </div>

          {files.map((f) => f.aiCaption && (
            <div key={f.id} style={{ marginTop: "1.5rem" }}>
              <div style={{ border: "1px solid #1a2e4a", borderRadius: "6px", overflow: "hidden" }}>
                <div style={{ padding: "0.75rem 1rem", background: "#0a1220", borderBottom: "1px solid #1a2e4a", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <span style={{ fontSize: "0.7rem", fontFamily: "'JetBrains Mono', monospace", color: "#22d3ee", letterSpacing: "0.08em" }}>AI-GENERATED DRAFT · PENDING REVIEW</span>
                  <AiOriginBadge model={f.aiModel} failed={f.aiFailed} />
                </div>
                {f.previewUrl && (
                  <img
                    src={f.previewUrl}
                    alt={f.file.name}
                    style={{ width: "100%", maxHeight: 320, objectFit: "cover", display: "block", borderBottom: "1px solid #1a2e4a" }}
                  />
                )}
                <div style={{ padding: "1.25rem 1rem", background: "#070d1a" }}>
                  {basisLabel(f.aiBasis) && (
                    <p style={{ fontSize: "0.68rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", marginBottom: "0.75rem" }}>{basisLabel(f.aiBasis)}</p>
                  )}
                  <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", marginBottom: 6, letterSpacing: "0.06em" }}>PLAIN-LANGUAGE SUMMARY</p>
                  <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.7, marginBottom: "1.25rem" }}>{f.aiSummary}</p>
                  <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", marginBottom: 6, letterSpacing: "0.06em" }}>SOCIAL CAPTION DRAFT</p>
                  <p style={{ fontSize: "0.875rem", color: "#94a3b8", lineHeight: 1.7 }}>{f.aiCaption}</p>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => { setFiles([]); setQueueSent(false); setTitle(""); setDescription(""); setContentType(""); pushedRef.current = false; }}
            style={{
              marginTop: "2rem", padding: "10px 20px", borderRadius: "4px",
              border: "1px solid #1a2e4a", background: "transparent",
              color: "#94a3b8", fontSize: "0.85rem", cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#f0f6ff"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2e4a"; e.currentTarget.style.color = "#94a3b8"; }}
          >
            Upload another
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem", marginBottom: "1.5rem" }}>
            <div>
              <label style={labelStyle}>Station</label>
              <select
                value={station}
                onChange={(e) => setStation(e.target.value)}
                required
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "#22d3ee55")}
                onBlur={e => (e.target.style.borderColor = "#1a2e4a")}
              >
                <option value="">Select station…</option>
                {STATIONS.map((s) => (
                  <option key={s.name} value={s.name}>{s.name} — {s.region}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Content Type</label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                required
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "#22d3ee55")}
                onBlur={e => (e.target.style.borderColor = "#1a2e4a")}
              >
                <option value="">Select type…</option>
                {CONTENT_TYPES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Expedition Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer" }}
                onFocus={e => (e.target.style.borderColor = "#22d3ee55")}
                onBlur={e => (e.target.style.borderColor = "#1a2e4a")}
              >
                {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ice core analysis — Maitri Summer 2024"
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "#22d3ee55")}
              onBlur={e => (e.target.style.borderColor = "#1a2e4a")}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={labelStyle}>Brief Description <span style={{ color: "#334155" }}>(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the content, key findings, or context for this upload…"
              style={{ ...inputStyle, resize: "vertical" as const, minHeight: 88 }}
              onFocus={e => (e.target.style.borderColor = "#22d3ee55")}
              onBlur={e => (e.target.style.borderColor = "#1a2e4a")}
            />
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? "#22d3ee" : "#1a2e4a"}`,
              borderRadius: "6px",
              padding: "3rem 2rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "rgba(34,211,238,0.04)" : "#070d1a",
              transition: "all 0.2s",
              marginBottom: "1.5rem",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={CONTENT_TYPES.find((c) => c.value === contentType)?.exts || "*"}
              style={{ display: "none" }}
              onChange={(e) => addFiles(e.target.files)}
            />
            <div style={{
              width: 48, height: 48, borderRadius: "50%",
              background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#22d3ee", margin: "0 auto 1rem",
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 22, height: 22 }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p style={{ fontSize: "0.9rem", fontWeight: 500, color: "#f0f6ff", marginBottom: 4 }}>
              Drop files here or <span style={{ color: "#22d3ee" }}>browse</span>
            </p>
            <p style={{ fontSize: "0.78rem", color: "#475569" }}>
              {contentType
                ? `Accepted: ${CONTENT_TYPES.find((c) => c.value === contentType)?.exts}`
                : "Select a content type above to filter accepted formats"}
            </p>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {files.map((f) => (
                <div key={f.id} style={{
                  border: "1px solid #1a2e4a", borderRadius: "4px",
                  background: "#0a1220", padding: "0.875rem 1rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {f.previewUrl ? (
                      <img
                        src={f.previewUrl}
                        alt=""
                        style={{ width: 32, height: 32, borderRadius: "3px", flexShrink: 0, objectFit: "cover" }}
                      />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: "3px", flexShrink: 0,
                        background: "#0e1a2e", display: "flex", alignItems: "center",
                        justifyContent: "center", color: "#22d3ee",
                      }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
                          <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: "0.83rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.file.name}</span>
                        <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", flexShrink: 0 }}>
                          {(f.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                      {f.state === "uploading" && (
                        <div style={{ height: 2, background: "#1a2e4a", borderRadius: 1, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${f.progress}%`, background: "#22d3ee", borderRadius: 1, transition: "width 0.1s linear" }} />
                        </div>
                      )}
                      {f.state === "processing" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="ai-pulse-dot" />
                          <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#22d3ee" }}>Gemma 4 is reading your file…</span>
                        </div>
                      )}
                      {f.state === "done" && (
                        <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#22d3ee" }}>✓ Uploaded · AI draft ready</span>
                      )}
                      {f.state === "idle" && (
                        <span style={{ fontSize: "0.72rem", color: "#475569" }}>Ready to upload</span>
                      )}
                    </div>
                    {f.state === "idle" && (
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", padding: 4, flexShrink: 0, lineHeight: 1 }}
                        onMouseEnter={e => (e.currentTarget.style.color = "#f0f6ff")}
                        onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
                      >
                        <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {f.state === "done" && (
                    <div style={{ marginTop: "0.9rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                          <AiOriginBadge model={f.aiModel} failed={f.aiFailed} />
                          {basisLabel(f.aiBasis) && (
                            <span style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569" }}>{basisLabel(f.aiBasis)}</span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => regenerate(f.id)}
                          style={{
                            padding: "4px 10px", borderRadius: "3px",
                            border: "1px solid #1a2e4a", background: "transparent",
                            color: "#94a3b8", fontSize: "0.72rem", cursor: "pointer",
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          Regenerate
                        </button>
                      </div>
                      <label style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", letterSpacing: "0.06em" }}>PLAIN-LANGUAGE SUMMARY</label>
                      <textarea
                        value={f.aiSummary || ""}
                        onChange={(e) => setFiles((prev) => prev.map((x) => x.id === f.id ? { ...x, aiSummary: e.target.value } : x))}
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                      />
                      <label style={{ fontSize: "0.65rem", fontFamily: "'JetBrains Mono', monospace", color: "#64748b", letterSpacing: "0.06em" }}>SOCIAL CAPTION DRAFT</label>
                      <textarea
                        value={f.aiCaption || ""}
                        onChange={(e) => setFiles((prev) => prev.map((x) => x.id === f.id ? { ...x, aiCaption: e.target.value } : x))}
                        rows={3}
                        style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              type="submit"
              disabled={anyUploading || !files.length}
              style={{
                padding: "12px 28px", borderRadius: "4px",
                background: anyUploading || !files.length ? "#0a1220" : "#22d3ee",
                border: "1px solid",
                borderColor: anyUploading || !files.length ? "#1a2e4a" : "#22d3ee",
                color: anyUploading || !files.length ? "#334155" : "#04080f",
                fontSize: "0.9rem", fontWeight: 600,
                cursor: anyUploading || !files.length ? "not-allowed" : "pointer",
                fontFamily: "'Inter', system-ui, sans-serif",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              {anyUploading ? (
                <>
                  <span style={{
                    width: 14, height: 14, border: "2px solid #334155",
                    borderTopColor: "#22d3ee", borderRadius: "50%",
                    animation: "spin 0.7s linear infinite", display: "inline-block",
                  }} />
                  {files.some((f) => f.state === "processing") ? "Gemma 4 is reading your file…" : "Uploading…"}
                </>
              ) : allDone ? "Send to review queue" : "Submit for Review"}
            </button>
            <p style={{ fontSize: "0.78rem", color: "#334155" }}>
              {allDone ? "Edit the AI draft if needed, then send it to admin review" : "Files go to admin review before publishing"}
            </p>
          </div>
        </form>
      )}

      <style>{`
        @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulseDot { 0%, 100% { opacity: 0.35; } 50% { opacity: 1; } }
        select option { background: #070d1a; color: #f0f6ff; }
      `}</style>
    </section>
  );
}
