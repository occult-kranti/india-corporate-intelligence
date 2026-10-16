import { access, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
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
    return (await import(pathToFileURL(local).href)).INVESTIGATION_REGISTRY;
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
    return (
      await import(pathToFileURL(outfile).href)
    ).getInvestigationRegistry();
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}
