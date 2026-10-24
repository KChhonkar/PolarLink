export interface AiResult {
  summary: string;
  caption: string;
  tags: string[];
  keyFacts: string[];
  model: string;
  basis: string;
  ok: boolean;
  error?: string;
}

export interface AiMetaInput {
  station: string;
  contentType: string;
  year: string;
  title: string;
  description: string;
}

function localFallback(file: File, meta: AiMetaInput): AiResult {
  const station = meta.station || "an NCPOR station";
  const year = meta.year || "";
  const title = meta.title || file.name || "this upload";
  const type = meta.contentType || "content";
  const when = year ? ` (${year})` : "";
  const kebab = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return {
    summary:
      `New ${type} from ${station}${when}: ${title}. ` +
      "A public-language summary will appear here once the local Gemma 4 model is available.",
    caption: `📡 New ${type} from India's ${station} programme${when}: ${title}. #IndiaScience #NCPOR #PolarResearch`,
    tags: [kebab(station), kebab(type), kebab(year) || "polar-research"].filter(Boolean),
    keyFacts: [],
    model: "",
    basis: "metadata",
    ok: false,
    error: "Could not reach the local AI endpoint",
  };
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

export async function summarizeFile(file: File, meta: AiMetaInput): Promise<AiResult> {
  const fallback = localFallback(file, meta);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 100_000);
  try {
    const res = await fetch("/api/ai/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "x-file-name": encodeURIComponent(file.name),
        "x-file-type": file.type || "application/octet-stream",
        "x-station": encodeURIComponent(meta.station),
        "x-content-type": encodeURIComponent(meta.contentType),
        "x-year": encodeURIComponent(meta.year),
        "x-title": encodeURIComponent(meta.title),
        "x-description": encodeURIComponent(meta.description),
      },
      body: file,
      signal: controller.signal,
    });
    const data = (await res.json()) as Record<string, unknown>;
    if (data && data.ok === true) {
      return {
        summary: String(data.summary || fallback.summary),
        caption: String(data.caption || fallback.caption),
        tags: asStringArray(data.tags),
        keyFacts: asStringArray(data.keyFacts),
        model: String(data.model || "gemma4:e4b"),
        basis: String(data.basis || "metadata"),
        ok: true,
      };
    }
    const serverFallback = data?.fallback as { summary?: string; caption?: string; tags?: unknown } | undefined;
    return {
      summary: String(serverFallback?.summary || fallback.summary),
      caption: String(serverFallback?.caption || fallback.caption),
      tags: asStringArray(serverFallback?.tags).length ? asStringArray(serverFallback?.tags) : fallback.tags,
      keyFacts: [],
      model: "",
      basis: "metadata",
      ok: false,
      error: String(data?.error || "AI unavailable"),
    };
  } catch {
    return fallback;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function checkAiHealth(): Promise<{ ok: boolean; model?: string; modelInstalled?: boolean }> {
  try {
    const res = await fetch("/api/ai/health", { cache: "no-store" });
    const data = (await res.json()) as { ok?: boolean; model?: string; modelInstalled?: boolean };
    return {
      ok: Boolean(data.ok),
      model: data.model,
      modelInstalled: Boolean(data.modelInstalled),
    };
  } catch {
    return { ok: false };
  }
}
