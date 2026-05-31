/**
 * Application storage with status tracking and notes.
 *
 * Data model per application:
 *   { status: string, notes: string, appliedAt: string, updatedAt: string }
 *
 * Migrates automatically from old format ("jobKey" -> "timestamp")
 * to new format ("jobKey" -> { status, notes, appliedAt, updatedAt }).
 *
 * Uses localStorage by default. When VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
 * are set, syncs to Supabase for cross-device persistence.
 */

const STORAGE_KEY = "jobRadarApplications";
const OLD_STORAGE_KEY = "jobRadarApplied";

function createEntry(status = "applied", notes = "") {
  const now = new Date().toISOString();
  return { status, notes, appliedAt: now, updatedAt: now };
}

function migrateOldFormat() {
  try {
    const old = JSON.parse(localStorage.getItem(OLD_STORAGE_KEY) || "null");
    if (!old) return null;

    const migrated = {};
    for (const [key, value] of Object.entries(old)) {
      if (typeof value === "string") {
        migrated[key] = { status: "applied", notes: "", appliedAt: value, updatedAt: value };
      } else {
        migrated[key] = value;
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    localStorage.removeItem(OLD_STORAGE_KEY);
    return migrated;
  } catch {
    return null;
  }
}

export function loadApplications() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (stored) return stored;
  } catch { /* fall through */ }

  const migrated = migrateOldFormat();
  if (migrated) return migrated;

  return {};
}

function persist(applications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  syncToSupabase(applications);
}

export function addApplication(applications, jobKey) {
  if (applications[jobKey]) return applications;
  const updated = { ...applications, [jobKey]: createEntry() };
  persist(updated);
  return updated;
}

export function removeApplication(applications, jobKey) {
  const { [jobKey]: _, ...rest } = applications;
  persist(rest);
  return rest;
}

export function updateApplicationStatus(applications, jobKey, status) {
  if (!applications[jobKey]) return applications;
  const updated = {
    ...applications,
    [jobKey]: { ...applications[jobKey], status, updatedAt: new Date().toISOString() }
  };
  persist(updated);
  return updated;
}

export function updateApplicationNotes(applications, jobKey, notes) {
  if (!applications[jobKey]) return applications;
  const updated = {
    ...applications,
    [jobKey]: { ...applications[jobKey], notes, updatedAt: new Date().toISOString() }
  };
  persist(updated);
  return updated;
}

export function toggleApplication(applications, jobKey) {
  if (applications[jobKey]) {
    return removeApplication(applications, jobKey);
  }
  return addApplication(applications, jobKey);
}

// --- Supabase sync (optional, non-blocking) ---

let supabaseClient = null;

async function getSupabase() {
  if (supabaseClient) return supabaseClient;

  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const { createClient } = await import("@supabase/supabase-js");
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch {
    return null;
  }
}

async function syncToSupabase(applications) {
  const client = await getSupabase();
  if (!client) return;

  try {
    const rows = Object.entries(applications).map(([jobKey, data]) => ({
      job_key: jobKey,
      status: data.status,
      notes: data.notes,
      applied_at: data.appliedAt,
      updated_at: data.updatedAt,
    }));

    await client.from("applications").upsert(rows, { onConflict: "job_key" });
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn("Supabase sync failed:", err.message);
    }
  }
}

export async function pullFromSupabase() {
  const client = await getSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.from("applications").select("*");
    if (error || !data) return null;

    const applications = {};
    for (const row of data) {
      applications[row.job_key] = {
        status: row.status,
        notes: row.notes || "",
        appliedAt: row.applied_at,
        updatedAt: row.updated_at,
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
    return applications;
  } catch {
    return null;
  }
}
