import { useState, useEffect, useCallback } from "react";
import { RESUME_PROFILES, EDU_COLORS } from "./config/profiles.js";
import { parseJobs, scoreAllJobs } from "./lib/parser.js";
import { loadApplications, toggleApplication, pullFromSupabase } from "./lib/storage.js";
import { getCachedJobs, setCachedJobs, formatCacheTime } from "./lib/cache.js";
import { ErrorBoundary } from "./components/ErrorBoundary.jsx";
import { JobCard } from "./components/JobCard.jsx";
import { ApplicationDashboard } from "./components/ApplicationDashboard.jsx";

const GITHUB_URL = "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md";

function JobMatcher() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxAge, setMaxAge] = useState("3");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [minScore, setMinScore] = useState(15);
  const [eduFilter, setEduFilter] = useState("undergrad");
  const [hideNoSponsorship, setHideNoSponsorship] = useState(true);
  const [applications, setApplications] = useState(loadApplications);
  const [view, setView] = useState("jobs");
  const [lastFetch, setLastFetch] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);

  // On mount: try to pull from Supabase for cross-device sync
  useEffect(() => {
    pullFromSupabase().then(remote => {
      if (remote) setApplications(remote);
    });
  }, []);

  const fetchJobs = useCallback(async (forceRefresh = false) => {
    // Stale-while-revalidate: show cache immediately, refresh in background
    if (!forceRefresh) {
      const cached = getCachedJobs();
      if (cached) {
        setJobs(cached.jobs);
        setLoading(false);
        setLastFetch(formatCacheTime(cached.cachedAt));
        setCacheStatus(cached.fresh ? "fresh" : "stale");

        if (cached.fresh) return; // no need to refetch
        // Stale — show cached data but refresh in background
      }
    }

    setError(null);
    if (!getCachedJobs()) setLoading(true); // only show loader if no cache

    try {
      const res = await fetch(GITHUB_URL);
      if (!res.ok) throw new Error("Failed to fetch repo");
      const md = await res.text();
      const parsed = parseJobs(md);
      const scored = scoreAllJobs(parsed);

      setJobs(scored);
      setCachedJobs(scored);
      setLastFetch(new Date().toLocaleString());
      setCacheStatus("fresh");
    } catch (e) {
      if (jobs.length === 0) setError(e.message); // only show error if no cached data
    }
    setLoading(false);
  }, [jobs.length]);

  useEffect(() => { fetchJobs(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const getJobKey = (job) => `${job.company}::${job.role}`;

  const handleToggleApplied = (jobKey) => {
    setApplications(toggleApplication(applications, jobKey));
  };

  const ageToNum = (age) => {
    const m = age.match(/(\d+)/);
    return m ? parseInt(m[1]) : 999;
  };

  const filtered = jobs.filter(j => {
    if (maxAge !== "all" && ageToNum(j.age) > parseInt(maxAge)) return false;
    if (selectedProfile !== "all" && j.bestProfile !== selectedProfile) return false;
    if (j.score < minScore) return false;
    if (eduFilter !== "all" && j.eduLevel !== eduFilter) return false;
    if (hideNoSponsorship && (j.noSponsorship || j.usCitizenOnly)) return false;
    return true;
  });

  return (
    <div style={{
      "--card-bg": "#1a1a2e", "--border": "#2a2a4a",
      "--text-primary": "#e8e8f0", "--text-secondary": "#a0a0b8",
      "--muted": "#606078", "--accent": "#8B5CF6",
      "--score-bg": "#8B5CF622", "--score-text": "#8B5CF6",
      "--tag-bg": "#ffffff10", "--tag-text": "#a0a0b8",
      "--bg": "#0f0f1a", "--surface": "#161628",
      fontFamily: "'Space Grotesk', sans-serif",
      background: "var(--bg)", color: "var(--text-primary)",
      minHeight: "100vh", padding: "24px"
    }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "28px", fontWeight: 700, margin: 0, letterSpacing: "-0.5px" }}>Job Radar</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "14px", margin: "4px 0 0 0" }}>
            Pulls from Simplify GitHub repo &middot; Matched against your 3 resumes
            {lastFetch && (
              <span style={{ color: "var(--muted)", marginLeft: "8px" }}>
                Last pull: {lastFetch}
                {cacheStatus === "stale" && <span style={{ color: "#F59E0B", marginLeft: "4px" }}>(updating...)</span>}
              </span>
            )}
          </p>
        </div>

        {/* View Tabs */}
        <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", marginBottom: "20px", width: "fit-content" }}>
          {[["jobs", "Job Feed"], ["dashboard", "My Applications"]].map(([val, label]) => (
            <button key={val} onClick={() => setView(val)} style={{
              background: view === val ? "var(--accent)" : "transparent",
              color: view === val ? "#fff" : "var(--text-secondary)",
              border: "none", borderRadius: "6px", padding: "8px 20px",
              fontSize: "13px", fontWeight: 700, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace"
            }}>{label}{val === "dashboard" ? ` (${Object.keys(applications).length})` : ""}</button>
          ))}
        </div>

        {view === "dashboard" ? (
          <ApplicationDashboard
            applications={applications}
            jobs={jobs}
            getJobKey={getJobKey}
            onApplicationsChange={setApplications}
          />
        ) : (<>
          {/* Filters */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <FilterGroup values={["1", "2", "3", "7", "all"]} current={maxAge} onChange={setMaxAge}
              format={v => v === "all" ? "All" : v + "d"} />

            <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", flexWrap: "wrap", flexShrink: 0 }}>
              <FilterButton label="All" active={selectedProfile === "all"} color="#444" onClick={() => setSelectedProfile("all")} />
              {Object.entries(RESUME_PROFILES).map(([name, p]) => (
                <FilterButton key={name} label={name} active={selectedProfile === name} color={p.color} onClick={() => setSelectedProfile(name)} fontSize="11px" />
              ))}
            </div>

            <FilterGroup
              values={[["all", "All Levels"], ["undergrad", "Undergrad"], ["masters", "Master's"], ["phd", "PhD"]]}
              current={eduFilter}
              onChange={setEduFilter}
              colorMap={EDU_COLORS}
            />

            <button onClick={() => setHideNoSponsorship(!hideNoSponsorship)} style={{
              background: hideNoSponsorship ? "#EF444433" : "var(--surface)",
              color: hideNoSponsorship ? "#EF4444" : "var(--text-secondary)",
              border: `1px solid ${hideNoSponsorship ? "#EF444444" : "var(--border)"}`,
              borderRadius: "6px", padding: "6px 12px",
              fontSize: "11px", fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace", flexShrink: 0
            }}>{hideNoSponsorship ? "Showing: Sponsorship OK" : "Filter: Citizenship"}</button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>Min:</span>
              <input type="range" min="0" max="50" value={minScore} onChange={e => setMinScore(parseInt(e.target.value))}
                style={{ width: "80px", accentColor: "var(--accent)" }} />
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", fontFamily: "'JetBrains Mono', monospace", minWidth: "30px" }}>{minScore}pts</span>
            </div>

            <button onClick={() => fetchJobs(true)} style={{
              background: "var(--surface)", color: "var(--text-secondary)",
              border: "1px solid var(--border)", borderRadius: "6px",
              padding: "6px 14px", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", marginLeft: "auto"
            }}>&orarr; Refresh</button>
          </div>

          {/* Stats */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
            <StatCard value={filtered.length} label="matching roles" />
            <StatCard value={filtered.filter(j => j.score >= 30).length} label="strong matches (30+)" color="#10B981" />
            <StatCard value={filtered.filter(j => j.location.toLowerCase().includes("remote")).length} label="remote friendly" color="#F59E0B" />
            <StatCard value={filtered.filter(j => applications[getJobKey(j)]).length} label="applied" color="#8B5CF6" />
          </div>

          {/* Job List */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "16px", fontFamily: "'JetBrains Mono', monospace" }}>Pulling from GitHub...</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#EF4444" }}>
              <div style={{ fontSize: "14px" }}>{error}</div>
              <button onClick={() => fetchJobs(true)} style={{
                marginTop: "12px", background: "var(--accent)", color: "#fff",
                border: "none", borderRadius: "6px", padding: "8px 16px",
                cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
              }}>Retry</button>
            </div>
          ) : (
            <div>
              {filtered.map((job, i) => (
                <JobCard
                  key={`${job.company}-${job.role}-${i}`}
                  job={job}
                  isApplied={!!applications[getJobKey(job)]}
                  applicationStatus={applications[getJobKey(job)]?.status}
                  onToggleApplied={() => handleToggleApplied(getJobKey(job))}
                />
              ))}
              {filtered.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>
                  No matches with current filters. Try lowering the min score or expanding the age range.
                </div>
              )}
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}

// --- Small UI helpers ---

function FilterButton({ label, active, color, onClick, fontSize = "12px" }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color : "transparent",
      color: active ? "#fff" : "var(--text-secondary)",
      border: "none", borderRadius: "6px", padding: "6px 10px",
      fontSize, fontWeight: 600, cursor: "pointer",
      fontFamily: "'JetBrains Mono', monospace"
    }}>{label}</button>
  );
}

function FilterGroup({ values, current, onChange, format, colorMap }) {
  return (
    <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", flexShrink: 0 }}>
      {values.map(v => {
        const [val, label] = Array.isArray(v) ? v : [v, format ? format(v) : v];
        const color = colorMap?.[val] || "var(--accent)";
        return (
          <FilterButton key={val} label={label} active={current === val} color={color} onClick={() => onChange(val)} fontSize="11px" />
        );
      })}
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "12px 20px", flex: 1, minWidth: "120px"
    }}>
      <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color }}>{value}</div>
      <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>{label}</div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <JobMatcher />
    </ErrorBoundary>
  );
}
