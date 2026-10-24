import { useEffect, useMemo, useState } from "react";
import { STATIONS, TYPE_ICONS, type Submission } from "../data";
import { usePublicGallery } from "../lib/usePublicGallery";

interface GalleryProps {
  /** Go back to the landing page, optionally scrolling to a section id. */
  onHome: (anchor?: string) => void;
  onLogin: () => void;
}

const MONO = "'JetBrains Mono', monospace";
const TYPES = ["Photo", "Video", "Report", "Dataset", "Publication"];

const NAV = [
  { label: "About", anchor: "about" },
  { label: "Stations", anchor: "stations" },
  { label: "Features", anchor: "features" },
  { label: "Impact", anchor: "impact" },
];

function stationColor(name: string): string {
  return STATIONS.find((s) => s.name === name)?.color ?? "#22d3ee";
}

function Thumb({ sub, height }: { sub: Submission; height: number | string }) {
  return sub.previewUrl ? (
    <img
      src={sub.previewUrl}
      alt={sub.title}
      loading="lazy"
      style={{ width: "100%", height, objectFit: "cover", display: "block" }}
    />
  ) : (
    <div style={{
      width: "100%", height, display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: "2.75rem", background: "#0e1a2e",
    }}>
      {TYPE_ICONS[sub.type] ?? "📄"}
    </div>
  );
}

function Chip({
  active, color = "#22d3ee", onClick, children,
}: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        padding: "7px 16px", borderRadius: 3, cursor: "pointer",
        fontSize: "0.8rem", fontWeight: 500, fontFamily: "'Inter', system-ui, sans-serif",
        border: `1px solid ${active ? color : "#1a2e4a"}`,
        background: active ? `${color}15` : "transparent",
        color: active ? color : "#64748b",
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

function Lightbox({
  items, index, onClose, onNav,
}: { items: Submission[]; index: number; onClose: () => void; onNav: (i: number) => void }) {
  const sub = items[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNav((index + 1) % items.length);
      if (e.key === "ArrowLeft") onNav((index - 1 + items.length) % items.length);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [index, items.length, onClose, onNav]);

  if (!sub) return null;
  const color = stationColor(sub.station);
  const navBtn = (side: "left" | "right"): React.CSSProperties => ({
    position: "absolute", top: "50%", [side]: 12, transform: "translateY(-50%)",
    width: 40, height: 40, borderRadius: "50%", cursor: "pointer",
    border: "1px solid #1a2e4a", background: "rgba(4,8,15,0.8)", color: "#f0f6ff",
    fontSize: "1.1rem", display: items.length > 1 ? "flex" : "none",
    alignItems: "center", justifyContent: "center",
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={sub.title}
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 100, background: "rgba(2,5,10,0.92)",
        backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
        justifyContent: "center", padding: "1.5rem", overflowY: "auto",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 1000, maxHeight: "100%",
          background: "#0a1220", border: "1px solid #1a2e4a", borderRadius: 8,
          overflow: "hidden", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <div style={{ position: "relative", background: "#050a14", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {sub.previewUrl ? (
            <img src={sub.previewUrl} alt={sub.title} style={{ width: "100%", height: "100%", maxHeight: "80vh", objectFit: "contain", display: "block" }} />
          ) : (
            <span style={{ fontSize: "4rem" }}>{TYPE_ICONS[sub.type] ?? "📄"}</span>
          )}
          <button aria-label="Previous item" onClick={() => onNav((index - 1 + items.length) % items.length)} style={navBtn("left")}>‹</button>
          <button aria-label="Next item" onClick={() => onNav((index + 1) % items.length)} style={navBtn("right")}>›</button>
        </div>

        <div style={{ padding: "1.75rem", overflowY: "auto", maxHeight: "80vh" }}>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              position: "absolute", top: 10, right: 10, width: 32, height: 32, borderRadius: "50%",
              border: "1px solid #1a2e4a", background: "rgba(4,8,15,0.8)", color: "#94a3b8",
              cursor: "pointer", fontSize: "1rem", zIndex: 2,
            }}
          >✕</button>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: "0.9rem" }}>
            <span style={{
              fontSize: "0.65rem", fontFamily: MONO, padding: "2px 8px", borderRadius: 2,
              background: `${color}14`, border: `1px solid ${color}40`, color,
            }}>{sub.station}</span>
            <span style={{ fontSize: "0.72rem", color: "#475569", fontFamily: MONO }}>{sub.type} · {sub.year}</span>
          </div>

          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.6rem", fontWeight: 400, letterSpacing: "-0.02em", lineHeight: 1.25, marginBottom: "1rem", paddingRight: 28 }}>
            {sub.title}
          </h2>

          <p style={{ fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.75, fontWeight: 300, marginBottom: "1.25rem" }}>
            {sub.aiSummary}
          </p>

          {sub.tags.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: "1.25rem" }}>
              {sub.tags.map((t) => (
                <span key={t} style={{ fontSize: "0.68rem", fontFamily: MONO, color: "#64748b", border: "1px solid #1a2e4a", padding: "2px 8px", borderRadius: 2 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}

          <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 16px", fontSize: "0.75rem", fontFamily: MONO, color: "#64748b", margin: 0 }}>
            <dt>Author</dt><dd style={{ margin: 0, color: "#cbd5e1" }}>{sub.author}</dd>
            <dt>Uploaded</dt><dd style={{ margin: 0, color: "#cbd5e1" }}>{sub.uploadedAt}</dd>
            <dt>File</dt><dd style={{ margin: 0, color: "#cbd5e1" }}>{sub.fileExt} · {sub.fileSize}</dd>
            <dt>Ref</dt><dd style={{ margin: 0, color: "#cbd5e1" }}>{sub.id}</dd>
          </dl>

          <p style={{ fontSize: "0.7rem", fontFamily: MONO, color: "#334155", marginTop: "1.5rem" }}>
            {index + 1} / {items.length} · ← → to browse · Esc to close
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Gallery({ onHome, onLogin }: GalleryProps) {
  const { items, loaded } = usePublicGallery();
  const [station, setStation] = useState<string>("All");
  const [type, setType] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = items.filter((s) =>
      (station === "All" || s.station === station) &&
      (type === "All" || s.type === type) &&
      (!q || `${s.title} ${s.author} ${s.station} ${s.tags.join(" ")}`.toLowerCase().includes(q)),
    );
    list.sort((a, b) => (sort === "newest" ? b.uploadedAt.localeCompare(a.uploadedAt) : a.uploadedAt.localeCompare(b.uploadedAt)));
    return list;
  }, [items, station, type, query, sort]);

  const openIndex = openId ? filtered.findIndex((s) => s.id === openId) : -1;

  const stationCounts = useMemo(() => {
    const m: Record<string, number> = {};
    items.forEach((s) => { m[s.station] = (m[s.station] ?? 0) + 1; });
    return m;
  }, [items]);

  const hasFilters = station !== "All" || type !== "All" || query.trim() !== "";

  return (
    <div style={{ minHeight: "100%", background: "#04080f", color: "#f0f6ff", fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column" }}>

      {/* NAV */}
      <nav style={{
        position: "sticky", top: 0, zIndex: 50, height: 68, padding: "0 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "rgba(4,8,15,0.92)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(26,46,74,0.6)",
      }}>
        <button
          onClick={() => onHome()}
          aria-label="PolarLink home"
          style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #22d3ee, #0e7490 60%, #0a1220)",
            boxShadow: "0 0 16px #22d3ee44", flexShrink: 0,
          }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.02em" }}>PolarLink</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div className="gallery-nav-links" style={{ display: "flex", gap: "2rem" }}>
            {NAV.map((l) => (
              <button
                key={l.label}
                onClick={() => onHome(l.anchor)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.85rem", fontWeight: 500, color: "#94a3b8", fontFamily: "inherit" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#f0f6ff")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
              >{l.label}</button>
            ))}
            <span aria-current="page" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#22d3ee" }}>Gallery</span>
          </div>
          <button
            onClick={onLogin}
            style={{
              fontSize: "0.83rem", fontWeight: 600, padding: "8px 20px", border: "1px solid #22d3ee55",
              borderRadius: 4, color: "#22d3ee", background: "transparent", cursor: "pointer", fontFamily: "inherit",
            }}
          >Scientist Login</button>
        </div>
      </nav>

      <main style={{ flex: 1, width: "100%", maxWidth: 1200, margin: "0 auto", padding: "3.5rem 2rem 6rem" }}>
        <button
          onClick={() => onHome()}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "0.8rem", fontFamily: MONO, padding: 0, marginBottom: "2rem" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#22d3ee")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >← Back to home</button>

        {/* HEADER */}
        <header style={{ marginBottom: "2.5rem", maxWidth: 680 }}>
          <p style={{ fontSize: "0.72rem", fontFamily: MONO, letterSpacing: "0.12em", color: "#22d3ee", marginBottom: "1rem", textTransform: "uppercase" }}>
            From the Stations
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2.2rem, 5vw, 3.4rem)", fontWeight: 300, letterSpacing: "-0.03em", lineHeight: 1.1, marginBottom: "1rem" }}>
            The PolarLink Gallery
          </h1>
          <p style={{ fontSize: "0.98rem", color: "#64748b", lineHeight: 1.75, fontWeight: 300 }}>
            Photos, reports and datasets from India's four polar research stations. Every item here was
            uploaded by a scientist and passed admin review before going public.
          </p>
        </header>

        {/* FILTERS */}
        <section aria-label="Filters" style={{ marginBottom: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Chip active={station === "All"} onClick={() => setStation("All")}>All stations ({items.length})</Chip>
            {STATIONS.map((s) => (
              <Chip key={s.name} active={station === s.name} color={s.color} onClick={() => setStation(s.name)}>
                {s.name} ({stationCounts[s.name] ?? 0})
              </Chip>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Chip active={type === "All"} onClick={() => setType("All")}>All types</Chip>
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>{TYPE_ICONS[t]} {t}</Chip>
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, author, tag…"
              aria-label="Search gallery"
              style={{
                flex: "1 1 260px", maxWidth: 420, padding: "9px 14px", fontSize: "0.85rem",
                background: "#0a1220", border: "1px solid #1a2e4a", borderRadius: 4, color: "#f0f6ff", fontFamily: "inherit",
              }}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
              aria-label="Sort order"
              style={{ padding: "9px 14px", fontSize: "0.85rem", background: "#0a1220", border: "1px solid #1a2e4a", borderRadius: 4, color: "#f0f6ff", fontFamily: "inherit" }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            {hasFilters && (
              <button
                onClick={() => { setStation("All"); setType("All"); setQuery(""); }}
                style={{ padding: "9px 14px", fontSize: "0.8rem", background: "transparent", border: "none", color: "#22d3ee", cursor: "pointer", fontFamily: "inherit" }}
              >Clear filters</button>
            )}
          </div>

          <p aria-live="polite" style={{ fontSize: "0.72rem", fontFamily: MONO, color: "#475569" }}>
            {loaded ? `${filtered.length} ${filtered.length === 1 ? "item" : "items"}` : "Loading…"}
          </p>
        </section>

        {/* GRID / EMPTY STATES */}
        {loaded && items.length === 0 ? (
          <div style={{ border: "1px dashed #1a2e4a", borderRadius: 8, padding: "4rem 2rem", textAlign: "center" }}>
            <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🧊</p>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", marginBottom: "0.5rem" }}>Nothing published yet</p>
            <p style={{ fontSize: "0.88rem", color: "#64748b" }}>Approved submissions from the stations will appear here.</p>
          </div>
        ) : loaded && filtered.length === 0 ? (
          <div style={{ border: "1px dashed #1a2e4a", borderRadius: 8, padding: "4rem 2rem", textAlign: "center" }}>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: "1.3rem", marginBottom: "0.5rem" }}>No matches</p>
            <p style={{ fontSize: "0.88rem", color: "#64748b" }}>Try a different station, type or search term.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {filtered.map((sub) => {
              const color = stationColor(sub.station);
              return (
                <button
                  key={sub.id}
                  onClick={() => setOpenId(sub.id)}
                  className="gallery-card"
                  style={{
                    textAlign: "left", padding: 0, cursor: "pointer", color: "inherit", fontFamily: "inherit",
                    border: "1px solid #1a2e4a", borderRadius: 8, background: "#0a1220", overflow: "hidden",
                    display: "flex", flexDirection: "column", transition: "border-color 0.2s, transform 0.2s",
                  }}
                >
                  <Thumb sub={sub} height={200} />
                  <div style={{ padding: "1.25rem", flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: "0.6rem", flexWrap: "wrap" }}>
                      <span style={{
                        fontSize: "0.65rem", fontFamily: MONO, padding: "2px 8px", borderRadius: 2,
                        background: `${color}14`, border: `1px solid ${color}40`, color,
                      }}>{sub.station}</span>
                      <span style={{ fontSize: "0.72rem", color: "#475569", fontFamily: MONO }}>{sub.type} · {sub.year}</span>
                    </div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.5rem", lineHeight: 1.4 }}>{sub.title}</h3>
                    <p style={{ fontSize: "0.85rem", color: "#64748b", lineHeight: 1.7 }}>
                      {sub.aiSummary.length > 140 ? sub.aiSummary.slice(0, 140).trimEnd() + "…" : sub.aiSummary}
                    </p>
                    <p style={{ fontSize: "0.7rem", color: "#334155", marginTop: "0.75rem", fontFamily: MONO }}>
                      {sub.author} · {sub.uploadedAt}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer style={{ borderTop: "1px solid #1a2e4a", padding: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: "0.75rem", color: "#64748b" }}>ncpor.res.in · moes.gov.in</p>
      </footer>

      {openIndex >= 0 && (
        <Lightbox
          items={filtered}
          index={openIndex}
          onClose={() => setOpenId(null)}
          onNav={(i) => setOpenId(filtered[i].id)}
        />
      )}

      <style>{`
        .gallery-card:hover { border-color: #22d3ee66 !important; transform: translateY(-2px); }
        @media (max-width: 768px) { .gallery-nav-links { display: none !important; } }
      `}</style>
    </div>
  );
}
