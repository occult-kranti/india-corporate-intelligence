/** Package complete browser evidence for bounded downloads. Node built-ins only. */
import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { copyFile, lstat, mkdir, open, readdir, writeFile, appendFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, parse, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_PART_BYTES = 170 * 1024 * 1024;
export const MAX_PARTS = 8;
export const MANIFEST_NAME = "artifact-manifest.json";
export const EVIDENCE_PREFIX = "browser-review";
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const partName = (index) => String(index + 1).padStart(2, "0");
const fail = (message) => { throw new Error(`Browser artifact packaging: ${message}`); };

function inside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

function safeName(name) {
  if (!name || name === "." || name === ".." || /[\\/\x00-\x1f\x7f]/.test(name)) {
    fail(`unsafe or non-portable path component ${JSON.stringify(name)}`);
  }
}

// Check ancestors as well as leaf nodes; lstat never follows a symbolic link.
async function checkDirectoryPath(path, allowMissing = false) {
  const absolute = resolve(path);
  let current = parse(absolute).root;
  const components = absolute.slice(current.length).split(sep).filter(Boolean);
  for (const name of components) {
    safeName(name);
    current = join(current, name);
    let entry;
    try { entry = await lstat(current); }
    catch (error) {
      if (error.code === "ENOENT" && allowMissing) return false;
      throw error;
    }
    if (entry.isSymbolicLink()) fail(`symbolic links are not allowed: ${current}`);
    if (!entry.isDirectory()) fail(`directory required: ${current}`);
  }
  return true;
}

function sameStat(a, b) {
  return ["dev", "ino", "mode", "size", "mtimeMs", "ctimeMs"].every((key) => a[key] === b[key]);
}

async function hashFile(path, expected) {
  const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await handle.stat();
    if (!before.isFile() || (expected && !sameStat(before, expected))) fail(`source changed: ${path}`);
    const hash = createHash("sha256");
    for await (const chunk of handle.createReadStream({ autoClose: false })) hash.update(chunk);
    if (!sameStat(before, await handle.stat())) fail(`file changed while hashing: ${path}`);
    return hash.digest("hex");
  } finally { await handle.close(); }
}

function priority(path) {
  const name = basename(path).toLowerCase();
  if (/\.zip$/i.test(path)) return 5;
  if (/^(summary|report|index)(?:[._-]|$)/.test(name)) return 0;
  if (/\.json$/i.test(path)) return 1;
  if (/\.png$/i.test(path)) return 2;
  return 3;
}

async function inventory(source, maxPartBytes) {
  const files = [];
  const walk = async (directory, prefix = "") => {
    await checkDirectoryPath(directory);
    for (const name of (await readdir(directory)).sort(compare)) {
      safeName(name);
      const absolute = join(directory, name);
      if (!inside(source, absolute)) fail(`path escapes source: ${absolute}`);
      const path = prefix ? `${prefix}/${name}` : name;
      const entry = await lstat(absolute);
      if (entry.isSymbolicLink()) fail(`symbolic links are not allowed: ${path}`);
      if (entry.isDirectory()) await walk(absolute, path);
      else if (entry.isFile()) {
        if (!Number.isSafeInteger(entry.size)) fail(`unsafe byte count: ${path}`);
        if (entry.size > maxPartBytes) {
          fail(`single file ${JSON.stringify(path)} is ${entry.size} bytes, over the ${maxPartBytes}-byte part cap; originals are untouched`);
        }
        files.push({ path, bytes: entry.size, sha256: await hashFile(absolute, entry), stat: entry });
      } else fail(`only regular files and directories are allowed: ${path}`);
    }
  };
  await walk(source);
  return files.sort((a, b) => priority(a.path) - priority(b.path) || compare(a.path, b.path));
}

function planParts(files, { maxPartBytes, maxParts, sourceMissing }) {
  // Replicate the complete index in every part. Reserve its actual serialized
  // size, then re-pack until every payload plus index fits the byte cap.
  let reservedBytes = 0;
  for (;;) {
    const parts = [{ part: "01", payloadBytes: 0, fileCount: 0 }];
    const rows = [];
    for (const file of files) {
      if (file.bytes + reservedBytes > maxPartBytes) {
        fail(`file ${JSON.stringify(file.path)} plus the complete manifest exceeds the ${maxPartBytes}-byte part cap; originals are untouched`);
      }
      let current = parts.at(-1);
      if (current.payloadBytes + file.bytes + reservedBytes > maxPartBytes) {
        if (parts.length >= maxParts) {
          fail(`ordered complete evidence needs more than ${maxParts} parts of ${maxPartBytes} bytes; originals are untouched`);
        }
        current = { part: partName(parts.length), payloadBytes: 0, fileCount: 0 };
        parts.push(current);
      }
      current.payloadBytes += file.bytes;
      current.fileCount += 1;
      rows.push({ path: file.path, archivePath: `${EVIDENCE_PREFIX}/${file.path}`, bytes: file.bytes, sha256: file.sha256, part: current.part });
    }
    const manifest = {
      schemaVersion: 1,
      sourceDirectory: EVIDENCE_PREFIX,
      sourceMissing,
      maxPartBytes,
      maxParts,
      manifestFile: MANIFEST_NAME,
      ordering: "summary/report/index, JSON, PNG, other files, ZIP; lexical path within each group",
      fileCount: rows.length,
      totalEvidenceBytes: rows.reduce((sum, file) => sum + file.bytes, 0),
      parts,
      files: rows,
    };
    const text = `${JSON.stringify(manifest, null, 2)}\n`;
    const manifestBytes = Buffer.byteLength(text);
    if (manifestBytes > maxPartBytes) fail(`complete manifest exceeds the ${maxPartBytes}-byte part cap; originals are untouched`);
    if (manifestBytes <= reservedBytes) return { manifest, text, manifestBytes };
    reservedBytes = manifestBytes;
  }
}

/** No browser, network, archive extraction, deletion, or source writes. */
export async function partitionBrowserArtifacts({
  sourceDirectory,
  outputDirectory,
  maxPartBytes = MAX_PART_BYTES,
  maxParts = MAX_PARTS,
} = {}) {
  if (!sourceDirectory || !outputDirectory) fail("sourceDirectory and outputDirectory are required");
  if (!Number.isSafeInteger(maxPartBytes) || maxPartBytes <= 0 || maxPartBytes > MAX_PART_BYTES) fail(`maxPartBytes must be between 1 and ${MAX_PART_BYTES}`);
  if (!Number.isSafeInteger(maxParts) || maxParts <= 0 || maxParts > MAX_PARTS) fail(`maxParts must be between 1 and ${MAX_PARTS}`);
  for (const path of [sourceDirectory, outputDirectory]) {
    if (String(path).split(/[\\/]/).includes("..")) fail(`parent traversal is not allowed: ${path}`);
    for (const component of resolve(path).slice(parse(resolve(path)).root.length).split(sep).filter(Boolean)) safeName(component);
  }
  const source = resolve(sourceDirectory);
  const output = resolve(outputDirectory);
  if (inside(source, output) || inside(output, source)) fail("source and output must be separate, non-overlapping directories");
  const sourceMissing = !(await checkDirectoryPath(source, true));
  await checkDirectoryPath(dirname(output));
  try {
    await lstat(output);
    fail(`output already exists; refusing to overwrite evidence: ${output}`);
  } catch (error) { if (error.code !== "ENOENT") throw error; }
  const files = sourceMissing ? [] : await inventory(source, maxPartBytes);
  const plan = planParts(files, { maxPartBytes, maxParts, sourceMissing });
  await mkdir(output); // Exclusive creation; never delete or reuse a prior run.
  for (const part of plan.manifest.parts) await mkdir(join(output, part.part));
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const row = plan.manifest.files[index];
    const original = join(source, ...file.path.split("/"));
    const destination = join(output, row.part, ...row.archivePath.split("/"));
    await checkDirectoryPath(dirname(original));
    const before = await lstat(original);
    if (!before.isFile() || !sameStat(file.stat, before)) fail(`source changed before copy: ${file.path}`);
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(original, destination, constants.COPYFILE_EXCL);
    if ((await lstat(destination)).size !== file.bytes || await hashFile(destination) !== file.sha256) {
      fail(`copy integrity mismatch: ${file.path}; original and partial output are retained`);
    }
  }
  // Re-enumeration detects missing/new files, path swaps and changed source data.
  const afterMissing = !(await checkDirectoryPath(source, true));
  if (afterMissing !== sourceMissing) fail("source presence changed while packaging");
  const after = sourceMissing ? [] : await inventory(source, maxPartBytes);
  if (after.length !== files.length || files.some((file, index) =>
    file.path !== after[index]?.path || file.sha256 !== after[index]?.sha256 || !sameStat(file.stat, after[index]?.stat ?? {}))) {
    fail("source tree changed while packaging; original and partial output are retained");
  }
  // A manifest only appears after all copies and source re-verification succeed.
  for (const part of plan.manifest.parts) {
    if (part.payloadBytes + plan.manifestBytes > maxPartBytes) fail(`internal byte budget violation: part ${part.part}`);
    await writeFile(join(output, part.part, MANIFEST_NAME), plan.text, { flag: "wx" });
  }
  await writeFile(join(output, MANIFEST_NAME), plan.text, { flag: "wx" });
  return {
    ...plan,
    parts: plan.manifest.parts.map((part) => ({ ...part, totalBytes: part.payloadBytes + plan.manifestBytes })),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 2) fail("no CLI arguments are accepted; run from spatial-prototype (browser-review -> browser-artifact-parts)");
    const result = await partitionBrowserArtifacts({ sourceDirectory: "browser-review", outputDirectory: "browser-artifact-parts" });
    if (process.env.GITHUB_OUTPUT) {
      await appendFile(process.env.GITHUB_OUTPUT, Array.from({ length: MAX_PARTS }, (_, index) =>
        `part_${partName(index)}=${index < result.parts.length}`).join("\n") + "\n");
    }
    console.log(JSON.stringify({ fileCount: result.manifest.fileCount, sourceMissing: result.manifest.sourceMissing, manifestBytes: result.manifestBytes, parts: result.parts }, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
