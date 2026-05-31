/**
 * Export application history to CSV.
 */

import { APPLICATION_STATUSES } from "../config/profiles.js";

function escapeCSV(value) {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportApplicationsCSV(applications, jobs, getJobKey) {
  const headers = ["Company", "Role", "Location", "Profile", "Score", "Status", "Notes", "Applied Date", "Last Updated"];

  const rows = Object.entries(applications)
    .sort(([, a], [, b]) => new Date(b.appliedAt) - new Date(a.appliedAt))
    .map(([key, data]) => {
      const job = jobs.find(j => getJobKey(j) === key);
      const statusLabel = APPLICATION_STATUSES.find(s => s.value === data.status)?.label ?? data.status;

      return [
        job?.company ?? key.split("::")[0],
        job?.role ?? key.split("::")[1],
        job?.location ?? "",
        job?.bestProfile ?? "",
        job?.score ?? "",
        statusLabel,
        data.notes,
        new Date(data.appliedAt).toLocaleDateString(),
        new Date(data.updatedAt).toLocaleDateString(),
      ].map(escapeCSV).join(",");
    });

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `job-radar-applications-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
