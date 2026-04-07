import { RESUME_PROFILES, EDU_COLORS } from "../config/resumeProfiles";

function FilterBar({
  maxAge, setMaxAge,
  selectedProfile, setSelectedProfile,
  eduFilter, setEduFilter,
  hideNoSponsorship, setHideNoSponsorship,
  minScore, setMinScore,
  fetchJobs
}) {
  return (
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
  );
}

export default FilterBar;
