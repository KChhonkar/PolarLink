import { INITIAL_SUBMISSIONS, SUBMISSIONS_STORAGE_KEY, type Submission } from "../data";

const API_URL = "/api/submissions";

// Shared submissions store used by the scientist upload portal, the admin
// review queue, and the public gallery.
//
// Tries the tiny JSON-file-backed API the dev/preview server exposes at
// /api/submissions (see vite.config.ts) first, so everyone connected to
// the same locally-hosted server — the scientist uploading, the admin
// reviewing, and anyone viewing the public gallery on a different device
// — reads and writes the SAME data. Falls back to per-browser
// localStorage if that route isn't available (e.g. the built site is
// served as static files with no Vite server behind it), in which case
// data stays local to that one browser only.

export async function loadSubmissions(): Promise<Submission[]> {
  try {
    const res = await fetch(API_URL, { cache: "no-store" });
    if (res.ok) return (await res.json()) as Submission[];
  } catch {
    /* API route not available — fall through to localStorage */
  }
  try {
    const raw = localStorage.getItem(SUBMISSIONS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Submission[]) : INITIAL_SUBMISSIONS;
  } catch {
    return INITIAL_SUBMISSIONS;
  }
}

export async function saveSubmissions(submissions: Submission[]): Promise<void> {
  let apiOk = false;
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(submissions),
    });
    apiOk = res.ok;
  } catch {
    apiOk = false;
  }

  // Always mirror to localStorage too, as an offline-friendly cache and
  // as the fallback path for static hosting with no server-side API.
  try {
    localStorage.setItem(SUBMISSIONS_STORAGE_KEY, JSON.stringify(submissions));
  } catch {
    if (apiOk) return; // server already has the authoritative copy
    // Both the API and a full localStorage write failed (most likely a
    // quota error from embedded image previews). Retry without them so
    // status/metadata still survives a refresh even though the photo won't.
    try {
      localStorage.setItem(
        SUBMISSIONS_STORAGE_KEY,
        JSON.stringify(submissions.map((s) => ({ ...s, previewUrl: undefined }))),
      );
    } catch {
      /* demo-only persistence; safe to ignore if storage is unavailable */
    }
  }
}
