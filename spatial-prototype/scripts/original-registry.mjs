import { access, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { createHash } from "node:crypto";
const RETAINED_CANONICAL_SHA256 = "048f89ffd008a498212ff2ac71d4413aef09b138a50ab77f336a23fec4722064";
function verifyRetainedRegistry(value) {
  const sha = createHash("sha256").update(JSON.stringify(value)).digest("hex");
  if (sha !== RETAINED_CANONICAL_SHA256) throw new Error("Retained reference registry integrity mismatch; never repin to a corrected display view");
  return value;
}
/** Read the exact parent application registry; never alter it. */
export async function loadOriginalRegistry() {
  const source = resolve(
    process.env.FIELDWORK_SOURCE_ROOT ?? "..",
    "src/data/investigation.ts",
  );
  try {
    await access(source);
  } catch {
    // Local extracted reference is intentionally excluded from the publication.
    const local = resolve("scripts/registry.bundle.mjs");
    await access(local);
    return verifyRetainedRegistry((await import(pathToFileURL(local).href)).INVESTIGATION_REGISTRY);
  }
  const temporary = await mkdtemp(join(tmpdir(), "fieldwork-original-"));
  try {
    const outfile = join(temporary, "registry.mjs");
    await build({
      entryPoints: [source],
      outfile,
      bundle: true,
      platform: "node",
      format: "esm",
      logLevel: "silent",
    });
    const api = await import(pathToFileURL(outfile).href);
    if (typeof api.buildRetainedInvestigationRegistry !== "function") throw new Error("Dedicated retained audit builder is required for snapshot packaging");
    return verifyRetainedRegistry(api.buildRetainedInvestigationRegistry());
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
