import { useState } from "react";
import { RESUME_PROFILES, APPLICATION_STATUSES } from "../config/profiles.js";
import { updateApplicationStatus, updateApplicationNotes, removeApplication } from "../lib/storage.js";
import { exportApplicationsCSV } from "../lib/export.js";

const mono = "'JetBrains Mono', monospace";
const cardStyle = {
  background: "#161628",
  border: "1px solid #2a2a4a",
  borderRadius: "8px",
  padding: "16px 20px",
};

function StatusSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        background: "#0f0f1a",
        color: "#e8e8f0",
        border: "1px solid #2a2a4a",
        borderRadius: "4px",
        padding: "4px 8px",
        fontSize: "11px",
        fontFamily: mono,
        cursor: "pointer",
      }}
    >
      {APPLICATION_STATUSES.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

function NotesEditor({ notes, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes);

  if (!editing) {
    return (
      <button
        onClick={() => { setDraft(notes); setEditing(true); }}
        style={{
          background: "transparent",
          color: notes ? "#a0a0b8" : "#606078",
          border: "none",
          fontSize: "11px",
          fontFamily: mono,
          cursor: "pointer",
          padding: 0,
          textAlign: "left",
        }}
      >
        {notes || "+ add notes"}
      </button>
    );
  }

  return (
    <div style={{ display: "flex", gap: "4px", alignItems: "center", marginTop: "4px" }}>
      <input
        type="text"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { onSave(draft); setEditing(false); }
          if (e.key === "Escape") setEditing(false);
        }}
        autoFocus
        placeholder="Interview date, contact, notes..."
        style={{
          background: "#0f0f1a",
          color: "#e8e8f0",
          border: "1px solid #2a2a4a",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "11px",
          fontFamily: mono,
          flex: 1,
          minWidth: "150px",
        }}
      />
      <button
        onClick={() => { onSave(draft); setEditing(false); }}
        style={{
          background: "#8B5CF633",
          color: "#8B5CF6",
          border: "none",
          borderRadius: "4px",
          padding: "4px 8px",
          fontSize: "10px",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: mono,
        }}
      >Save</button>
    </div>
  );
}

export function ApplicationDashboard({ applications, jobs, getJobKey, onApplicationsChange }) {
  const appliedEntries = Object.entries(applications)
    .map(([key, data]) => {
      const job = jobs.find(j => getJobKey(j) === key);
      return { key, ...data, job };
    })
    .sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

  const totalApplied = appliedEntries.length;
  const thisWeek = appliedEntries.filter(e => {
    return (Date.now() - new Date(e.appliedAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  }).length;

  const activeCount = appliedEntries.filter(e =>
    !["rejected", "withdrawn"].includes(e.status)
  ).length;

  const byStatus = {};
  for (const entry of appliedEntries) {
    const s = APPLICATION_STATUSES.find(st => st.value === entry.status);
    const label = s?.label ?? entry.status;
    byStatus[label] = (byStatus[label] || { count: 0, color: s?.color ?? "#888" });
    byStatus[label].count += 1;
  }

  const handleStatusChange = (key, status) => {
    onApplicationsChange(updateApplicationStatus(applications, key, status));
  };

  const handleNotesChange = (key, notes) => {
    onApplicationsChange(updateApplicationNotes(applications, key, notes));
  };

  const handleRemove = (key) => {
    onApplicationsChange(removeApplication(applications, key));
  };

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { value: totalApplied, label: "total applied", color: "#8B5CF6" },
          { value: thisWeek, label: "this week", color: "#10B981" },
          { value: activeCount, label: "active pipeline", color: "#F59E0B" },
        ].map(({ value, label, color }) => (
          <div key={label} style={{ ...cardStyle, flex: 1, minWidth: "140px" }}>
            <div style={{ fontSize: "36px", fontWeight: 700, fontFamily: mono, color }}>{value}</div>
            <div style={{ fontSize: "12px", color: "#a0a0b8", fontFamily: mono }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pipeline Breakdown */}
      {Object.keys(byStatus).length > 0 && (
        <div style={{ ...cardStyle, marginBottom: "24px" }}>
          <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "12px", fontFamily: mono }}>Pipeline</div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {Object.entries(byStatus).map(([label, { count, color }]) => (
              <div key={label} style={{
                background: color + "22",
                color: color,
                padding: "6px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 600,
                fontFamily: mono
              }}>{label}: {count}</div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, fontFamily: mono }}>Application History</div>
        {appliedEntries.length > 0 && (
          <button
            onClick={() => exportApplicationsCSV(applications, jobs, getJobKey)}
            style={{
              background: "#161628",
              color: "#a0a0b8",
              border: "1px solid #2a2a4a",
              borderRadius: "6px",
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: mono,
            }}
          >Export CSV</button>
        )}
      </div>

      {/* Application List */}
      {appliedEntries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#606078", fontFamily: mono }}>
          No applications yet. Mark jobs as applied from the Job Feed.
        </div>
      ) : (
        appliedEntries.map(({ key, status, notes, appliedAt, job }) => {
          const statusDef = APPLICATION_STATUSES.find(s => s.value === status) ?? APPLICATION_STATUSES[0];
          const profileColor = job ? (RESUME_PROFILES[job.bestProfile]?.color ?? "#888") : "#444";

          return (
            <div key={key} style={{
              ...cardStyle,
              marginBottom: "8px",
              borderLeft: `4px solid ${statusDef.color}`,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "12px",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "2px" }}>
                  {job ? job.role : key.split("::")[1]}
                </div>
                <div style={{ fontSize: "13px", color: "#a0a0b8" }}>
                  <span style={{ fontWeight: 600 }}>{job ? job.company : key.split("::")[0]}</span>
                  {job && <><span style={{ margin: "0 6px", color: "#606078" }}>&middot;</span><span>{job.location}</span></>}
                </div>
                <div style={{ fontSize: "11px", color: "#606078", fontFamily: mono, marginTop: "4px", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span>Applied {new Date(appliedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  {job && <span style={{ color: profileColor }}>{job.bestProfile}</span>}
                  {job?.score && <span style={{ color: "#8B5CF6" }}>{job.score}pts</span>}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <NotesEditor notes={notes} onSave={(n) => handleNotesChange(key, n)} />
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0, alignItems: "flex-end" }}>
                <StatusSelect value={status} onChange={(s) => handleStatusChange(key, s)} />
                {job?.link && (
                  <a href={job.link} target="_blank" rel="noopener noreferrer" style={{
                    background: "#8B5CF6", color: "#fff", padding: "6px 12px",
                    borderRadius: "6px", fontSize: "11px", fontWeight: 700,
                    textDecoration: "none", fontFamily: mono, textAlign: "center",
                  }}>VIEW</a>
                )}
                <button onClick={() => handleRemove(key)} style={{
                  background: "#EF444422", color: "#EF4444",
                  border: "1px solid #EF444444", borderRadius: "6px",
                  padding: "6px 12px", fontSize: "11px", fontWeight: 600,
                  cursor: "pointer", fontFamily: mono,
                }}>Remove</button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
