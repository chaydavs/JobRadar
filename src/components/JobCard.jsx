import { RESUME_PROFILES, EDU_LABELS, EDU_COLORS } from "../config/resumeProfiles";

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

export default JobCard;
