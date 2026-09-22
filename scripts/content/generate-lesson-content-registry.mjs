import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { readLessonManifest } from "./lesson-manifest.mjs";
import { createLessonRegistrySource } from "./lesson-registry-source.mjs";

const targetPath = join(
  process.cwd(),
  "src",
  "features",
  "learning",
  "generated",
  "lesson-content-registry.tsx",
);

export async function generateLessonContentRegistry() {
  const manifest = await readLessonManifest();
  const source = createLessonRegistrySource(manifest);

  let existingSource = null;

  try {
    existingSource = await readFile(targetPath, "utf8");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }

  if (existingSource === source) {
    return false;
  }

  await mkdir(dirname(targetPath), { recursive: true });
  await writeFile(targetPath, source, "utf8");
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const changed = await generateLessonContentRegistry();
    console.log(
      changed
        ? `Generated ${targetPath}`
        : `Generated registry is already up to date: ${targetPath}`,
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
