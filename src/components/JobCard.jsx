import { useState } from "react";
import { RESUME_PROFILES, EDU_LABELS, EDU_COLORS } from "../config/profiles.js";
import { linkedinRecruiterSearch, draftMessage } from "../lib/outreach.js";

const mono = "'JetBrains Mono', monospace";

export function JobCard({ job, isApplied, applicationStatus, onToggleApplied }) {
  const profile = RESUME_PROFILES[job.bestProfile] ?? { color: "#8585A0" };
  const [showReach, setShowReach] = useState(false);

  const accentColor = applicationStatus === "offer"     ? "#059669"
    : applicationStatus === "interview" ? "#F5A500"
    : applicationStatus === "rejected"  ? "#FF3A54"
    : isApplied                         ? "#059669"
    : profile.color;

  const scoreColor = job.score >= 40 ? "#059669"
    : job.score >= 25 ? profile.color
    : "#8585A0";

  return (
    <div style={{
      background: "#FFFFFF",
      border: "1px solid #E6E6EF",
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: "12px",
      padding: "16px 20px",
      opacity: isApplied ? 0.65 : 1,
      transition: "border-color 0.15s, opacity 0.15s",
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#D2D2E0"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#E6E6EF"}
    >
      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>

        {/* ── Left: job info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Meta row */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
            <span style={{
              fontFamily: mono, fontSize: "10px", fontWeight: 700,
              background: profile.color + "20", color: profile.color,
              padding: "2px 8px", borderRadius: "4px", letterSpacing: "0.04em",
            }}>
              {job.bestProfile}
            </span>

            <span style={{
              fontFamily: mono, fontSize: "11px", fontWeight: 700,
              color: scoreColor,
            }}>
              {job.score}pts
            </span>

            <span style={{ fontFamily: mono, fontSize: "11px", color: "#9A9AB0" }}>
              {job.age}
            </span>

            <span style={{
              fontFamily: mono, fontSize: "10px", fontWeight: 600,
              background: (EDU_COLORS[job.eduLevel] ?? "#9A9AB0") + "20",
              color: EDU_COLORS[job.eduLevel] ?? "#8585A0",
              padding: "2px 7px", borderRadius: "4px",
            }}>
              {EDU_LABELS[job.eduLevel] ?? job.eduLevel}
            </span>

            {job.usCitizenOnly && <Flag label="US Citizen" />}
            {job.noSponsorship && <Flag label="No Sponsor" color="#F5A500" />}
          </div>

          {/* Role title */}
          <div style={{
            fontSize: "16px", fontWeight: 700,
            color: "#14142B", marginBottom: "3px",
            lineHeight: 1.3,
          }}>
            {job.role}
          </div>

          {/* Company · Location */}
          <div style={{ fontSize: "13px", color: "#55556E", marginBottom: "8px" }}>
            <span style={{ fontWeight: 600, color: "#2C2C46" }}>{job.company}</span>
            {job.location && <>
              <span style={{ margin: "0 6px", color: "#C8C8D6" }}>·</span>
              <span>{job.location}</span>
            </>}
          </div>

          {/* Keyword tags */}
          {job.matches.length > 0 && (
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {job.matches.slice(0, 6).map((m, i) => (
                <span key={i} style={{
                  fontFamily: mono, fontSize: "10px",
                  background: "#F1F1F6", color: "#9595AC",
                  padding: "2px 7px", borderRadius: "4px",
                  border: "1px solid #E6E6EF",
                }}>{m}</span>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: actions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0, alignItems: "stretch", minWidth: "100px" }}>
          {job.link ? (
            <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
              background: "#7B5CF0", color: "#fff",
              padding: "8px 16px", borderRadius: "8px",
              fontSize: "12px", fontWeight: 700,
              fontFamily: mono, textAlign: "center",
              display: "block", letterSpacing: "0.04em",
            }}>
              APPLY →
            </a>
          ) : (
            <div style={{ height: "34px" }} />
          )}

          <button onClick={onToggleApplied} style={{
            background: isApplied ? "rgba(0,212,138,0.12)" : "transparent",
            color: isApplied ? "#059669" : "#9A9AB0",
            border: `1px solid ${isApplied ? "rgba(0,212,138,0.3)" : "#E6E6EF"}`,
            borderRadius: "8px", padding: "7px 12px",
            fontSize: "11px", fontWeight: 600,
            cursor: "pointer", fontFamily: mono,
            textAlign: "center", whiteSpace: "nowrap",
          }}>
            {isApplied ? "Applied ✓" : "Mark Applied"}
          </button>

          <button onClick={() => setShowReach(!showReach)} style={{
            background: showReach ? "rgba(59,130,246,0.12)" : "transparent",
            color: showReach ? "#3B82F6" : "#9A9AB0",
            border: `1px solid ${showReach ? "rgba(59,130,246,0.3)" : "#E6E6EF"}`,
            borderRadius: "8px", padding: "7px 12px",
            fontSize: "11px", fontWeight: 600,
            cursor: "pointer", fontFamily: mono,
            textAlign: "center", whiteSpace: "nowrap",
          }}>
            ✉ Reach out
          </button>
        </div>

      </div>

      {showReach && <RecruiterPanel job={job} />}
    </div>
  );
}

function RecruiterPanel({ job }) {
  const [copied, setCopied] = useState(false);
  const link = job.recruiterSearch || linkedinRecruiterSearch(job.company);
  const msg = draftMessage(job.role, job.company, job.matches);

  const copy = () => {
    navigator.clipboard.writeText(msg).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div style={{
      marginTop: "14px", paddingTop: "14px",
      borderTop: "1px solid #E6E6EF",
      display: "flex", flexDirection: "column", gap: "10px",
    }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        <a href={link} target="_blank" rel="noopener noreferrer" style={{
          background: "#3B82F6", color: "#fff",
          padding: "6px 14px", borderRadius: "7px",
          fontSize: "11px", fontWeight: 700, fontFamily: mono,
          textDecoration: "none",
        }}>
          🔗 Find recruiter on LinkedIn
        </a>
        <span style={{ fontFamily: mono, fontSize: "10px", color: "#9A9AB0" }}>
          ATS doesn't expose contacts — search + DM
        </span>
      </div>

      <div style={{ position: "relative" }}>
        <textarea readOnly value={msg} rows={4} style={{
          width: "100%", background: "#F4F4F9",
          border: "1px solid #E6E6EF", borderRadius: "8px",
          color: "#2C2C46", fontSize: "12px", lineHeight: 1.5,
          padding: "10px 12px", fontFamily: mono, resize: "vertical",
        }} />
        <button onClick={copy} style={{
          position: "absolute", top: "8px", right: "8px",
          background: copied ? "rgba(0,212,138,0.15)" : "#E6E6EF",
          color: copied ? "#059669" : "#55556E",
          border: "none", borderRadius: "6px", padding: "4px 10px",
          fontSize: "10px", fontWeight: 600, cursor: "pointer", fontFamily: mono,
        }}>
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function Flag({ label, color = "#FF3A54" }) {
  return (
    <span style={{
      fontFamily: mono, fontSize: "10px", fontWeight: 600,
      background: color + "18", color: color,
      border: `1px solid ${color}30`,
      padding: "2px 7px", borderRadius: "4px",
    }}>{label}</span>
  );
}
