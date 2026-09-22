import { expect, test } from "@playwright/test";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const path = join(root, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(path)));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

test("learner-facing source graph does not import solution inspection", async () => {
  const roots = [
    join(process.cwd(), "src", "app", "learn"),
    join(process.cwd(), "src", "features", "learning"),
    join(process.cwd(), "src", "features", "exercise"),
  ];

  const files = (await Promise.all(roots.map(sourceFiles))).flat();

  for (const path of files) {
    const source = await readFile(path, "utf8");

    expect(source, path).not.toMatch(
      /file-exercise-source-inspector|ExerciseSourceInspector|solutionFiles/,
    );
    expect(source, path).not.toMatch(
      /workspace\.solution|exercise\.solution/,
    );
  }
});

test("learner Exercise domain has no solution field", async () => {
  const source = await readFile(
    join(process.cwd(), "src", "lib", "content", "types.ts"),
    "utf8",
  );

  const exerciseStart = source.indexOf("export interface Exercise {");
  expect(exerciseStart).toBeGreaterThanOrEqual(0);

  const exerciseSource = source.slice(exerciseStart);
  expect(exerciseSource).not.toMatch(/\bsolution\b/);
  expect(exerciseSource).not.toMatch(/solutionFiles/);
});
