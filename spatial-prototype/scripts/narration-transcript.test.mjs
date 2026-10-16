import test, { after } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const dir = await mkdtemp(join(tmpdir(), "narration-qualification-"));
after(() => rm(dir, { recursive: true, force: true }));
const output = join(dir, "transcript.mjs");
await build({
  entryPoints: ["src/narrationTranscript.ts"],
  outfile: output,
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { buildNarrationTranscript } = await import(pathToFileURL(output));
const item = {
  title: "Retained response",
  summary: "Source summary",
  tier: "self-reported",
  status: "not-drawn",
  statusAsOf: null,
  dateBasis: "Historical source window",
  sourceIds: ["a", "a", "b"],
  amounts: [
    {
      currency: "INR",
      value: 10,
      unit: "crore",
      stage: "authorised, not paid",
      period: "FY2025",
    },
  ],
  response: "Recorded denial",
  alternativeExplanations: ["Other explanation"],
  falsifier: "Evidence needed to change assessment",
  limitations: ["No wrongdoing inference"],
};
test("manual narration leads with held context and retains status, date and accounting qualifiers", () => {
  const t = buildNarrationTranscript(item, true);
  assert.ok(t.startsWith("Held for review."));
  for (const text of [
    "excluded from the factual map",
    "self-reported",
    "not-drawn",
    "not established",
    "Historical source window",
    "2 distinct retained source records",
    "INR 10 crore",
    "authorised, not paid",
    "FY2025",
    "Recorded denial",
    "Other explanation",
    "Evidence needed to change assessment",
    "No wrongdoing inference",
  ])
    assert.ok(t.includes(text), text);
});
test("non-held narration does not invent a held status or source date", () => {
  const entity = {
    label: "Source identity",
    summary: "Identity context",
    sourceIds: ["a"],
    limitations: ["Only source-bound identity"],
  };
  const t = buildNarrationTranscript(entity);
  assert.ok(!t.includes("Held for review"));
  assert.ok(!t.includes("Status as of"));
  assert.ok(t.includes("1 distinct retained source records"));
});
