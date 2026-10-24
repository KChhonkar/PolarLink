import assert from "node:assert/strict";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { readJsonFileOrDefault, writeJsonFileAtomic } from "./jsonFileStore.ts";

const fallback = [{ id: "SEED" }];

test("missing file returns fallback instead of throwing", async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "polarlink-store-"));
  const file = path.join(dir, "submissions.json");
  const result = await readJsonFileOrDefault(file, fallback);
  assert.deepEqual(result, fallback);
});

test("corrupt existing file throws instead of silently reseeding", async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "polarlink-store-"));
  const file = path.join(dir, "submissions.json");
  await fsp.writeFile(file, '{"id":', "utf-8");
  await assert.rejects(() => readJsonFileOrDefault(file, fallback), SyntaxError);
});

test("atomic write leaves a complete JSON document for readers", async () => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "polarlink-store-"));
  const file = path.join(dir, "submissions.json");
  const payload = [{ id: "SUB-1", title: "Ice core" }, { id: "SUB-2", title: "CO2" }];
  await writeJsonFileAtomic(file, payload);
  const raw = await fsp.readFile(file, "utf-8");
  assert.deepEqual(JSON.parse(raw), payload);
  const readBack = await readJsonFileOrDefault(file, fallback);
  assert.deepEqual(readBack, payload);
});
