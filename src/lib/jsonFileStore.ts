import fsp from "node:fs/promises";
import path from "node:path";

function errorCode(err: unknown): string | undefined {
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/**
 * Read JSON from disk. Missing files use `fallback` (first run / reset).
 * Corrupt or partial files MUST throw — treating parse errors as the
 * seed dataset would let a torn write wipe real submissions on the
 * next poll+save cycle.
 */
export async function readJsonFileOrDefault<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fsp.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err) {
    if (errorCode(err) === "ENOENT") return fallback;
    throw err;
  }
}

/** Write JSON via a temp file + replace so concurrent readers never see partial JSON. */
export async function writeJsonFileAtomic(filePath: string, data: unknown): Promise<void> {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.tmp`;
  await fsp.writeFile(tmp, JSON.stringify(data), "utf-8");
  try {
    await fsp.rename(tmp, filePath);
  } catch {
    // Windows cannot rename over an existing file; copy then remove the temp.
    await fsp.copyFile(tmp, filePath);
    await fsp.unlink(tmp).catch(() => undefined);
  }
}
