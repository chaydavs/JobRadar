import { useState, useEffect, useCallback } from "react";
import { RESUME_PROFILES, EDU_COLORS } from "./config/profiles.js";
import { normalizeAtsJobs, scoreAllJobs } from "./lib/parser.js";
import { loadApplications, toggleApplication, pullFromSupabase } from "./lib/storage.js";
import { getCachedJobs, setCachedJobs, formatCacheTime } from "./lib/cache.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { JobCard } from "./components/JobCard.jsx";
import { ApplicationDashboard } from "./components/ApplicationDashboard.jsx";

const JOBS_API = "/api/jobs";

const PROFILE_SHORT = {
  "AI/ML Engineer":        "AI/ML",
  "SWE / Full-Stack":      "SWE",
  "Data Engineering":      "Data Eng",
  "BI & Operations":       "BI & Ops",
  "Data Science Research": "DS Research",
};

const mono = "'JetBrains Mono', monospace";
const sans = "'Space Grotesk', sans-serif";

function JobMatcher() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxAge, setMaxAge] = useState("1");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [minScore, setMinScore] = useState(15);
  const [eduFilter, setEduFilter] = useState("undergrad");
  const [hideNoSponsorship, setHideNoSponsorship] = useState(true);
  const [top10Only, setTop10Only] = useState(true);
  const [applications, setApplications] = useState(loadApplications);
  const [view, setView] = useState("jobs");
  const [lastFetch, setLastFetch] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);

  useEffect(() => {
    pullFromSupabase().then(remote => { if (remote) setApplications(remote); });
  }, []);

  const fetchJobs = useCallback(async (forceRefresh = false) => {
    if (!forceRefresh) {
      const cached = getCachedJobs();
      if (cached) {
        setJobs(cached.jobs);
        setLoading(false);
        setLastFetch(formatCacheTime(cached.cachedAt));
        setCacheStatus(cached.fresh ? "fresh" : "stale");
        if (cached.fresh) return;
      }
    }
    setError(null);
    if (!getCachedJobs()) setLoading(true);
    try {
      const res = await fetch(JOBS_API);
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const { jobs: raw } = await res.json();
      const scored = scoreAllJobs(normalizeAtsJobs(raw));
      setJobs(scored);
      setCachedJobs(scored);
      setLastFetch(new Date().toLocaleString());
      setCacheStatus("fresh");
    } catch (e) {
      if (jobs.length === 0) setError(e.message);
    }
    setLoading(false);
  }, [jobs.length]);

  useEffect(() => { fetchJobs(); }, []); // eslint-disable-line

  const getJobKey = (job) => `${job.company}::${job.role}`;
  const handleToggleApplied = (key) => setApplications(toggleApplication(applications, key));

  const matched = jobs.filter(j => {
    if (maxAge !== "all" && (j.ageDays ?? 9999) > parseInt(maxAge)) return false;
    if (selectedProfile !== "all" && j.bestProfile !== selectedProfile) return false;
    if (j.score < minScore) return false;
    if (eduFilter !== "all" && j.eduLevel !== eduFilter) return false;
    if (hideNoSponsorship && (j.noSponsorship || j.usCitizenOnly)) return false;
    return true;
  });

  // Curated mode: show only the 10 highest-scored matches
  const filtered = top10Only ? matched.slice(0, 10) : matched;

  const appliedCount = Object.keys(applications).length;

  return (
    <div style={{
      background: "#F4F4F9", color: "#14142B",
      minHeight: "100vh", fontFamily: sans,
    }}>
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Header ── */}
        <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "28px", flexWrap: "wrap" }}>
          <div>
            <h1 style={{
              fontFamily: "'Outfit', sans-serif",
              fontSize: "42px", fontWeight: 900,
              letterSpacing: "-2px", lineHeight: 1, margin: 0,
              color: "#14142B",
            }}>
              Job<span style={{ color: "#7B5CF0" }}>Radar</span>
            </h1>
            <div style={{ fontFamily: mono, fontSize: "11px", color: "#9A9AB0", marginTop: "8px", letterSpacing: "0.06em" }}>
              GREENHOUSE · ASHBY · INDEED · {Object.keys(RESUME_PROFILES).length} PROFILES
              {lastFetch && <span style={{ marginLeft: "14px" }}>↑ {lastFetch}{cacheStatus === "stale" && <span style={{ color: "#F5A500", marginLeft: "8px" }}>UPDATING…</span>}</span>}
            </div>
          </div>

          <nav style={{ display: "flex", gap: "2px", background: "#FFFFFF", border: "1px solid #E6E6EF", borderRadius: "10px", padding: "3px", alignSelf: "center" }}>
            {[["jobs", "Feed"], ["dashboard", `Applied${appliedCount > 0 ? ` (${appliedCount})` : ""}`]].map(([val, label]) => (
              <button key={val} onClick={() => setView(val)} style={{
                background: view === val ? "#7B5CF0" : "transparent",
                color: view === val ? "#fff" : "#8585A0",
                border: "none", borderRadius: "7px", padding: "8px 22px",
                fontSize: "13px", fontWeight: 600, cursor: "pointer",
                fontFamily: mono, transition: "all 0.15s",
              }}>{label}</button>
            ))}
          </nav>
        </header>

        {view === "dashboard" ? (
          <ApplicationDashboard
            applications={applications} jobs={jobs}
            getJobKey={getJobKey} onApplicationsChange={setApplications}
          />
        ) : (<>

          {/* ── Filter Panel ── */}
          <div style={{
            background: "#FFFFFF", border: "1px solid #E6E6EF",
            borderRadius: "14px", padding: "16px 20px",
            marginBottom: "20px", display: "flex", flexDirection: "column", gap: "12px",
          }}>

            {/* Row 1: Age + Refresh */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontFamily: mono, fontSize: "10px", color: "#9A9AB0", letterSpacing: "0.12em", minWidth: "54px" }}>AGE</span>
              <div style={{ display: "flex", gap: "3px" }}>
                {["1", "2", "3", "7", "all"].map(v => (
                  <Chip key={v} active={maxAge === v} onClick={() => setMaxAge(v)} color="#7B5CF0">
                    {v === "all" ? "All" : v + "d"}
                  </Chip>
                ))}
              </div>
              <div style={{ flex: 1 }} />
              <button onClick={() => setTop10Only(!top10Only)} style={{
                background: top10Only ? "#7B5CF0" : "transparent",
                color: top10Only ? "#fff" : "#8585A0",
                border: `1px solid ${top10Only ? "#7B5CF0" : "#E6E6EF"}`,
                borderRadius: "7px", padding: "5px 14px",
                fontSize: "12px", fontWeight: 700, cursor: "pointer",
                fontFamily: mono, whiteSpace: "nowrap",
              }}>
                ⭐ Top 10{top10Only ? "" : " off"}
              </button>
              <button onClick={() => fetchJobs(true)} style={{
                background: "transparent", color: "#9A9AB0",
                border: "1px solid #E6E6EF", borderRadius: "7px",
                padding: "5px 14px", fontSize: "12px", cursor: "pointer",
                fontFamily: mono, display: "flex", alignItems: "center", gap: "5px",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { e.target.style.borderColor = "#7B5CF0"; e.target.style.color = "#7B5CF0"; }}
                onMouseLeave={e => { e.target.style.borderColor = "#E6E6EF"; e.target.style.color = "#9A9AB0"; }}
              >↺ Refresh</button>
            </div>

            {/* Row 2: Profile */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: mono, fontSize: "10px", color: "#9A9AB0", letterSpacing: "0.12em", minWidth: "54px" }}>PROFILE</span>
              <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
                <Chip active={selectedProfile === "all"} onClick={() => setSelectedProfile("all")} color="#6B6B85">All</Chip>
                {Object.entries(RESUME_PROFILES).map(([name, p]) => (
                  <Chip key={name} active={selectedProfile === name} onClick={() => setSelectedProfile(name)} color={p.color}>
                    {PROFILE_SHORT[name] || name}
                  </Chip>
                ))}
              </div>
            </div>

            {/* Row 3: Level + Sponsorship + Score */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: mono, fontSize: "10px", color: "#9A9AB0", letterSpacing: "0.12em", minWidth: "54px" }}>LEVEL</span>
              <div style={{ display: "flex", gap: "3px" }}>
                {[["all", "All"], ["undergrad", "Undergrad"], ["masters", "Master's"], ["phd", "PhD"]].map(([val, label]) => (
                  <Chip key={val} active={eduFilter === val} onClick={() => setEduFilter(val)} color={EDU_COLORS[val] || "#6B6B85"}>
                    {label}
                  </Chip>
                ))}
              </div>

              <button onClick={() => setHideNoSponsorship(!hideNoSponsorship)} style={{
                background: hideNoSponsorship ? "rgba(255,58,84,0.12)" : "transparent",
                color: hideNoSponsorship ? "#FF3A54" : "#8585A0",
                border: `1px solid ${hideNoSponsorship ? "rgba(255,58,84,0.3)" : "#E6E6EF"}`,
                borderRadius: "7px", padding: "5px 12px",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
                fontFamily: mono, whiteSpace: "nowrap",
              }}>
                {hideNoSponsorship ? "✓ Sponsor OK" : "Citizenship filter"}
              </button>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
                <span style={{ fontSize: "11px", color: "#9A9AB0", fontFamily: mono }}>MIN</span>
                <input type="range" min="0" max="50" value={minScore}
                  onChange={e => setMinScore(parseInt(e.target.value))}
                  style={{ width: "90px", accentColor: "#7B5CF0", cursor: "pointer" }} />
                <span style={{ fontSize: "12px", color: "#55556E", fontFamily: mono, minWidth: "36px" }}>{minScore}pts</span>
              </div>
            </div>
          </div>

          {/* ── Stats ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#E6E6EF", borderRadius: "12px", overflow: "hidden", marginBottom: "20px" }}>
            {[
              { value: top10Only ? `${filtered.length}/${matched.length}` : matched.length, label: top10Only ? "Showing top" : "Matches", color: "#14142B" },
              { value: matched.filter(j => j.score >= 30).length, label: "Strong (30+)", color: "#059669" },
              { value: matched.filter(j => j.location.toLowerCase().includes("remote")).length, label: "Remote", color: "#F5A500" },
              { value: matched.filter(j => applications[getJobKey(j)]).length, label: "Applied", color: "#7B5CF0" },
            ].map(({ value, label, color }) => (
              <div key={label} style={{ background: "#FFFFFF", padding: "14px 18px" }}>
                <div style={{ fontSize: "28px", fontWeight: 700, fontFamily: mono, color, lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: "10px", color: "#9A9AB0", fontFamily: mono, marginTop: "4px", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* ── Job List ── */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "80px 0", color: "#9A9AB0", fontFamily: mono, fontSize: "13px", letterSpacing: "0.1em" }}>
              SCANNING GITHUB…
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ color: "#FF3A54", fontFamily: mono, fontSize: "13px", marginBottom: "16px" }}>{error}</div>
              <button onClick={() => fetchJobs(true)} style={{
                background: "#7B5CF0", color: "#fff", border: "none",
                borderRadius: "8px", padding: "10px 24px", cursor: "pointer", fontFamily: mono,
              }}>Retry</button>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9A9AB0", fontFamily: mono, fontSize: "12px" }}>
              No matches — try lowering min score or expanding age range.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {filtered.map((job, i) => (
                <JobCard
                  key={`${job.company}-${job.role}-${i}`}
                  job={job}
                  isApplied={!!applications[getJobKey(job)]}
                  applicationStatus={applications[getJobKey(job)]?.status}
                  onToggleApplied={() => handleToggleApplied(getJobKey(job))}
                />
              ))}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

function Chip({ active, onClick, color, children }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : "transparent",
      color: active ? "#fff" : "#8585A0",
      border: "none", borderRadius: "6px",
      padding: "5px 10px", fontSize: "12px",
      fontWeight: active ? 700 : 500,
      cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
      transition: "all 0.12s",
      whiteSpace: "nowrap",
    }}>{children}</button>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <JobMatcher />
    </ErrorBoundary>
  );
}
