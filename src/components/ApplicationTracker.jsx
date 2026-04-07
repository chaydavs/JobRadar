import { RESUME_PROFILES } from "../config/resumeProfiles";

function ApplicationTracker({ applied, jobs, getJobKey, toggleApplied }) {
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

export default ApplicationTracker;
