import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, symlink, access, rm, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { EVIDENCE_PREFIX, MANIFEST_NAME, MAX_PART_BYTES, MAX_PARTS, partitionBrowserArtifacts } from "./partition-browser-artifacts.mjs";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const script = fileURLToPath(new URL("./partition-browser-artifacts.mjs", import.meta.url));
const repo = resolve(dirname(script), "../..");

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "browser-artifact-partition-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceDirectory = join(root, "browser-review");
  const outputDirectory = join(root, "browser-artifact-parts");
  await mkdir(sourceDirectory);
  const put = async (path, content) => {
    const target = join(sourceDirectory, ...path.split("/"));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  };
  return { root, sourceDirectory, outputDirectory, put };
}

async function tree(root) {
  const rows = [];
  const walk = async (directory, prefix = "") => {
    for (const name of (await readdir(directory)).sort()) {
      const path = prefix ? `${prefix}/${name}` : name;
      const target = join(directory, name);
      const stat = await lstat(target);
      if (stat.isDirectory()) await walk(target, path);
      else rows.push({ path, bytes: stat.size, sha256: sha256(await readFile(target)), mode: stat.mode, mtime: stat.mtimeMs, ctime: stat.ctimeMs, inode: stat.ino });
    }
  };
  await walk(root);
  return rows;
}

async function verifyParts(result, sourceDirectory, outputDirectory, cap) {
  const manifestText = await readFile(join(outputDirectory, MANIFEST_NAME), "utf8");
  assert.equal(manifestText, result.text);
  assert.equal(Buffer.byteLength(manifestText), result.manifestBytes);
  const seen = [];
  for (const part of result.parts) {
    const root = join(outputDirectory, part.part);
    assert.equal(await readFile(join(root, MANIFEST_NAME), "utf8"), manifestText);
    const actual = await tree(root);
    assert.equal(actual.reduce((sum, row) => sum + row.bytes, 0), part.totalBytes);
    assert.ok(part.totalBytes <= cap);
    const rows = result.manifest.files.filter((row) => row.part === part.part);
    assert.equal(actual.length, rows.length + 1);
    for (const row of rows) {
      const bytes = await readFile(join(root, ...row.archivePath.split("/")));
      assert.equal(row.archivePath, `${EVIDENCE_PREFIX}/${row.path}`);
      assert.equal(bytes.length, row.bytes);
      assert.equal(sha256(bytes), row.sha256);
      assert.deepEqual(bytes, await readFile(join(sourceDirectory, ...row.path.split("/"))));
      seen.push(row.path);
    }
  }
  const source = await tree(sourceDirectory);
  assert.deepEqual(seen.sort(), source.map((row) => row.path).sort());
  assert.equal(new Set(seen).size, seen.length);
  assert.equal(result.manifest.fileCount, seen.length);
  assert.equal(result.manifest.totalEvidenceBytes, source.reduce((sum, row) => sum + row.bytes, 0));
}

test("complete evidence is byte-exact, bounded, indexed, deterministic and source-immutable", async (t) => {
  const f = await fixture(t);
  const inputs = [
    ["z-traces/trace-b.zip", Buffer.alloc(3000, 0xfd)],
    ["trace-a.zip", Buffer.alloc(3000, 0x5a)],
    ["nested/screenshot.png", Buffer.alloc(2500, 0x89)],
    ["report.json", '{"failed":true}\n'],
    ["summary.md", "A complete diagnostic summary\n"],
    ["index.html", "<p>Evidence index</p>"],
    ["nested/diagnostics.json", '{"measurements":[]}\n'],
    ["unit-tests.log", "not truncated\n"],
    [".hidden/evidence.json", "{}"],
    [MANIFEST_NAME, "Original evidence with the same name as the new manifest."],
    ["unicode/東京.txt", "exact Unicode filename and bytes\n"],
    ["zero.bin", Buffer.alloc(0)],
  ];
  for (const [path, content] of inputs) await f.put(path, content);
  await mkdir(join(f.sourceDirectory, "empty-directory"));
  const before = await tree(f.sourceDirectory);
  const result = await partitionBrowserArtifacts({ ...f, maxPartBytes: 8192 });
  assert.ok(result.parts.length > 1 && result.parts.length <= MAX_PARTS);
  await verifyParts(result, f.sourceDirectory, f.outputDirectory, 8192);
  assert.deepEqual(await tree(f.sourceDirectory), before, "source contents and write metadata stay unchanged");
  const paths = result.manifest.files.map((row) => row.path);
  assert.deepEqual(paths.slice(0, 3), ["index.html", "report.json", "summary.md"]);
  assert.deepEqual(paths.slice(-2), ["trace-a.zip", "z-traces/trace-b.zip"]);
  assert.ok(paths.indexOf("nested/diagnostics.json") < paths.indexOf("nested/screenshot.png"));
  assert.ok(paths.indexOf("nested/screenshot.png") < paths.indexOf("unit-tests.log"));
  const second = await partitionBrowserArtifacts({ ...f, outputDirectory: join(f.root, "second"), maxPartBytes: 8192 });
  assert.equal(second.text, result.text, "no timestamps, absolute roots or creation order in manifest");
  const clone = await fixture(t);
  for (const [path, content] of [...inputs].reverse()) await clone.put(path, content);
  const reversed = await partitionBrowserArtifacts({ ...clone, maxPartBytes: 8192 });
  assert.equal(reversed.text, result.text, "input creation order cannot change partition assignment");
  const summary = result.manifest.files.find((row) => row.path === "summary.md");
  await writeFile(join(f.outputDirectory, summary.part, ...summary.archivePath.split("/")), "changed packaged copy");
  assert.deepEqual(await tree(f.sourceDirectory), before, "packaged copies do not alias source files");
});

test("a part exactly at the cap succeeds, including manifest bytes", async (t) => {
  const f = await fixture(t);
  await f.put("boundary.png", Buffer.alloc(6000));
  let cap = 9999;
  let result;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    result = await partitionBrowserArtifacts({ ...f, outputDirectory: join(f.root, `pass-${attempt}`), maxPartBytes: cap });
    if (result.parts[0].totalBytes === cap) break;
    cap = result.parts[0].totalBytes;
  }
  assert.equal(result.parts.length, 1);
  assert.equal(result.parts[0].totalBytes, cap);
  await assert.rejects(partitionBrowserArtifacts({ ...f, maxPartBytes: cap - 1 }), /plus the complete manifest exceeds/);
  await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
});

test("single file over cap fails closed before making output; original is retained", async (t) => {
  const f = await fixture(t);
  await f.put("too-big.zip", Buffer.alloc(8193));
  const before = await tree(f.sourceDirectory);
  await assert.rejects(partitionBrowserArtifacts({ ...f, maxPartBytes: 8192 }), /single file "too-big.zip" is 8193 bytes, over the 8192-byte part cap/);
  assert.deepEqual(await tree(f.sourceDirectory), before);
  await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
});

test("production cap rejects a sparse file one byte above 170 MiB without reading or copying it", async (t) => {
  const f = await fixture(t);
  const handle = await open(join(f.sourceDirectory, "oversize.zip"), "wx");
  await handle.truncate(MAX_PART_BYTES + 1);
  await handle.close();
  await assert.rejects(partitionBrowserArtifacts(f), /single file "oversize.zip".*over the 178257920-byte part cap/);
  assert.equal((await lstat(join(f.sourceDirectory, "oversize.zip"))).size, MAX_PART_BYTES + 1);
  await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
});

test("eight parts are allowed; needing a ninth fails without partial packaging", async (t) => {
  const f = await fixture(t);
  for (let index = 0; index < 8; index += 1) await f.put(`trace-${index}.zip`, Buffer.alloc(6000, index));
  const result = await partitionBrowserArtifacts({ ...f, maxPartBytes: 10000 });
  assert.equal(result.parts.length, 8);
  await verifyParts(result, f.sourceDirectory, f.outputDirectory, 10000);
  await f.put("trace-8.zip", Buffer.alloc(6000, 8));
  const next = join(f.root, "ninth-part-denied");
  await assert.rejects(partitionBrowserArtifacts({ ...f, outputDirectory: next, maxPartBytes: 10000 }), /more than 8 parts/);
  await assert.rejects(access(next), { code: "ENOENT" });
  assert.equal((await tree(f.sourceDirectory)).length, 9);
});

test("empty or missing source produces an explicit diagnostic manifest without creating source", async (t) => {
  const f = await fixture(t);
  const empty = await partitionBrowserArtifacts(f);
  assert.equal(empty.manifest.fileCount, 0);
  assert.equal(empty.manifest.sourceMissing, false);
  assert.equal(empty.parts.length, 1);
  const missing = join(f.root, "not-created");
  const result = await partitionBrowserArtifacts({ sourceDirectory: missing, outputDirectory: join(f.root, "missing-parts") });
  assert.equal(result.manifest.sourceMissing, true);
  assert.equal(result.manifest.fileCount, 0);
  await assert.rejects(access(missing), { code: "ENOENT" });
});

test("existing outputs are never overwritten or deleted", async (t) => {
  const f = await fixture(t);
  await mkdir(f.outputDirectory);
  await writeFile(join(f.outputDirectory, "keep.txt"), "previous evidence");
  await assert.rejects(partitionBrowserArtifacts(f), /output already exists/);
  assert.equal(await readFile(join(f.outputDirectory, "keep.txt"), "utf8"), "previous evidence");
});

test("symlink files, directories, source roots and output ancestors are rejected", async (t) => {
  for (const kind of ["file", "directory", "root", "output-ancestor"]) {
    const f = await fixture(t);
    const target = join(f.root, "outside");
    await mkdir(target);
    await writeFile(join(target, "secret.txt"), "not evidence");
    let options = f;
    if (kind === "file") await symlink(join(target, "secret.txt"), join(f.sourceDirectory, "escape.txt"));
    if (kind === "directory") await symlink(target, join(f.sourceDirectory, "escape-directory"), "dir");
    if (kind === "root") {
      await symlink(f.sourceDirectory, join(f.root, "source-link"), "dir");
      options = { ...f, sourceDirectory: join(f.root, "source-link") };
    }
    if (kind === "output-ancestor") {
      await symlink(target, join(f.root, "output-link"), "dir");
      options = { ...f, outputDirectory: join(f.root, "output-link", "parts") };
    }
    await assert.rejects(partitionBrowserArtifacts(options), /symbolic links are not allowed/, kind);
    assert.equal(await readFile(join(target, "secret.txt"), "utf8"), "not evidence");
    await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
  }
});

test("path traversal, overlapping roots and non-portable evidence names fail closed", async (t) => {
  const f = await fixture(t);
  await assert.rejects(partitionBrowserArtifacts({ ...f, outputDirectory: `${f.root}/unused/../escape` }), /parent traversal/);
  await assert.rejects(partitionBrowserArtifacts({ ...f, outputDirectory: f.sourceDirectory }), /non-overlapping/);
  await assert.rejects(partitionBrowserArtifacts({ ...f, outputDirectory: join(f.sourceDirectory, "parts") }), /non-overlapping/);
  await assert.rejects(partitionBrowserArtifacts({ ...f, outputDirectory: f.root }), /non-overlapping/);
  await f.put("bad\nname.json", "retained");
  await assert.rejects(partitionBrowserArtifacts(f), /unsafe or non-portable path component/);
  assert.equal(await readFile(join(f.sourceDirectory, "bad\nname.json"), "utf8"), "retained");
  await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
});

test("callers cannot raise the production byte or part ceilings", async (t) => {
  const f = await fixture(t);
  for (const maxPartBytes of [0, -1, 1.5, NaN, MAX_PART_BYTES + 1]) await assert.rejects(partitionBrowserArtifacts({ ...f, maxPartBytes }), /maxPartBytes/);
  for (const maxParts of [0, -1, 1.5, NaN, 9]) await assert.rejects(partitionBrowserArtifacts({ ...f, maxParts }), /maxParts/);
  await assert.rejects(partitionBrowserArtifacts({ ...f, maxPartBytes: 1 }), /complete manifest exceeds/);
  await assert.rejects(access(f.outputDirectory), { code: "ENOENT" });
});

test("CLI reports present parts only after success and never launches a browser", async (t) => {
  const f = await fixture(t);
  await f.put("summary.md", "failed browser review, complete evidence");
  const githubOutput = join(f.root, "github-output.txt");
  const result = spawnSync(process.execPath, [script], { cwd: f.root, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: githubOutput } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).fileCount, 1);
  assert.equal(await readFile(githubOutput, "utf8"), "part_01=true\npart_02=false\npart_03=false\npart_04=false\npart_05=false\npart_06=false\npart_07=false\npart_08=false\n");
  const failedOutput = join(f.root, "failed-output.txt");
  const failed = spawnSync(process.execPath, [script], { cwd: f.root, encoding: "utf8", env: { ...process.env, GITHUB_OUTPUT: failedOutput } });
  assert.equal(failed.status, 1);
  assert.match(failed.stderr, /output already exists/);
  await assert.rejects(access(failedOutput), { code: "ENOENT" });
  const helper = await readFile(script, "utf8");
  assert.ok(!/from\s+["'](?!node:)/.test(helper), "built-in Node imports only");
  assert.ok(!/child_process|playwright|chromium|fetch\(/.test(helper));
});

test("workflow preserves gates, action versions, static preview, and always-run complete evidence upload", async () => {
  const workflow = await readFile(join(repo, ".github/workflows/spatial-review.yml"), "utf8");
  const originalPath = join(repo, "local-integration/artifact-packaging/spatial-review.original.yml");
  let original;
  try { original = await readFile(originalPath, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const partition = workflow.indexOf("      - name: Partition complete browser evidence into bounded artifacts\n");
  const preview = workflow.indexOf("      - name: Preserve static preview build (no deployment)\n");
  assert.ok(partition > 0 && preview > partition);
  // Anchored to the verified f028888 workflow, including on, permissions,
  // timeout, every test/build/browser/summary step, and the static preview.
  assert.equal(sha256(workflow.slice(0, partition)), "d12bc52ce16a58732075327a75246dda19d5d08904ff2fc57968179a413c41d6");
  assert.equal(sha256(workflow.slice(preview)), "565561d495b225dafbc94a491af681d3f0656bb75cf0d69e841f4f61be233eaa");
  if (original) {
    const upload = original.indexOf("      - name: Preserve screenshots and diagnostics\n");
    const originalPreview = original.indexOf("      - name: Preserve static preview build (no deployment)\n");
    assert.equal(workflow.slice(0, partition), original.slice(0, upload));
    assert.equal(workflow.slice(preview), original.slice(originalPreview));
  }
  const block = workflow.slice(partition, preview);
  assert.match(block, /if: always\(\)\n        id: partition_browser_artifacts/);
  assert.match(block, /run: node scripts\/partition-browser-artifacts\.mjs/);
  assert.equal((block.match(/uses: actions\/upload-artifact@v4/g) ?? []).length, 8);
  for (let index = 1; index <= 8; index += 1) {
    const part = String(index).padStart(2, "0");
    assert.ok(block.includes(`if: always() && steps.partition_browser_artifacts.outcome == 'success' && steps.partition_browser_artifacts.outputs.part_${part} == 'true'`));
    assert.ok(block.includes(`name: spatial-browser-review-\${{ github.run_id }}-\${{ github.run_attempt }}-part-${part}`));
    assert.ok(block.includes(`path: spatial-prototype/browser-artifact-parts/${part}/`));
  }
  assert.equal((block.match(/retention-days: 14/g) ?? []).length, 8);
  assert.equal((block.match(/include-hidden-files: true/g) ?? []).length, 8);
  assert.equal((block.match(/if-no-files-found: error/g) ?? []).length, 8);
  assert.ok(!/continue-on-error|timeout-minutes:/.test(block));
});
