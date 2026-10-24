#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const p = resolve(process.cwd(), ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadDotEnv();

const url = (process.env.OLLAMA_URL || "http://localhost:11434").replace(/\/$/, "");
const model = process.env.GEMMA_MODEL || "gemma4:e4b";

function fail(message) {
  console.error(message);
  process.exit(1);
}

let tagsJson;
try {
  const tagsRes = await fetch(`${url}/api/tags`);
  if (!tagsRes.ok) fail(`Ollama responded HTTP ${tagsRes.status} at ${url}/api/tags`);
  tagsJson = await tagsRes.json();
} catch (err) {
  fail(
    `Ollama is not running (or not reachable at ${url}).\n` +
      `Install from https://ollama.com/download, start it, then: ollama pull ${model}\n` +
      `(${err instanceof Error ? err.message : String(err)})`,
  );
}

const names = (tagsJson?.models || []).map((m) => m.name || m.model || "");
const installed = names.some((n) => n === model || n.startsWith(`${model}-`) || n.startsWith(`${model}:`));
if (!installed) {
  fail(
    `Model "${model}" is not installed.\n` +
      `Run: ollama pull ${model}\n` +
      `Installed models: ${names.join(", ") || "(none)"}`,
  );
}

const t0 = Date.now();
try {
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Reply with the single word: pong" }],
      stream: false,
      keep_alive: "30m",
    }),
  });
  if (!res.ok) fail(`Test prompt failed: HTTP ${res.status}`);
  const body = await res.json();
  const ms = Date.now() - t0;
  const text = String(body?.message?.content || "").replace(/\s+/g, " ").trim();
  console.log(`Ollama OK  model=${model}  latency=${ms}ms`);
  console.log(`reply: ${text.slice(0, 160) || "(empty)"}`);
} catch (err) {
  fail(`Test prompt failed: ${err instanceof Error ? err.message : String(err)}`);
}
