import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { expect, test } from "@playwright/test";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ExerciseRecordSchema } from "../src/lib/content/schemas/exercise";

const execFileAsync = promisify(execFile);

test("offline M6B migration output satisfies the production Exercise v2 schema", async () => {
  const root = await mkdtemp(join(tmpdir(), "css-lab-m6b-schema-"));

  try {
    const sourceRoot = join(root, "source");
    const targetRoot = join(root, "target");
    const exerciseRoot = join(
      sourceRoot,
      "modules",
      "flexbox",
      "lessons",
      "alignment",
      "exercises",
      "center-box",
    );

    await mkdir(exerciseRoot, { recursive: true });

    const metadata = {
      schemaVersion: 1,
      id: "css.flexbox.alignment.center-box.001",
      revision: 1,
      slug: "center-box",
      title: "Center box",
      prompt: "Center the box.",
      order: 1,
      status: "draft",
      hints: [],
      checks: [
        {
          id: "display-flex",
          type: "style",
          selector: ".container",
          property: "display",
          equals: "flex",
          message: "Use flex.",
        },
      ],
    };

    await writeFile(
      join(exerciseRoot, "exercise.json"),
      `${JSON.stringify(metadata, null, 2)}\n`,
      "utf8",
    );
    await Promise.all([
      writeFile(
        join(exerciseRoot, "fixture.html"),
        '<div class="container"></div>\n',
      ),
      writeFile(
        join(exerciseRoot, "base.css"),
        ".container { min-height: 10rem; }\n",
      ),
      writeFile(join(exerciseRoot, "starter.css"), ".container {}\n"),
      writeFile(
        join(exerciseRoot, "solution.css"),
        ".container { display: flex; }\n",
      ),
    ]);

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        join(
          process.cwd(),
          "scripts",
          "content",
          "migrate-css-foundations-v1-to-v2.mjs",
        ),
        "--source-root",
        sourceRoot,
        "--target-root",
        targetRoot,
      ],
      { cwd: process.cwd() },
    );

    expect(stderr).toBe("");
    const summary = JSON.parse(stdout) as {
      migrated: number;
      rejected: unknown[];
    };
    expect(summary.rejected).toEqual([]);
    expect(summary.migrated).toBe(1);

    const targetMetadata = JSON.parse(
      await readFile(
        join(
          targetRoot,
          "modules",
          "flexbox",
          "lessons",
          "alignment",
          "exercises",
          "center-box",
          "exercise.json",
        ),
        "utf8",
      ),
    );

    expect(ExerciseRecordSchema.safeParse(targetMetadata).success).toBe(true);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
