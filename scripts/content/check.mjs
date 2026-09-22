import { compile } from "@mdx-js/mdx";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

import { readLessonManifest } from "./lesson-manifest.mjs";
import { createLessonRegistrySource } from "./lesson-registry-source.mjs";
import { remarkCollectExerciseReferences } from "../mdx/remark-collect-exercise-references.mjs";
import { remarkLessonContract } from "../mdx/remark-lesson-contract.mjs";

const projectRoot = process.cwd();
const coursesRoot = join(projectRoot, "content", "courses");
const generatedRegistryPath = join(
  projectRoot,
  "src",
  "features",
  "learning",
  "generated",
  "lesson-content-registry.tsx",
);

function lessonPath(entry) {
  return join(
    coursesRoot,
    entry.courseSlug,
    "modules",
    entry.moduleSlug,
    "lessons",
    entry.lessonSlug,
  );
}

function formatError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function fileExists(filePath) {
  try {
    return (await stat(filePath)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}

async function checkGeneratedRegistry(manifest, failures) {
  const expectedSource = createLessonRegistrySource(manifest);

  try {
    const actualSource = await readFile(generatedRegistryPath, "utf8");

    if (actualSource !== expectedSource) {
      failures.push(
        "Generated lesson registry is stale.\nRun: pnpm content:generate",
      );
    }
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      failures.push(
        "Generated lesson registry is missing.\nRun: pnpm content:generate",
      );
      return;
    }

    throw error;
  }
}

async function checkLesson(entry, failures) {
  const directoryPath = lessonPath(entry);
  const sourcePath = join(directoryPath, "lesson.mdx");
  const source = await readFile(sourcePath, "utf8");
  let compiled;

  try {
    compiled = await compile(
      { path: sourcePath, value: source },
      {
        remarkPlugins: [remarkLessonContract, remarkCollectExerciseReferences],
      },
    );
  } catch (error) {
    failures.push(`${entry.key}: ${formatError(error)}`);
    return;
  }

  const references = compiled.data.lessonExerciseReferences ?? [];

  for (const reference of references) {
    const exercisePath = join(
      directoryPath,
      "exercises",
      reference.slug,
      "exercise.json",
    );

    if (await fileExists(exercisePath)) {
      continue;
    }

    const position = reference.position?.start;
    const positionSuffix = position
      ? `:${position.line}:${position.column}`
      : "";

    failures.push(
      [
        "Unknown Exercise reference:",
        `lesson: ${entry.key}`,
        `slug: ${reference.slug}`,
        `expected: ${exercisePath}${positionSuffix}`,
      ].join("\n"),
    );
  }
}

export async function checkContent() {
  const failures = [];
  const manifest = await readLessonManifest({ coursesRoot });

  await checkGeneratedRegistry(manifest, failures);

  for (const entry of manifest) {
    await checkLesson(entry, failures);
  }

  if (failures.length > 0) {
    throw new Error(failures.join("\n\n"));
  }

  return { lessonCount: manifest.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const result = await checkContent();
    console.log(`Content check passed: ${result.lessonCount} lesson(s).`);
  } catch (error) {
    console.error(formatError(error));
    process.exitCode = 1;
  }
}
