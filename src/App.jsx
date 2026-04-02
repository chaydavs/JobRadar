import { useState, useEffect, useCallback, Component } from "react";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          background: "#0f0f1a", color: "#e8e8f0", minHeight: "100vh",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "16px", padding: "24px", textAlign: "center",
          fontFamily: "'Space Grotesk', sans-serif"
        }}>
          <div style={{ fontSize: "48px" }}>X</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700 }}>Something broke</h2>
          <p style={{ color: "#a0a0b8", fontSize: "14px", maxWidth: "400px" }}>
            The job data format may have changed. Try refreshing.
          </p>
          <button onClick={() => window.location.reload()} style={{
            background: "#8B5CF6", color: "#fff", border: "none", borderRadius: "8px",
            padding: "10px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer"
          }}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const RESUME_PROFILES = {
  "AI/ML Engineer": {
    color: "#8B5CF6",
    keywords: [
      "machine learning", "ml", "ai", "artificial intelligence", "deep learning",
      "neural network", "nlp", "natural language", "tensorflow", "pytorch",
      "scikit-learn", "computer vision", "llm", "large language model",
      "reinforcement learning", "generative ai", "agentic", "claude",
      "openai", "model", "inference", "training", "fine-tune", "prompt",
      "python", "classification", "regression", "transformer", "embedding",
      "spacy", "hugging face", "research", "perception", "robotics",
      "autonomous", "agent", "rl", "gpt", "diffusion", "vision"
    ],
    weight: 1.0
  },
  "BI & Operations": {
    color: "#F59E0B",
    keywords: [
      "data analyst", "analytics", "business intelligence", "power bi",
      "tableau", "sql", "dashboard", "reporting", "crm", "salesforce",
      "operations", "etl", "pipeline", "data engineer", "database",
      "postgresql", "data warehouse", "bi", "excel", "visualization",
      "metrics", "kpi", "stakeholder", "admissions", "recruitment",
      "process", "automation", "n8n", "make", "workflow", "integration",
      "api", "webhook", "supabase", "data governance", "quality"
    ],
    weight: 0.9
  },
  "Data Science Research": {
    color: "#10B981",
    keywords: [
      "data science", "data scientist", "research", "statistical",
      "statistics", "hypothesis", "monte carlo", "optimization",
      "regression", "r", "matlab", "scipy", "numpy", "pandas",
      "geospatial", "satellite", "computational", "modeling",
      "simulation", "numerical", "analysis", "quantitative",
      "experiment", "inference", "bayesian", "probability",
      "feature engineering", "prediction", "forecasting", "time series",
      "bioinformatics", "genomics", "scientific", "publication"
    ],
    weight: 0.95
  }
};

const BONUS_KEYWORDS = [
  "remote", "python", "aws", "docker", "flask", "api",
  "supabase", "postgresql", "startup", "no sponsorship required"
];


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

    // Extract requirement tags from the row
    const noSponsorship = row.includes("🛂");
    const usCitizenOnly = row.includes("🇺🇸");
    const advancedDegree = row.includes("🎓");

    // Detect education level from role title
    const roleLower = role.toLowerCase();
    let eduLevel = "undergrad";
    if (advancedDegree || /\bph\.?d\b/.test(roleLower) || /\bdoctoral\b/.test(roleLower)) {
      eduLevel = "phd";
    } else if (/\bmaster'?s?\b/.test(roleLower) || /\bgraduate\b/.test(roleLower) || /\bm\.?s\.?\b/.test(roleLower)) {
      eduLevel = "masters";
    }

    // Filter: US only, skip UK/Canada/etc
    const skipLocations = ["UK", "Canada", "France", "Germany", "Japan", "China", "India", "Brazil", "Netherlands", "Ireland", "Singapore", "Australia"];
    if (skipLocations.some(loc => location.includes(loc))) continue;

    jobs.push({ company, role, location, link, age, noSponsorship, usCitizenOnly, advancedDegree, eduLevel });
  }

  return jobs;
}

const EDU_LABELS = { undergrad: "Undergrad", masters: "Master's", phd: "PhD" };
const EDU_COLORS = { undergrad: "#10B981", masters: "#3B82F6", phd: "#A855F7" };

function RequirementBadge({ label, color, warn }) {
  return (
    <span style={{
      fontSize: "10px",
      fontFamily: "'JetBrains Mono', monospace",
      background: color + "22",
      color: color,
      padding: "2px 7px",
      borderRadius: "4px",
      fontWeight: 600,
      border: warn ? `1px solid ${color}44` : "none"
    }}>{label}</span>
  );
}

function JobCard({ job, bestProfile, score, matches, isApplied, onToggleApplied }) {
  const profile = RESUME_PROFILES[bestProfile];

  return (
    <div style={{
      background: "var(--card-bg)",
      border: "1px solid var(--border)",
      borderLeft: `4px solid ${isApplied ? "#10B981" : profile.color}`,
      borderRadius: "8px",
      padding: "16px 20px",
      marginBottom: "10px",
      transition: "all 0.2s ease",
      opacity: isApplied ? 0.6 : 1
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              background: profile.color + "22",
              color: profile.color,
              padding: "2px 8px",
              borderRadius: "4px",
              fontWeight: 600
            }}>{bestProfile}</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              background: "var(--score-bg)",
              color: "var(--score-text)",
              padding: "2px 8px",
              borderRadius: "4px",
              fontWeight: 700
            }}>{score}pts</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: "11px",
              color: "var(--muted)",
            }}>{job.age} ago</span>
            <RequirementBadge label={EDU_LABELS[job.eduLevel]} color={EDU_COLORS[job.eduLevel]} />
            {job.usCitizenOnly && <RequirementBadge label="US Citizen Only" color="#EF4444" warn />}
            {job.noSponsorship && <RequirementBadge label="No Sponsorship" color="#F59E0B" warn />}
            {job.advancedDegree && job.eduLevel === "undergrad" && <RequirementBadge label="Adv. Degree" color="#A855F7" warn />}
          </div>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "2px"
          }}>{job.role}</div>
          <div style={{
            fontSize: "14px",
            color: "var(--text-secondary)",
            marginBottom: "6px"
          }}>
            <span style={{ fontWeight: 600 }}>{job.company}</span>
            <span style={{ margin: "0 6px", color: "var(--muted)" }}>·</span>
            <span>{job.location}</span>
          </div>
          {matches.length > 0 && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {matches.slice(0, 6).map((m, i) => (
                <span key={i} style={{
                  fontSize: "10px",
                  background: "var(--tag-bg)",
                  color: "var(--tag-text)",
                  padding: "1px 6px",
                  borderRadius: "3px",
                  fontFamily: "'JetBrains Mono', monospace"
                }}>{m}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
          {job.link && (
            <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
              background: "var(--accent)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              whiteSpace: "nowrap",
              fontFamily: "'JetBrains Mono', monospace",
              textAlign: "center"
            }}>APPLY →</a>
          )}
          <button onClick={onToggleApplied} style={{
            background: isApplied ? "#10B98133" : "var(--surface)",
            color: isApplied ? "#10B981" : "var(--muted)",
            border: `1px solid ${isApplied ? "#10B98144" : "var(--border)"}`,
            borderRadius: "6px",
            padding: "4px 12px",
            fontSize: "11px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            whiteSpace: "nowrap"
          }}>{isApplied ? "Applied ✓" : "Mark Applied"}</button>
        </div>
      </div>
    </div>
  );
}

function ApplicationDashboard({ applied, jobs, getJobKey, toggleApplied }) {
  const appliedEntries = Object.entries(applied)
    .map(([key, timestamp]) => {
      const job = jobs.find(j => getJobKey(j) === key);
      return { key, timestamp, job };
    })
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const totalApplied = appliedEntries.length;
  const thisWeek = appliedEntries.filter(e => {
    const d = new Date(e.timestamp);
    const now = new Date();
    return (now - d) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const byProfile = {};
  for (const entry of appliedEntries) {
    if (entry.job) {
      byProfile[entry.job.bestProfile] = (byProfile[entry.job.bestProfile] || 0) + 1;
    }
  }

  const mono = "'JetBrains Mono', monospace";
  const cardStyle = {
    background: "#161628",
    border: "1px solid #2a2a4a",
    borderRadius: "8px",
    padding: "16px 20px",
  };

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ ...cardStyle, flex: 1, minWidth: "140px" }}>
          <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: mono, color: "#8B5CF6" }}>{totalApplied}</div>
          <div style={{ fontSize: "12px", color: "#a0a0b8", fontFamily: mono }}>total applied</div>
        </div>
        <div style={{ ...cardStyle, flex: 1, minWidth: "140px" }}>
          <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: mono, color: "#10B981" }}>{thisWeek}</div>
          <div style={{ fontSize: "12px", color: "#a0a0b8", fontFamily: mono }}>this week</div>
        </div>
        <div style={{ ...cardStyle, flex: 1, minWidth: "140px" }}>
          <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: mono, color: "#F59E0B" }}>{Object.keys(byProfile).length}</div>
          <div style={{ fontSize: "12px", color: "#a0a0b8", fontFamily: mono }}>categories</div>
        </div>
      </div>

      {/* Breakdown by Profile */}
      {Object.keys(byProfile).length > 0 && (
        <div style={{ ...cardStyle, marginBottom: "24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", fontFamily: mono }}>By Category</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(byProfile).map(([profile, count]) => (
              <div key={profile} style={{
                background: (RESUME_PROFILES[profile]?.color || "#888") + "22",
                color: RESUME_PROFILES[profile]?.color || "#888",
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: mono
              }}>{profile}: {count}</div>
            ))}
          </div>
        </div>
      )}

      {/* Application History */}
      <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", fontFamily: mono }}>Application History</div>
      {appliedEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#606078", fontFamily: mono }}>
          No applications yet. Mark jobs as applied from the Job Feed.
        </div>
      ) : (
        appliedEntries.map(({ key, timestamp, job }) => (
          <div key={key} style={{
            ...cardStyle,
            marginBottom: "8px",
            borderLeft: `4px solid ${job ? (RESUME_PROFILES[job.bestProfile]?.color || "#888") : "#444"}`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "2px" }}>
                {job ? job.role : key.split("::")[1]}
              </div>
              <div style={{ fontSize: "13px", color: "#a0a0b8" }}>
                <span style={{ fontWeight: 600 }}>{job ? job.company : key.split("::")[0]}</span>
                {job && <><span style={{ margin: "0 6px", color: "#606078" }}>·</span><span>{job.location}</span></>}
              </div>
              <div style={{ fontSize: "11px", color: "#606078", fontFamily: mono, marginTop: "4px" }}>
                Applied {new Date(timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                {job && <span style={{ marginLeft: "8px", color: RESUME_PROFILES[job.bestProfile]?.color }}>{job.bestProfile}</span>}
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
              {job?.link && (
                <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
                  background: "#8B5CF6", color: "#fff", padding: "6px 12px",
                  borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                  textDecoration: "none", fontFamily: mono
                }}>VIEW</a>
              )}
              <button onClick={() => toggleApplied(key)} style={{
                background: "#EF444422", color: "#EF4444",
                border: "1px solid #EF444444", borderRadius: "6px",
                padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                cursor: "pointer", fontFamily: mono
              }}>Remove</button>
            </div>
          </div>
        ))
      )}
    </div>
  );
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
          <ApplicationDashboard applied={applied} jobs={jobs} getJobKey={getJobKey} toggleApplied={toggleApplied} />
        ) : (<>

        {/* Controls */}
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center"
        }}>
          <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", flexShrink: 0 }}>
            {["1", "2", "3", "7", "all"].map(v => (
              <button key={v} onClick={() => setMaxAge(v)} style={{
                background: maxAge === v ? "var(--accent)" : "transparent",
                color: maxAge === v ? "#fff" : "var(--text-secondary)",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace"
              }}>{v === "all" ? "All" : v + "d"}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", flexWrap: "wrap", flexShrink: 0 }}>
            <button onClick={() => setSelectedProfile("all")} style={{
              background: selectedProfile === "all" ? "#444" : "transparent",
              color: selectedProfile === "all" ? "#fff" : "var(--text-secondary)",
              border: "none", borderRadius: "6px", padding: "6px 10px",
              fontSize: "12px", fontWeight: 600, cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace"
            }}>All</button>
            {Object.entries(RESUME_PROFILES).map(([name, p]) => (
              <button key={name} onClick={() => setSelectedProfile(name)} style={{
                background: selectedProfile === name ? p.color : "transparent",
                color: selectedProfile === name ? "#fff" : "var(--text-secondary)",
                border: "none", borderRadius: "6px", padding: "6px 10px",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace"
              }}>{name}</button>
            ))}
          </div>

          <div style={{ display: "flex", gap: "4px", background: "var(--surface)", borderRadius: "8px", padding: "3px", flexShrink: 0 }}>
            {[["all", "All Levels"], ["undergrad", "Undergrad"], ["masters", "Master's"], ["phd", "PhD"]].map(([val, label]) => (
              <button key={val} onClick={() => setEduFilter(val)} style={{
                background: eduFilter === val ? EDU_COLORS[val] || "#444" : "transparent",
                color: eduFilter === val ? "#fff" : "var(--text-secondary)",
                border: "none", borderRadius: "6px", padding: "6px 10px",
                fontSize: "11px", fontWeight: 600, cursor: "pointer",
                fontFamily: "'JetBrains Mono', monospace"
              }}>{label}</button>
            ))}
          </div>

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

          <button onClick={fetchJobs} style={{
            background: "var(--surface)",
            color: "var(--text-secondary)",
            border: "1px solid var(--border)",
            borderRadius: "6px",
            padding: "6px 14px",
            fontSize: "12px",
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "'JetBrains Mono', monospace",
            marginLeft: "auto"
          }}>↻ Refresh</button>
        </div>

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
