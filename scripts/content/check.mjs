import { compile } from "@mdx-js/mdx";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { readLessonManifest } from "./lesson-manifest.mjs";
import { createLessonRegistrySource } from "./lesson-registry-source.mjs";
import { assertDirectorySlug, readEntityMetadata } from "./content-json.mjs";
import { remarkCollectExerciseReferences } from "../mdx/remark-collect-exercise-references.mjs";
import { remarkLessonContract } from "../mdx/remark-lesson-contract.mjs";

const defaultProjectRoot = process.cwd();
const defaultCoursesRoot = join(defaultProjectRoot, "content", "courses");
const defaultGeneratedRegistryPath = join(
  defaultProjectRoot,
  "src",
  "features",
  "learning",
  "generated",
  "lesson-content-registry.tsx",
);

function lessonPath(coursesRoot, entry) {
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

function formatReferenceLocation(sourcePath, reference) {
  const position = reference.position?.start;

  return position
    ? `${sourcePath}:${position.line}:${position.column}`
    : sourcePath;
}

function formatReferencePathWithPosition(path, sourcePath, reference) {
  const position = reference.position?.start;

  return position
    ? `${path}:${position.line}:${position.column} (reference: ${sourcePath})`
    : path;
}

function arraysEqual(left, right) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

async function checkGeneratedRegistry(
  manifest,
  failures,
  generatedRegistryPath,
) {
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

async function readLessonContext(coursesRoot, entry) {
  const courseRoot = join(coursesRoot, entry.courseSlug);
  const moduleRoot = join(courseRoot, "modules", entry.moduleSlug);
  const directoryPath = lessonPath(coursesRoot, entry);

  const courseMetadataPath = join(courseRoot, "course.json");
  const moduleMetadataPath = join(moduleRoot, "module.json");
  const lessonMetadataPath = join(directoryPath, "lesson.json");
  const course = await readEntityMetadata(courseMetadataPath, "Course");
  const moduleMetadata = await readEntityMetadata(moduleMetadataPath, "Module");
  const lesson = await readEntityMetadata(lessonMetadataPath, "Lesson");

  assertDirectorySlug(
    entry.courseSlug,
    course.slug,
    "Course",
    courseMetadataPath,
  );
  assertDirectorySlug(
    entry.moduleSlug,
    moduleMetadata.slug,
    "Module",
    moduleMetadataPath,
  );
  assertDirectorySlug(
    entry.lessonSlug,
    lesson.slug,
    "Lesson",
    lessonMetadataPath,
  );

  return {
    course,
    module: moduleMetadata,
    lesson,
  };
}

async function readExerciseRecords(directoryPath, failures, lessonKey) {
  const exercisesRoot = join(directoryPath, "exercises");
  let entries;

  try {
    entries = await readdir(exercisesRoot, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return new Map();
    }

    throw error;
  }

  const records = new Map();

  for (const entry of entries
    .filter((candidate) => candidate.isDirectory())
    .toSorted((left, right) => left.name.localeCompare(right.name))) {
    const metadataPath = join(exercisesRoot, entry.name, "exercise.json");

    try {
      const exercise = await readEntityMetadata(metadataPath, "Exercise", {
        includeOrder: true,
      });

      try {
        assertDirectorySlug(
          entry.name,
          exercise.slug,
          "Exercise",
          metadataPath,
        );
      } catch (error) {
        failures.push(`${lessonKey}: ${formatError(error)}`);
      }

      records.set(entry.name, exercise);
    } catch (error) {
      failures.push(`${lessonKey}: ${formatError(error)}`);
    }
  }

  return records;
}

function checkPublishedExerciseSequence(
  entry,
  context,
  references,
  exerciseRecords,
  failures,
) {
  const lessonVisible =
    context.course.status === "published" &&
    context.module.status === "published" &&
    context.lesson.status === "published";

  if (!lessonVisible) {
    return;
  }

  const publishedExercises = [...exerciseRecords.entries()]
    .filter(([, exercise]) => exercise.status === "published")
    .toSorted(([, left], [, right]) => left.order - right.order);
  const canonicalSlugs = publishedExercises.map(([slug]) => slug);
  const referencedPublishedSlugs = [];

  for (const reference of references) {
    const exercise = exerciseRecords.get(reference.slug);

    if (exercise?.status === "published") {
      referencedPublishedSlugs.push(reference.slug);
    }
  }

  const missingSlugs = canonicalSlugs.filter(
    (slug) => !referencedPublishedSlugs.includes(slug),
  );

  if (missingSlugs.length > 0) {
    failures.push(
      [
        "Missing published Exercise reference:",
        `lesson: ${entry.key}`,
        `slug(s): ${missingSlugs.join(", ")}`,
      ].join("\n"),
    );
  }

  const hasDuplicateReference = references.some(
    (reference, index) =>
      references.findIndex((candidate) => candidate.slug === reference.slug) !==
      index,
  );

  if (
    !hasDuplicateReference &&
    missingSlugs.length === 0 &&
    referencedPublishedSlugs.length === canonicalSlugs.length &&
    !arraysEqual(referencedPublishedSlugs, canonicalSlugs)
  ) {
    failures.push(
      [
        "Exercise reference order does not match learner sequence.",
        `lesson: ${entry.key}`,
        `expected: ${canonicalSlugs.join(" -> ")}`,
        `actual:   ${referencedPublishedSlugs.join(" -> ")}`,
      ].join("\n"),
    );
  }

  const duplicateOrders = new Set();
  let previousOrder = null;

  for (const [, exercise] of publishedExercises) {
    if (exercise.order === previousOrder) {
      duplicateOrders.add(exercise.order);
    }

    previousOrder = exercise.order;
  }

  for (const order of duplicateOrders) {
    const slugs = publishedExercises
      .filter(([, exercise]) => exercise.order === order)
      .map(([slug]) => slug);
    failures.push(
      [
        "Published Exercise order is ambiguous:",
        `lesson: ${entry.key}`,
        `order: ${order}`,
        `slugs: ${slugs.join(", ")}`,
      ].join("\n"),
    );
  }
}

async function checkLesson(entry, coursesRoot, failures) {
  const directoryPath = lessonPath(coursesRoot, entry);
  const sourcePath = join(directoryPath, "lesson.mdx");
  let context;

  try {
    context = await readLessonContext(coursesRoot, entry);
  } catch (error) {
    failures.push(`${entry.key}: ${formatError(error)}`);
    return;
  }

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
  const exerciseRecords = await readExerciseRecords(
    directoryPath,
    failures,
    entry.key,
  );
  const referencedSlugs = new Set();
  const lessonVisible =
    context.course.status === "published" &&
    context.module.status === "published" &&
    context.lesson.status === "published";

  for (const reference of references) {
    const firstReference = referencedSlugs.has(reference.slug)
      ? references.find((candidate) => candidate.slug === reference.slug)
      : null;

    if (firstReference) {
      failures.push(
        [
          "Duplicate Exercise reference:",
          `lesson: ${entry.key}`,
          `slug: ${reference.slug}`,
          `first: ${formatReferenceLocation(sourcePath, firstReference)}`,
          `duplicate: ${formatReferenceLocation(sourcePath, reference)}`,
        ].join("\n"),
      );
    } else {
      referencedSlugs.add(reference.slug);
    }

    const exercise = exerciseRecords.get(reference.slug);

    if (!exercise) {
      const exercisePath = join(
        directoryPath,
        "exercises",
        reference.slug,
        "exercise.json",
      );

      failures.push(
        [
          "Unknown Exercise reference:",
          `lesson: ${entry.key}`,
          `slug: ${reference.slug}`,
          `expected: ${formatReferencePathWithPosition(
            exercisePath,
            sourcePath,
            reference,
          )}`,
        ].join("\n"),
      );
      continue;
    }

    if (exercise.slug !== reference.slug) {
      failures.push(
        [
          "Exercise metadata slug mismatch:",
          `lesson: ${entry.key}`,
          `reference: ${reference.slug}`,
          `metadata: ${exercise.slug}`,
          `source: ${formatReferenceLocation(sourcePath, reference)}`,
        ].join("\n"),
      );
    }

    if (lessonVisible && exercise.status !== "published") {
      failures.push(
        [
          `Learner-visible lesson references non-published Exercise "${reference.slug}".`,
          `lesson: ${entry.key}`,
          `status: ${exercise.status}`,
          `source: ${formatReferenceLocation(sourcePath, reference)}`,
        ].join("\n"),
      );
    }
  }

  checkPublishedExerciseSequence(
    entry,
    context,
    references,
    exerciseRecords,
    failures,
  );
}

export async function checkContent({
  coursesRoot = defaultCoursesRoot,
  generatedRegistryPath = defaultGeneratedRegistryPath,
} = {}) {
  const failures = [];
  const manifest = await readLessonManifest({ coursesRoot });

  await checkGeneratedRegistry(manifest, failures, generatedRegistryPath);

  for (const entry of manifest) {
    await checkLesson(entry, coursesRoot, failures);
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
