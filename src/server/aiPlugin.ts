import type { IncomingMessage, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { loadEnv, type Plugin } from "vite";

const nodeRequire = createRequire(path.join(process.cwd(), "package.json"));

const SUMMARIZE_ROUTE = "/api/ai/summarize";
const HEALTH_ROUTE = "/api/ai/health";
const MAX_BODY_BYTES = 25 * 1024 * 1024;
const TEXT_LIMIT = 12_000;
const SCAN_PDF_MIN_CHARS = 200;
const TIMEOUT_MS = 90_000;

const SYSTEM_PROMPT =
  "You are the science-communication assistant for NCPOR / India's polar research programme " +
  "(Maitri, Bharati, Himadri, Himansh). You turn scientists' uploads into material for the public and the media. " +
  "Use ONLY facts present in the provided content. Never invent numbers, dates, locations, or findings. " +
  "If the content is thin, say less rather than guess. Plain language, a school-leaver can understand. " +
  "No jargon without a short explanation.";

const JSON_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2-3 sentences, <= 70 words, plain language",
    },
    caption: {
      type: "string",
      description: "social post <= 280 chars, 1-2 emoji, 3-5 hashtags starting with #IndiaScience #NCPOR",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "3-6 lowercase-kebab-case keywords",
    },
    keyFacts: {
      type: "array",
      items: { type: "string" },
      description: "0-4 short bullets, only facts literally in the content",
    },
  },
  required: ["summary", "caption", "tags", "keyFacts"],
} as const;

export type AiBasis = "text" | "image" | "table" | "metadata";

interface AiMeta {
  fileName: string;
  fileType: string;
  station: string;
  contentType: string;
  year: string;
  title: string;
  description: string;
  fileSize: number;
}

export interface AiOkResponse {
  ok: true;
  summary: string;
  caption: string;
  tags: string[];
  keyFacts: string[];
  model: string;
  basis: AiBasis;
  truncated: boolean;
  ms: number;
}

export interface AiFailResponse {
  ok: false;
  error: string;
  fallback: { summary: string; caption: string; tags: string[] };
}

function cfg() {
  const loaded = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
  return {
    ollamaUrl: (process.env.OLLAMA_URL || loaded.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, ""),
    model: process.env.GEMMA_MODEL || loaded.GEMMA_MODEL || "gemma4:e4b",
  };
}

function header(req: IncomingMessage, name: string): string {
  const raw = req.headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return "";
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

function kebab(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function fallbackFromMeta(meta: {
  station: string;
  contentType: string;
  year: string;
  title: string;
  fileName?: string;
}): { summary: string; caption: string; tags: string[] } {
  const station = meta.station || "an NCPOR station";
  const year = meta.year || "";
  const title = meta.title || meta.fileName || "this upload";
  const type = meta.contentType || "content";
  const when = year ? ` (${year})` : "";
  return {
    summary:
      `New ${type} from ${station}${when}: ${title}. ` +
      "A public-language summary will appear here once the local Gemma 4 model is available.",
    caption: `📡 New ${type} from India's ${station} programme${when}: ${title}. #IndiaScience #NCPOR #PolarResearch`,
    tags: [kebab(station), kebab(type), kebab(year) || "polar-research"].filter(Boolean).slice(0, 6),
  };
}

function truncateText(text: string): { text: string; truncated: boolean } {
  if (text.length <= TEXT_LIMIT) return { text, truncated: false };
  const head = Math.floor(TEXT_LIMIT * 0.8);
  const tail = TEXT_LIMIT - head - 16;
  return {
    text: `${text.slice(0, head)}\n\n[...truncated...]\n\n${text.slice(-tail)}`,
    truncated: true,
  };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function tableBlock(headers: string[], rows: string[][]): string {
  const numericLines: string[] = [];
  for (let i = 0; i < headers.length; i++) {
    const nums: number[] = [];
    for (const row of rows) {
      const n = Number(String(row[i] ?? "").replace(/,/g, ""));
      if (Number.isFinite(n) && String(row[i] ?? "").trim() !== "") nums.push(n);
    }
    if (nums.length < 2) continue;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
    numericLines.push(
      `${headers[i]}: min=${min}, max=${max}, mean=${Number(mean.toPrecision(6))} (n=${nums.length})`,
    );
  }
  const sample = rows.slice(0, 30).map((r) => r.join(", ")).join("\n");
  return [
    `Columns (${headers.length}): ${headers.join(", ") || "(none)"}`,
    `Row count: ${rows.length}`,
    numericLines.length ? `Numeric column stats:\n${numericLines.join("\n")}` : "Numeric column stats: none detected",
    `First ${Math.min(30, rows.length)} rows:\n${sample}`,
  ].join("\n");
}

async function extractPdf(buf: Buffer): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    return String(result.text || "").trim();
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractDocx(buf: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: buf });
  return String(result.value || "").trim();
}

function extractCsv(buf: Buffer): string {
  const text = buf.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return "";
  const headers = splitCsvLine(lines[0] ?? "");
  const rows = lines.slice(1).map(splitCsvLine);
  return tableBlock(headers, rows);
}

function extractXlsx(buf: Buffer): string {
  const XLSX = nodeRequire("xlsx") as typeof import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer", cellDates: false });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return "";
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return "";
  const raw = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
  if (!raw.length) return `Spreadsheet sheet: ${sheetName} (empty)`;
  const headers = (raw[0] ?? []).map((c) => String(c ?? "").trim());
  const rows = raw.slice(1).map((r) => headers.map((_, i) => String(r?.[i] ?? "").trim()));
  return `Sheet: ${sheetName}\n${tableBlock(headers, rows)}`;
}

async function prepareImage(buf: Buffer): Promise<string | null> {
  try {
    const sharp = (await import("sharp")).default;
    const out = await sharp(buf)
      .rotate()
      .resize(1024, 1024, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return out.toString("base64");
  } catch {
    if (buf.length <= 3 * 1024 * 1024) return buf.toString("base64");
    return null;
  }
}

interface Extracted {
  basis: AiBasis;
  text: string;
  truncated: boolean;
  imageBase64?: string;
  note?: string;
}

async function extractContent(buf: Buffer, meta: AiMeta): Promise<Extracted> {
  const ext = extOf(meta.fileName);
  const mime = (meta.fileType || "").toLowerCase();

  try {
    if (ext === "pdf" || mime === "application/pdf") {
      const raw = await extractPdf(buf);
      if (raw.length < SCAN_PDF_MIN_CHARS) {
        return {
          basis: "metadata",
          text: "",
          truncated: false,
          note: "PDF text was too short to use (likely a scan). Summarise from metadata only; say you could not read the document text.",
        };
      }
      const cut = truncateText(raw);
      return { basis: "text", text: cut.text, truncated: cut.truncated };
    }

    if (ext === "docx" || mime.includes("wordprocessingml")) {
      const raw = await extractDocx(buf);
      const cut = truncateText(raw);
      return { basis: "text", text: cut.text, truncated: cut.truncated, note: raw.length < SCAN_PDF_MIN_CHARS ? "Document text was thin." : undefined };
    }

    if (ext === "csv" || mime === "text/csv") {
      const raw = extractCsv(buf);
      const cut = truncateText(raw);
      return { basis: "table", text: cut.text, truncated: cut.truncated };
    }

    if (ext === "xlsx" || mime.includes("spreadsheetml")) {
      const raw = extractXlsx(buf);
      const cut = truncateText(raw);
      return { basis: "table", text: cut.text, truncated: cut.truncated };
    }

    const imageExts = ["jpg", "jpeg", "png", "tif", "tiff", "webp", "bmp", "avif", "heic", "heif"];
    const isBitmapImage = mime.startsWith("image/") && mime !== "image/svg+xml";
    if (imageExts.includes(ext) || isBitmapImage) {
      const imageBase64 = await prepareImage(buf);
      if (!imageBase64) {
        return {
          basis: "metadata",
          text: "",
          truncated: false,
          note: "Image was too large to send without resizing. Describe from metadata only; do not invent what the photo shows.",
        };
      }
      return { basis: "image", text: "", truncated: false, imageBase64 };
    }
  } catch (err) {
    return {
      basis: "metadata",
      text: "",
      truncated: false,
      note: `Could not extract file content (${err instanceof Error ? err.message : "error"}). Use metadata only.`,
    };
  }

  return {
    basis: "metadata",
    text: "",
    truncated: false,
    note: "No content extraction for this file type. Use only the filename, type, size, station, year, title and description. Do not claim to have read, watched, or opened the file.",
  };
}

function buildUserPrompt(meta: AiMeta, extracted: Extracted): string {
  const sizeMb = (meta.fileSize / (1024 * 1024)).toFixed(2);
  const lines = [
    `Station: ${meta.station || "(not given)"}`,
    `Content type: ${meta.contentType || "(not given)"}`,
    `Year: ${meta.year || "(not given)"}`,
    `Scientist title: ${meta.title || "(not given)"}`,
    `Scientist description: ${meta.description || "(none)"}`,
    `File name: ${meta.fileName || "(unknown)"}`,
    `File type: ${meta.fileType || extOf(meta.fileName) || "(unknown)"}`,
    `File size: ${sizeMb} MB`,
    `Extraction basis: ${extracted.basis}`,
  ];
  if (extracted.note) lines.push(`Note: ${extracted.note}`);
  if (extracted.basis === "image") {
    lines.push("An image is attached. Describe what is actually visible. Do not invent instrument readings or findings that are not visible.");
  } else if (extracted.basis === "metadata") {
    lines.push("You cannot see the file contents. Do not claim to have read, watched, or analysed the file.");
  } else if (extracted.text) {
    lines.push("", "--- FILE CONTENT ---", extracted.text);
  }
  lines.push(
    "",
    "Return JSON with summary, caption, tags, and keyFacts. Caption must include #IndiaScience and #NCPOR.",
  );
  return lines.join("\n");
}

function stripFences(s: string): string {
  const trimmed = s.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (m?.[1] ?? trimmed).trim();
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

function parseModelJson(raw: unknown): { summary: string; caption: string; tags: string[]; keyFacts: string[] } | null {
  let obj: unknown = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(stripFences(raw));
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const rec = obj as Record<string, unknown>;
  const summary = String(rec.summary ?? "").trim();
  const caption = String(rec.caption ?? "").trim();
  if (!summary || !caption) return null;
  const tags = asStringArray(rec.tags).map((t) => kebab(t.replace(/^#/, ""))).filter(Boolean).slice(0, 6);
  const keyFacts = asStringArray(rec.keyFacts).slice(0, 4);
  return { summary, caption, tags, keyFacts };
}

async function callOllama(
  model: string,
  ollamaUrl: string,
  userContent: string,
  imageBase64?: string,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const userMessage: Record<string, unknown> = { role: "user", content: userContent };
  if (imageBase64) userMessage.images = [imageBase64];

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          userMessage,
        ],
        stream: false,
        format: JSON_SCHEMA,
        options: { temperature: 0.3, num_ctx: 8192 },
        keep_alive: "30m",
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Ollama HTTP ${res.status}${errText ? `: ${errText.slice(0, 180)}` : ""}`);
    }
    const data = (await res.json()) as { message?: { content?: unknown } };
    const content = data?.message?.content;
    if (typeof content === "string") return content;
    if (content && typeof content === "object") return JSON.stringify(content);
    throw new Error("Ollama returned an empty message");
  } finally {
    clearTimeout(timer);
  }
}

async function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("File exceeds 25 MB limit"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function handleHealth(_req: IncomingMessage, res: ServerResponse) {
  const { ollamaUrl, model } = cfg();
  try {
    const r = await fetch(`${ollamaUrl}/api/tags`);
    if (!r.ok) {
      json(res, 200, { ok: false, model, modelInstalled: false, error: `Ollama HTTP ${r.status}` });
      return;
    }
    const data = (await r.json()) as { models?: { name?: string; model?: string }[] };
    const names = (data.models || []).map((m) => m.name || m.model || "");
    const modelInstalled = names.some((n) => n === model || n.startsWith(`${model}:`) || n.startsWith(`${model}-`));
    json(res, 200, { ok: true, model, modelInstalled });
  } catch {
    json(res, 200, { ok: false, model, modelInstalled: false, error: "Ollama not running" });
  }
}

async function handleSummarize(req: IncomingMessage, res: ServerResponse) {
  const started = Date.now();
  const { ollamaUrl, model } = cfg();
  const meta: AiMeta = {
    fileName: header(req, "x-file-name") || "upload",
    fileType: header(req, "x-file-type"),
    station: header(req, "x-station"),
    contentType: header(req, "x-content-type"),
    year: header(req, "x-year"),
    title: header(req, "x-title"),
    description: header(req, "x-description"),
    fileSize: 0,
  };
  const fallback = () => fallbackFromMeta(meta);

  let buf: Buffer;
  try {
    buf = await readBody(req);
    meta.fileSize = buf.length;
  } catch (err) {
    json(res, 200, { ok: false, error: err instanceof Error ? err.message : "Could not read upload", fallback: fallback() } satisfies AiFailResponse);
    return;
  }

  let extracted: Extracted;
  try {
    extracted = await extractContent(buf, meta);
  } catch (err) {
    extracted = {
      basis: "metadata",
      text: "",
      truncated: false,
      note: `Extraction failed (${err instanceof Error ? err.message : "error"}). Use metadata only.`,
    };
  }

  const userContent = buildUserPrompt(meta, extracted);
  const fail = (error: string): AiFailResponse => ({ ok: false, error, fallback: fallback() });

  try {
    let raw = await callOllama(model, ollamaUrl, userContent, extracted.imageBase64);
    let parsed = parseModelJson(raw);
    if (!parsed) {
      raw = await callOllama(
        model,
        ollamaUrl,
        `${userContent}\n\nYour previous reply was not valid JSON. Reply with JSON only, no markdown.`,
        extracted.imageBase64,
      );
      parsed = parseModelJson(raw);
    }
    const ms = Date.now() - started;
    if (!parsed) {
      console.log(`ai: ${meta.fileName} basis=${extracted.basis} model=${model} ${ms}ms PARSE_FAIL`);
      json(res, 200, fail("Model returned unreadable JSON"));
      return;
    }
    const body: AiOkResponse = {
      ok: true,
      summary: parsed.summary,
      caption: parsed.caption,
      tags: parsed.tags.length ? parsed.tags : fallback().tags,
      keyFacts: parsed.keyFacts,
      model,
      basis: extracted.basis,
      truncated: extracted.truncated,
      ms,
    };
    console.log(`ai: ${meta.fileName} basis=${extracted.basis} model=${model} ${ms}ms`);
    json(res, 200, body);
  } catch (err) {
    const ms = Date.now() - started;
    const error =
      err instanceof Error && err.name === "AbortError"
        ? "Gemma timed out"
        : err instanceof Error
          ? err.message
          : "Ollama request failed";
    console.log(`ai: ${meta.fileName} basis=${extracted.basis} model=${model} ${ms}ms FAIL ${error}`);
    json(res, 200, fail(error.slice(0, 180)));
  }
}

function warmup() {
  const { ollamaUrl, model } = cfg();
  fetch(`${ollamaUrl}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: "", keep_alive: "30m" }),
  })
    .then(async (r) => {
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        console.log(`Gemma warm-up failed: HTTP ${r.status} ${t.slice(0, 120)}`);
        return;
      }
      console.log("Gemma warm-up done");
    })
    .catch((err: unknown) => {
      console.log(`Gemma warm-up failed: ${err instanceof Error ? err.message : String(err)}`);
    });
}

/**
 * Local Gemma 4 summarisation via Ollama. Dev + preview only (Vite middleware).
 */
export function aiSummarizePlugin(): Plugin {
  const attach = (server: { middlewares: { use: (fn: (req: IncomingMessage, res: ServerResponse, next: () => void) => void) => void } }) => {
    server.middlewares.use((req, res, next) => {
      const url = req.url?.split("?")[0] ?? "";
      if (url === HEALTH_ROUTE && req.method === "GET") {
        handleHealth(req, res).catch((err: Error) => json(res, 200, { ok: false, error: err.message }));
        return;
      }
      if (url === SUMMARIZE_ROUTE && req.method === "POST") {
        handleSummarize(req, res).catch((err: Error) => {
          json(res, 200, {
            ok: false,
            error: err.message,
            fallback: fallbackFromMeta({ station: "", contentType: "", year: "", title: "", fileName: "upload" }),
          } satisfies AiFailResponse);
        });
        return;
      }
      next();
    });
  };

  return {
    name: "ai-summarize",
    configureServer(server) {
      attach(server);
      warmup();
    },
    configurePreviewServer(server: Parameters<typeof attach>[0]) {
      attach(server);
      warmup();
    },
  };
}
