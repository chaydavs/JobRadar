import { useState, useEffect, useCallback } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import JobCard from "./components/JobCard";
import FilterBar from "./components/FilterBar";
import ApplicationTracker from "./components/ApplicationTracker";
import { RESUME_PROFILES, BONUS_KEYWORDS } from "./config/resumeProfiles";

function scoreJob(role, company, location, profile) {
  const text = `${role} ${company} ${location}`.toLowerCase();
  let score = 0;
  let matches = [];

  for (const kw of profile.keywords) {
    if (text.includes(kw.toLowerCase())) {
      score += 10;
      matches.push(kw);
    }
  }

  for (const kw of BONUS_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      score += 3;
    }
  }

  if (location.toLowerCase().includes("remote")) score += 8;
  if (role.toLowerCase().includes("intern")) score += 5;

  score *= profile.weight;
  return { score: Math.round(score), matches };
}

function parseJobs(markdown) {
  const dsStart = markdown.indexOf("## 🤖 Data Science, AI & Machine Learning");
  if (dsStart === -1) return [];

  const nextSection = markdown.indexOf("## 📈", dsStart + 1);
  const hwSection = markdown.indexOf("## 🔧", dsStart + 1);
  const otherSection = markdown.indexOf("## 🛠", dsStart + 1);
  const ends = [nextSection, hwSection, otherSection].filter(i => i > 0);
  const dsEnd = ends.length > 0 ? Math.min(...ends) : markdown.length;
  const dsContent = markdown.substring(dsStart, dsEnd);

  const rowRegex = /<tr>([\s\S]*?)<\/tr>/g;
  const jobs = [];
  let lastCompany = "";
  let match;

  while ((match = rowRegex.exec(dsContent)) !== null) {
    const row = match[1];
    if (row.includes("🔒")) continue;

    const tdRegex = /<td>([\s\S]*?)<\/td>/g;
    const tds = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(row)) !== null) {
      tds.push(tdMatch[1]);
    }
    if (tds.length < 5) continue;

    const companyMatch = tds[0].match(/<strong><a[^>]*>([^<]+)<\/a><\/strong>/);
    const company = companyMatch ? companyMatch[1].trim() : (tds[0].includes("↳") ? lastCompany : "");
    if (companyMatch) lastCompany = company;
    if (!company) continue;

    const role = tds[1].replace(/<[^>]+>/g, "").trim();
    const location = tds[2].replace(/<[^>]+>/g, "").trim();
    const age = tds[4].replace(/<[^>]+>/g, "").trim();

    const applyMatch = row.match(/href="(https:\/\/(?!simplify\.jobs|i\.imgur)[^"]+?)"/);
    const link = applyMatch ? applyMatch[1].split("?utm_source")[0] : "";

    const noSponsorship = row.includes("🛂");
    const usCitizenOnly = row.includes("🇺🇸");
    const advancedDegree = row.includes("🎓");

    const roleLower = role.toLowerCase();
    let eduLevel = "undergrad";
    if (advancedDegree || /\bph\.?d\b/.test(roleLower) || /\bdoctoral\b/.test(roleLower)) {
      eduLevel = "phd";
    } else if (/\bmaster'?s?\b/.test(roleLower) || /\bgraduate\b/.test(roleLower) || /\bm\.?s\.?\b/.test(roleLower)) {
      eduLevel = "masters";
    }

    const skipLocations = ["UK", "Canada", "France", "Germany", "Japan", "China", "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia"];
    if (skipLocations.some(loc => location.includes(loc))) continue;

    jobs.push({ company, role, location, link, age, noSponsorship, usCitizenOnly, advancedDegree, eduLevel });
  }

  return jobs;
}

function JobMatcher() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [maxAge, setMaxAge] = useState("3");
  const [selectedProfile, setSelectedProfile] = useState("all");
  const [minScore, setMinScore] = useState(15);
  const [eduFilter, setEduFilter] = useState("undergrad");
  const [hideNoSponsorship, setHideNoSponsorship] = useState(true);
  const [applied, setApplied] = useState(() => {
    try { return JSON.parse(localStorage.getItem("jobRadarApplied") || "{}"); }
    catch { return {}; }
  });
  const [view, setView] = useState("jobs");
  const [lastFetch, setLastFetch] = useState(null);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/README.md");
      if (!res.ok) throw new Error("Failed to fetch repo");
      const md = await res.text();
      const parsed = parseJobs(md);

      const scored = parsed.map(job => {
        let bestProfile = "";
        let bestScore = 0;
        let bestMatches = [];

        for (const [name, profile] of Object.entries(RESUME_PROFILES)) {
          const { score, matches } = scoreJob(job.role, job.company, job.location, profile);
          if (score > bestScore) {
            bestScore = score;
            bestProfile = name;
            bestMatches = matches;
          }
        }

        return { ...job, bestProfile, score: bestScore, matches: bestMatches };
      });

      scored.sort((a, b) => b.score - a.score);
      setJobs(scored);
      setLastFetch(new Date().toLocaleString());
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const toggleApplied = (jobKey) => {
    const updated = applied[jobKey]
      ? Object.fromEntries(Object.entries(applied).filter(([k]) => k !== jobKey))
      : { ...applied, [jobKey]: new Date().toISOString() };
    setApplied(updated);
    localStorage.setItem("jobRadarApplied", JSON.stringify(updated));
  };

  const getJobKey = (job) => `${job.company}::${job.role}`;

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
      "--card-bg": "#1a1a2e",
      "--border": "#2a2a4a",
      "--text-primary": "#e8e8f0",
      "--text-secondary": "#a0a0b8",
      "--muted": "#606078",
      "--accent": "#8B5CF6",
      "--score-bg": "#8B5CF622",
      "--score-text": "#8B5CF6",
      "--tag-bg": "#ffffff10",
      "--tag-text": "#a0a0b8",
      "--bg": "#0f0f1a",
      "--surface": "#161628",
      fontFamily: "'Space Grotesk', sans-serif",
      background: "var(--bg)",
      color: "var(--text-primary)",
      minHeight: "100vh",
      padding: "24px"
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <div style={{ marginBottom: "32px" }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: 700,
            margin: 0,
            letterSpacing: "-0.5px"
          }}>Job Radar</h1>
          <p style={{
            color: "var(--text-secondary)",
            fontSize: "14px",
            margin: "4px 0 0 0"
          }}>
            Pulls from Simplify GitHub repo · Matched against your 3 resumes
            {lastFetch && <span style={{ color: "var(--muted)", marginLeft: "8px" }}>Last pull: {lastFetch}</span>}
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
            }}>{label}{val === "dashboard" ? ` (${Object.keys(applied).length})` : ""}</button>
          ))}
        </div>

        {view === "dashboard" ? (
          <ApplicationTracker applied={applied} jobs={jobs} getJobKey={getJobKey} toggleApplied={toggleApplied} />
        ) : (<>

        {/* Controls */}
        <FilterBar
          maxAge={maxAge} setMaxAge={setMaxAge}
          selectedProfile={selectedProfile} setSelectedProfile={setSelectedProfile}
          eduFilter={eduFilter} setEduFilter={setEduFilter}
          hideNoSponsorship={hideNoSponsorship} setHideNoSponsorship={setHideNoSponsorship}
          minScore={minScore} setMinScore={setMinScore}
          fetchJobs={fetchJobs}
        />

        {/* Stats */}
        <div style={{
          display: "flex",
          gap: "16px",
          marginBottom: "20px",
          flexWrap: "wrap"
        }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 20px",
            flex: 1,
            minWidth: "120px"
          }}>
            <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>{filtered.length}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>matching roles</div>
          </div>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 20px",
            flex: 1,
            minWidth: "120px"
          }}>
            <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#10B981" }}>
              {filtered.filter(j => j.score >= 30).length}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>strong matches (30+)</div>
          </div>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 20px",
            flex: 1,
            minWidth: "120px"
          }}>
            <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#F59E0B" }}>
              {filtered.filter(j => j.location.toLowerCase().includes("remote")).length}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>remote friendly</div>
          </div>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px 20px",
            flex: 1,
            minWidth: "120px"
          }}>
            <div style={{ fontSize: "24px", fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: "#8B5CF6" }}>
              {filtered.filter(j => applied[getJobKey(j)]).length}
            </div>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace" }}>applied</div>
          </div>
        </div>

        {/* Job List */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)" }}>
            <div style={{ fontSize: "16px", fontFamily: "'JetBrains Mono', monospace" }}>Pulling from GitHub...</div>
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#EF4444" }}>
            <div style={{ fontSize: "14px" }}>{error}</div>
            <button onClick={fetchJobs} style={{
              marginTop: "12px", background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: "6px", padding: "8px 16px",
              cursor: "pointer", fontFamily: "'JetBrains Mono', monospace"
            }}>Retry</button>
          </div>
        ) : (
          <div>
            {filtered.map((job, i) => (
              <JobCard key={i} job={job} bestProfile={job.bestProfile} score={job.score} matches={job.matches}
                isApplied={!!applied[getJobKey(job)]}
                onToggleApplied={() => toggleApplied(getJobKey(job))} />
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

export default function App() {
  return (
    <ErrorBoundary>
      <JobMatcher />
    </ErrorBoundary>
  );
}
