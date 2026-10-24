import { useState, useEffect, useRef, Fragment } from "react";
import Login, { SCIENTISTS } from "./pages/Login";
import Admin from "./pages/Admin";
import Gallery from "./pages/Gallery";
import { STATIONS, TYPE_ICONS, stationGalleryId, type Submission } from "./data";
import { usePublicGallery } from "./lib/usePublicGallery";

type User = typeof SCIENTISTS[0];
type View = "public" | "login" | "admin" | "gallery";

const GALLERY_HASH = "#/gallery";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Stations", href: "#stations" },
  { label: "Gallery", href: GALLERY_HASH },
  { label: "Impact", href: "#impact" },
];

const MODULES = [
  {
    num: "01",
    title: "Content Repository",
    desc: "Reports, datasets, publications, photos and videos — all tagged by station, year, and type in one searchable archive.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 5.625c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Public Outreach Portal",
    desc: "Searchable galleries, expedition timelines, and station profile pages built for citizens, students, and media.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Admin CMS",
    desc: "Secure upload and review workflow for scientists and public-information officers — with mandatory approval before anything goes live.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "AI Content Generator",
    desc: "Auto-drafts social captions, hashtags, and plain-language summaries from any expedition report using Claude AI.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
      </svg>
    ),
  },
  {
    num: "05",
    title: "Search & Discovery",
    desc: "Filter instantly by station, year, theme, or content type. Full-text search built for growing volumes from day one.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
];

const STATS = [
  { value: "4", label: "Research Stations", sub: "across 3 continents" },
  { value: "₹1,897Cr", label: "Annual Budget", sub: "NCPOR 2021–22" },
  { value: "35+", label: "Expeditions", sub: "to Antarctic alone" },
  { value: "0", label: "Public Portals", sub: "before PolarLink" },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeIn({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

const SESSION_KEY = "polarlink_demo_session";

export default function App() {
  const [activeStation, setActiveStation] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Lazy-init from sessionStorage so a page refresh mid-demo (e.g. during
  // a live judge walkthrough) doesn't silently drop the logged-in user
  // back to the public landing page. Cleared on tab close, unlike
  // localStorage, since this is demo auth, not a real persisted account.
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });
  const [view, setView] = useState<View>(() => {
    if (user) return "admin";
    return window.location.hash === GALLERY_HASH ? "gallery" : "public";
  });

  // The gallery is its own page, addressed by #/gallery so the browser back
  // button and shared links work. Other hashes (#about, #stations…) are
  // in-page anchors on the landing page and leave the gallery.
  useEffect(() => {
    const onHash = () => {
      setView((v) => {
        if (window.location.hash === GALLERY_HASH) return v === "public" ? "gallery" : v;
        return v === "gallery" ? "public" : v;
      });
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const goHome = (anchor?: string) => {
    setView("public");
    if (anchor) {
      window.location.hash = `#${anchor}`;
      setTimeout(() => document.getElementById(anchor)?.scrollIntoView(), 0);
    } else {
      history.pushState(null, "", window.location.pathname + window.location.search);
      window.scrollTo(0, 0);
    }
  };

  const login = (u: User) => {
    setUser(u);
    setView("admin");
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(u)); } catch { /* demo-only, safe to ignore */ }
  };

  const logout = () => {
    setUser(null);
    setView("public");
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* demo-only, safe to ignore */ }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { items: approvedGallery } = usePublicGallery();

  if (view === "login") {
    return (
      <Login
        onLogin={login}
        onBack={() => setView("public")}
      />
    );
  }

  if (view === "gallery") {
    return <Gallery onHome={goHome} onLogin={() => setView("login")} />;
  }

  if (view === "admin" && user) {
    return (
      <Admin
        user={user}
        onLogout={logout}
      />
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: "#04080f", color: "#f0f6ff", overflowX: "hidden" }}>

      {/* NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        padding: "0 2rem",
        background: scrolled ? "rgba(4,8,15,0.92)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(26,46,74,0.6)" : "none",
        transition: "all 0.3s ease",
        display: "flex", alignItems: "center", justifyContent: "space-between", height: "68px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #22d3ee, #0e7490 60%, #0a1220)",
            boxShadow: "0 0 16px #22d3ee44",
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.2rem", fontWeight: 600, letterSpacing: "-0.02em", color: "#f0f6ff" }}>
            PolarLink
          </span>
        </div>

        <div className="hidden md:flex" style={{ gap: "2.5rem", alignItems: "center" }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} style={{
              fontSize: "0.85rem", fontWeight: 500, color: "#94a3b8",
              textDecoration: "none", letterSpacing: "0.02em",
              transition: "color 0.2s",
            }}
              onMouseEnter={e => (e.currentTarget.style.color = "#f0f6ff")}
              onMouseLeave={e => (e.currentTarget.style.color = "#94a3b8")}
            >{l.label}</a>
          ))}
          <button
            onClick={() => setView("login")}
            style={{
              fontSize: "0.83rem", fontWeight: 600, padding: "8px 20px",
              border: "1px solid #22d3ee55", borderRadius: "4px",
              color: "#22d3ee", background: "transparent", cursor: "pointer",
              fontFamily: "'Inter', system-ui, sans-serif",
              transition: "all 0.2s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#22d3ee18"; e.currentTarget.style.borderColor = "#22d3ee"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#22d3ee55"; }}
          >
            Scientist Login
          </button>
        </div>

        <button
          className="flex md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ background: "none", border: "none", color: "#f0f6ff", cursor: "pointer", padding: 4 }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
            {menuOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />}
          </svg>
        </button>
      </nav>

      {menuOpen && (
        <div style={{
          position: "fixed", top: 68, left: 0, right: 0, zIndex: 49,
          background: "rgba(4,8,15,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1a2e4a",
          padding: "1.5rem 2rem 2rem",
          display: "flex", flexDirection: "column", gap: "1.25rem",
        }}>
          {NAV_LINKS.map(l => (
            <a key={l.label} href={l.href} onClick={() => setMenuOpen(false)} style={{
              fontSize: "1rem", fontWeight: 500, color: "#94a3b8", textDecoration: "none",
            }}>{l.label}</a>
          ))}
          <button
            onClick={() => { setMenuOpen(false); setView("login"); }}
            style={{
              textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0,
              fontSize: "1rem", fontWeight: 600, color: "#22d3ee",
              fontFamily: "'Inter', system-ui, sans-serif",
            }}
          >
            Scientist Login
          </button>
        </div>
      )}

      {/* HERO */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `url(https://images.unsplash.com/photo-1774776230803-69056b58f72a?w=1600&h=900&fit=crop&auto=format)`,
          backgroundSize: "cover", backgroundPosition: "center",
          filter: "brightness(0.25) saturate(1.2)",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(4,8,15,0.3) 0%, rgba(4,8,15,0.7) 60%, #04080f 100%)",
        }} />

        {/* Subtle grid overlay */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "linear-gradient(#22d3ee 1px, transparent 1px), linear-gradient(90deg, #22d3ee 1px, transparent 1px)",
          backgroundSize: "80px 80px",
        }} />

        {/* Glow orb */}
        <div style={{
          position: "absolute", top: "20%", left: "60%",
          width: 480, height: 480,
          background: "radial-gradient(circle, rgba(34,211,238,0.12) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "8rem 2rem 6rem" }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.12em", color: "#22d3ee",
              background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.2)",
              padding: "6px 14px", borderRadius: "3px", marginBottom: "2rem",
              textTransform: "uppercase",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22d3ee", display: "inline-block", animation: "pulse 2s infinite" }} />
              India's Polar Science, For Everyone
            </div>

            <h1 style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "clamp(2.8rem, 6vw, 5rem)",
              fontWeight: 300,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              color: "#f0f6ff",
              marginBottom: "1.5rem",
            }}>
              India's Polar Science,{" "}
              <em style={{ fontStyle: "italic", color: "#22d3ee" }}>For Everyone.</em>
            </h1>

            <p style={{
              fontSize: "1.1rem", lineHeight: 1.7, color: "#94a3b8",
              fontWeight: 300, maxWidth: 560, marginBottom: "2.5rem",
            }}>
              PolarLink transforms expedition reports from Maitri, Bharati, Himadri, and Himansh
              into public-ready content — automatically. One portal for India's entire polar science legacy.
            </p>

            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <a href="#stations" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: "0.9rem", fontWeight: 600, padding: "14px 28px",
                background: "#22d3ee", color: "#04080f", borderRadius: "4px",
                textDecoration: "none", letterSpacing: "0.01em",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.background = "#38bdf8"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "#22d3ee"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Explore Stations
                <svg viewBox="0 0 16 16" fill="currentColor" style={{ width: 14, height: 14 }}>
                  <path fillRule="evenodd" d="M6.22 3.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#about" style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                fontSize: "0.9rem", fontWeight: 500, padding: "14px 28px",
                border: "1px solid rgba(240,246,255,0.15)", color: "#f0f6ff",
                borderRadius: "4px", textDecoration: "none",
                transition: "all 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(240,246,255,0.35)"; e.currentTarget.style.background = "rgba(240,246,255,0.05)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(240,246,255,0.15)"; e.currentTarget.style.background = "transparent"; }}
              >
                Learn More
              </a>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{
          position: "absolute", bottom: "2.5rem", left: "50%", transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: 0.4,
        }}>
          <span style={{ fontSize: "0.65rem", letterSpacing: "0.12em", fontFamily: "'JetBrains Mono', monospace", color: "#94a3b8" }}>SCROLL</span>
          <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, #22d3ee, transparent)" }} />
        </div>
      </section>

      {/* ABOUT / PROBLEM */}
      <section id="about" style={{ padding: "8rem 2rem", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "5rem", alignItems: "center" }}>
          <FadeIn>
            <div>
              <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", color: "#22d3ee", marginBottom: "1.2rem", textTransform: "uppercase" }}>
                The Problem
              </p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: "1.5rem" }}>
                Vital science,{" "}
                <span style={{ fontStyle: "italic", color: "#64748b" }}>buried and invisible.</span>
              </h2>
              <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "#64748b", fontWeight: 300 }}>
                India actively runs four polar research stations. Expedition reports, datasets, publications,
                photos, and videos sit siloed across departments — hard to find, harder to share.
                Scientists are trained to do science, not write social captions and press blurbs.
                So outreach simply doesn't happen.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={150}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1px", border: "1px solid #1a2e4a", borderRadius: "8px", overflow: "hidden" }}>
              {[
                { label: "Annual NCPOR Budget", value: "₹1,898 Cr", note: "invested every year" },
                { label: "Citizens who engage with it", value: "≈ 0", note: "no public portal existed" },
                { label: "Time to publish outreach content", value: "Months", note: "if it happens at all" },
                { label: "Time with PolarLink", value: "Minutes", note: "AI-drafted, admin-approved" },
              ].map((row, i) => (
                <div key={i} style={{
                  padding: "1.25rem 1.5rem",
                  background: i % 2 === 0 ? "#0a1220" : "#0e1a2e",
                  display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem",
                }}>
                  <span style={{ fontSize: "0.85rem", color: "#64748b", fontWeight: 400 }}>{row.label}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 600, color: i >= 2 ? "#22d3ee" : "#f0f6ff", fontFamily: "'JetBrains Mono', monospace" }}>{row.value}</span>
                    <div style={{ fontSize: "0.72rem", color: "#475569", marginTop: 2 }}>{row.note}</div>
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* STATIONS */}
      <section id="stations" style={{ padding: "6rem 0", background: "#070d1a", borderTop: "1px solid #1a2e4a", borderBottom: "1px solid #1a2e4a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 2rem" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "4rem" }}>
              <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", color: "#22d3ee", marginBottom: "1rem", textTransform: "uppercase" }}>Research Stations</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, letterSpacing: "-0.025em" }}>
                Four stations. One portal.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "2.5rem", flexWrap: "wrap", justifyContent: "center" }}>
            {STATIONS.map((s, i) => (
              <button key={i} onClick={() => setActiveStation(i)} style={{
                padding: "8px 20px", borderRadius: "3px", cursor: "pointer",
                fontSize: "0.83rem", fontWeight: 500, letterSpacing: "0.01em",
                border: `1px solid ${activeStation === i ? s.color : "#1a2e4a"}`,
                background: activeStation === i ? `${s.color}15` : "transparent",
                color: activeStation === i ? s.color : "#64748b",
                transition: "all 0.2s",
              }}>
                {s.name}
              </button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem", alignItems: "center" }}>
            <div style={{ borderRadius: "6px", overflow: "hidden", aspectRatio: "16/9", background: "#0a1220" }}>
              <img
                src={STATIONS[activeStation].img}
                alt={`${STATIONS[activeStation].name} research station`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "opacity 0.3s" }}
              />
            </div>
            <div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <span style={{
                  fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.1em",
                  color: STATIONS[activeStation].color, background: `${STATIONS[activeStation].color}12`,
                  border: `1px solid ${STATIONS[activeStation].color}30`,
                  padding: "4px 10px", borderRadius: "3px",
                }}>
                  {STATIONS[activeStation].region}
                </span>
                <span style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", color: "#475569", padding: "4px 10px" }}>
                  {STATIONS[activeStation].lat} · {STATIONS[activeStation].lon}
                </span>
              </div>
              <h3 style={{
                fontFamily: "'Fraunces', serif", fontSize: "2.2rem", fontWeight: 400,
                letterSpacing: "-0.025em", marginBottom: "1rem",
              }}>
                {STATIONS[activeStation].name}
              </h3>
              <p style={{ fontSize: "1rem", lineHeight: 1.8, color: "#64748b", fontWeight: 300 }}>
                {STATIONS[activeStation].desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      


      {/* IMPACT */}
      <section id="impact" style={{ padding: "8rem 2rem", background: "#070d1a", borderTop: "1px solid #1a2e4a" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <div style={{ textAlign: "center", marginBottom: "5rem" }}>
              <p style={{ fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.12em", color: "#22d3ee", marginBottom: "1rem", textTransform: "uppercase" }}>Impact</p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 300, letterSpacing: "-0.025em" }}>
                Why this matters beyond the demo.
              </h2>
            </div>
          </FadeIn>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2rem", marginBottom: "5rem" }}>
            {STATS.map((s, i) => (
              <FadeIn key={i} delay={i * 80}>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    fontFamily: "'Fraunces', serif", fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                    fontWeight: 300, color: "#22d3ee", letterSpacing: "-0.03em", lineHeight: 1,
                    marginBottom: "0.5rem",
                  }}>{s.value}</div>
                  <div style={{ fontSize: "0.9rem", fontWeight: 600, marginBottom: "0.25rem" }}>{s.label}</div>
                  <div style={{ fontSize: "0.8rem", color: "#475569" }}>{s.sub}</div>
                </div>
              </FadeIn>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {[
              { icon: "🔬", title: "Permanent Archive", desc: "A searchable historical record of India's entire polar science legacy, built to grow indefinitely." },
              { icon: "🏛", title: "Museum-Ready Content", desc: "Directly supports NCPOR's upcoming Polar & Ocean Museum with digital content from day one." },
              { icon: "🎓", title: "STEM Inspiration", desc: "Brings polar research to classrooms across India, inspiring the next generation of polar scientists." },
              { icon: "📡", title: "Offline-First Design", desc: "Works at polar stations with limited satellite bandwidth — drafts locally, syncs automatically when connected." },
            ].map((item, i) => (
              <FadeIn key={i} delay={i * 60}>
                <div style={{
                  padding: "1.75rem",
                  border: "1px solid #1a2e4a", borderRadius: "6px",
                  background: "#0a1220",
                  transition: "border-color 0.2s, transform 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#22d3ee33"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a2e4a"; e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  <div style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>{item.icon}</div>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: 600, marginBottom: "0.5rem" }}>{item.title}</h3>
                  <p style={{ fontSize: "0.85rem", lineHeight: 1.7, color: "#64748b", fontWeight: 300 }}>{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>


      {/* FOOTER */}
      <footer style={{
        borderTop: "1px solid #1a2e4a",
        padding: "2.5rem 2rem",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: "1rem",
        maxWidth: 1200, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 24, height: 24, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #22d3ee, #0e7490 60%, #0a1220)",
          }} />
          <span style={{ fontFamily: "'Fraunces', serif", fontSize: "0.95rem", fontWeight: 600, color: "#f0f6ff" }}>PolarLink</span>
        </div>
        <p style={{ fontSize: "0.75rem", color: "#64748b" }}>
          ncpor.res.in · moes.gov.in
        </p>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @media (max-width: 768px) {
          .hidden { display: none !important; }
        }
        @media (min-width: 769px) {
          .flex { display: flex; }
        }
      `}</style>
    </div>
  );
}
