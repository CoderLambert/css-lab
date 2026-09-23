#!/usr/bin/env node

import { lstat, readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const repoRoot = process.cwd();
const courseRoot = join(
  repoRoot,
  "content",
  "courses",
  "css-foundations",
);
const registryPath = join(
  repoRoot,
  "src",
  "features",
  "learning",
  "generated",
  "lesson-content-registry.tsx",
);

const expectedPublishedExerciseIds = new Set([
  "css.flexbox.alignment.center-box.001",
  "css.flexbox.alignment.space-between-items.001",
  "css.flexbox.alignment.align-items-end.001",
]);

const expectedWorkspaceFiles = [
  { path: "index.html", language: "html", editable: false },
  { path: "base.css", language: "css", editable: false },
  { path: "style.css", language: "css", editable: true },
];

const legacyExerciseFiles = new Set([
  "fixture.html",
  "base.css",
  "starter.css",
  "solution.css",
]);

function fail(errors, code, location, message) {
  errors.push({ code, location, message });
}

async function statRegularFile(path, errors, code) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      fail(errors, code, relative(repoRoot, path), "Expected a regular non-symlink file.");
      return false;
    }
    return true;
  } catch (error) {
    fail(
      errors,
      code,
      relative(repoRoot, path),
      error instanceof Error ? error.message : String(error),
    );
    return false;
  }
}

async function listRealDirectories(path, errors, code) {
  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch (error) {
    fail(
      errors,
      code,
      relative(repoRoot, path),
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }

  const directories = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      fail(
        errors,
        "content-symlink",
        relative(repoRoot, join(path, entry.name)),
        "Content tree must not contain symlink descendants.",
      );
      continue;
    }
    if (entry.isDirectory()) directories.push(entry.name);
  }
  return directories.toSorted();
}

async function readJson(path, errors, code) {
  if (!(await statRegularFile(path, errors, code))) return null;
  try {
    const source = await readFile(path, "utf8");
    const value = JSON.parse(source);
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("JSON root must be an object.");
    }
    return value;
  } catch (error) {
    fail(
      errors,
      code,
      relative(repoRoot, path),
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}

function registerId(errors, stableIds, id, location) {
  if (typeof id !== "string" || id.trim().length === 0) {
    fail(errors, "invalid-stable-id", location, "Stable id must be a non-empty string.");
    return;
  }
  const existing = stableIds.get(id);
  if (existing) {
    fail(
      errors,
      "duplicate-stable-id",
      location,
      `Stable id already used at ${existing}.`,
    );
    return;
  }
  stableIds.set(id, location);
}

function sameWorkspaceFiles(files) {
  return (
    Array.isArray(files) &&
    files.length === expectedWorkspaceFiles.length &&
    files.every((file, index) => {
      const expected = expectedWorkspaceFiles[index];
      return (
        file &&
        typeof file === "object" &&
        !Array.isArray(file) &&
        file.path === expected.path &&
        file.language === expected.language &&
        file.editable === expected.editable
      );
    })
  );
}

async function auditExercise({
  errors,
  warnings,
  stableIds,
  moduleSlug,
  lessonSlug,
  exerciseSlug,
  exerciseRoot,
}) {
  const location = `css-foundations/${moduleSlug}/${lessonSlug}/${exerciseSlug}`;
  const record = await readJson(
    join(exerciseRoot, "exercise.json"),
    errors,
    "invalid-exercise-json",
  );
  if (!record) return null;

  registerId(errors, stableIds, record.id, location);

  if (record.slug !== exerciseSlug) {
    fail(errors, "exercise-slug-mismatch", location, "Exercise slug must match directory.");
  }
  if (record.schemaVersion !== 2) {
    fail(errors, "exercise-not-v2", location, "Every M6B Exercise must use schemaVersion 2.");
  }
  if (!Number.isInteger(record.revision) || record.revision <= 0) {
    fail(errors, "invalid-exercise-revision", location, "Exercise revision must be a positive integer.");
  }
  if (!sameWorkspaceFiles(record.workspace?.files)) {
    fail(
      errors,
      "unexpected-workspace-contract",
      location,
      "CSS Foundations v1 must use locked index.html/base.css plus editable style.css in declaration order.",
    );
  }
  if (record.runtime?.type !== "browser" || record.runtime?.entry !== "index.html") {
    fail(
      errors,
      "unexpected-runtime-contract",
      location,
      "CSS Foundations v1 must use Browser runtime entry index.html.",
    );
  }

  if (!Array.isArray(record.checks)) {
    fail(errors, "invalid-checks", location, "Exercise checks must be an array.");
  } else if (record.checks.length === 0) {
    if (record.status === "published") {
      fail(
        errors,
        "published-exercise-without-checks",
        location,
        "Published Exercise must have checker rules.",
      );
    } else {
      warnings.push({
        code: "exercise-without-checks",
        location,
        id: record.id,
        status: record.status,
      });
    }
  }

  const exerciseEntries = await readdir(exerciseRoot, { withFileTypes: true });
  for (const entry of exerciseEntries) {
    if (entry.isSymbolicLink()) {
      fail(
        errors,
        "exercise-source-symlink",
        relative(repoRoot, join(exerciseRoot, entry.name)),
        "Exercise source must not contain symlinks.",
      );
    }
    if (legacyExerciseFiles.has(entry.name)) {
      fail(
        errors,
        "legacy-exercise-asset",
        relative(repoRoot, join(exerciseRoot, entry.name)),
        "Legacy Exercise asset layout is forbidden after M6B migration.",
      );
    }
  }

  const starterRoot = join(exerciseRoot, "starter");
  const solutionRoot = join(exerciseRoot, "solution");
  const required = [
    join(starterRoot, "index.html"),
    join(starterRoot, "base.css"),
    join(starterRoot, "style.css"),
    join(solutionRoot, "style.css"),
  ];
  for (const path of required) {
    await statRegularFile(path, errors, "missing-or-unsafe-exercise-asset");
  }

  const starterEntries = await readdir(starterRoot, { withFileTypes: true });
  const starterFiles = starterEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .toSorted();
  if (JSON.stringify(starterFiles) !== JSON.stringify(["base.css", "index.html", "style.css"])) {
    fail(
      errors,
      "unexpected-starter-files",
      location,
      `Starter files must be exactly base.css/index.html/style.css; found ${starterFiles.join(", ")}.`,
    );
  }

  const solutionEntries = await readdir(solutionRoot, { withFileTypes: true });
  const solutionFiles = solutionEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .toSorted();
  if (JSON.stringify(solutionFiles) !== JSON.stringify(["style.css"])) {
    fail(
      errors,
      "unexpected-solution-files",
      location,
      `Solution files must equal editable workspace paths; found ${solutionFiles.join(", ")}.`,
    );
  }

  return record;
}

export async function auditM6BRebaseline() {
  const errors = [];
  const warnings = [];
  const stableIds = new Map();
  const lessonKeys = new Set();

  const course = await readJson(
    join(courseRoot, "course.json"),
    errors,
    "invalid-course-json",
  );
  if (course) registerId(errors, stableIds, course.id, "css-foundations");

  const counts = {
    courses: course ? 1 : 0,
    modules: 0,
    lessons: 0,
    exercises: 0,
    publishedLessons: 0,
    draftLessons: 0,
    publishedExercises: 0,
    draftExercises: 0,
  };

  const publishedExerciseIds = new Set();
  const revisions = {};

  const modulesRoot = join(courseRoot, "modules");
  const moduleSlugs = await listRealDirectories(
    modulesRoot,
    errors,
    "modules-read-failed",
  );

  for (const moduleSlug of moduleSlugs) {
    counts.modules += 1;
    const moduleRoot = join(modulesRoot, moduleSlug);
    const moduleRecord = await readJson(
      join(moduleRoot, "module.json"),
      errors,
      "invalid-module-json",
    );
    if (moduleRecord) {
      registerId(errors, stableIds, moduleRecord.id, `css-foundations/${moduleSlug}`);
      if (moduleRecord.slug !== moduleSlug) {
        fail(errors, "module-slug-mismatch", moduleSlug, "Module slug must match directory.");
      }
    }

    const lessonsRoot = join(moduleRoot, "lessons");
    const lessonSlugs = await listRealDirectories(
      lessonsRoot,
      errors,
      "lessons-read-failed",
    );

    for (const lessonSlug of lessonSlugs) {
      counts.lessons += 1;
      const lessonRoot = join(lessonsRoot, lessonSlug);
      const location = `css-foundations/${moduleSlug}/${lessonSlug}`;
      const lesson = await readJson(
        join(lessonRoot, "lesson.json"),
        errors,
        "invalid-lesson-json",
      );
      if (lesson) {
        registerId(errors, stableIds, lesson.id, location);
        if (lesson.slug !== lessonSlug) {
          fail(errors, "lesson-slug-mismatch", location, "Lesson slug must match directory.");
        }
        if (lesson.status === "published") counts.publishedLessons += 1;
        else if (lesson.status === "draft") counts.draftLessons += 1;
        else fail(errors, "invalid-lesson-status", location, "Lesson status must be draft or published.");
      }

      const mdxPath = join(lessonRoot, "lesson.mdx");
      if (await statRegularFile(mdxPath, errors, "missing-or-unsafe-lesson-mdx")) {
        const mdx = await readFile(mdxPath, "utf8");
        if (mdx.trim().length === 0) {
          fail(errors, "empty-lesson-mdx", location, "Lesson MDX must not be empty.");
        }
      }
      lessonKeys.add(location);

      const exercisesRoot = join(lessonRoot, "exercises");
      const exerciseSlugs = await listRealDirectories(
        exercisesRoot,
        errors,
        "exercises-read-failed",
      );

      for (const exerciseSlug of exerciseSlugs) {
        counts.exercises += 1;
        const record = await auditExercise({
          errors,
          warnings,
          stableIds,
          moduleSlug,
          lessonSlug,
          exerciseSlug,
          exerciseRoot: join(exercisesRoot, exerciseSlug),
        });
        if (!record) continue;

        revisions[record.id] = record.revision;
        if (record.status === "published") {
          counts.publishedExercises += 1;
          publishedExerciseIds.add(record.id);
        } else if (record.status === "draft") {
          counts.draftExercises += 1;
        } else {
          fail(
            errors,
            "invalid-exercise-status",
            `css-foundations/${moduleSlug}/${lessonSlug}/${exerciseSlug}`,
            "Exercise status must be draft or published.",
          );
        }
      }
    }
  }

  const expectedCounts = {
    courses: 1,
    modules: 9,
    lessons: 32,
    exercises: 100,
    publishedLessons: 1,
    draftLessons: 31,
    publishedExercises: 3,
    draftExercises: 97,
  };
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (counts[key] !== expected) {
      fail(
        errors,
        "unexpected-content-count",
        "content/courses/css-foundations",
        `${key}: expected ${expected}, found ${counts[key]}.`,
      );
    }
  }

  if (
    publishedExerciseIds.size !== expectedPublishedExerciseIds.size ||
    [...publishedExerciseIds].some((id) => !expectedPublishedExerciseIds.has(id))
  ) {
    fail(
      errors,
      "published-exercise-set-drift",
      "content/courses/css-foundations",
      `Published Exercise stable IDs differ: ${[...publishedExerciseIds].toSorted().join(", ")}.`,
    );
  }

  for (const [id, expectedRevision] of [
    ["css.flexbox.alignment.center-box.001", 1],
    ["css.flexbox.alignment.space-between-items.001", 1],
    ["css.flexbox.alignment.align-items-end.001", 2],
  ]) {
    if (revisions[id] !== expectedRevision) {
      fail(
        errors,
        "published-revision-drift",
        id,
        `Expected revision ${expectedRevision}, found ${String(revisions[id])}.`,
      );
    }
  }

  if (await statRegularFile(registryPath, errors, "missing-generated-registry")) {
    const registry = await readFile(registryPath, "utf8");
    const registryKeys = new Set(
      [...registry.matchAll(/case "([^"]+)":/g)].map((match) => match[1]),
    );
    const missing = [...lessonKeys].filter((key) => !registryKeys.has(key));
    const extra = [...registryKeys].filter((key) => !lessonKeys.has(key));
    if (missing.length > 0 || extra.length > 0) {
      fail(
        errors,
        "generated-registry-coverage",
        relative(repoRoot, registryPath),
        `missing=[${missing.join(", ")}], extra=[${extra.join(", ")}]`,
      );
    }
  }

  return {
    schemaVersion: 1,
    counts,
    warningCount: warnings.length,
    warnings,
    errors,
    contracts: {
      exerciseSchema: "v2-only",
      workspace: "locked index.html/base.css + editable style.css",
      runtime: "browser:index.html",
      legacyExerciseAssets: 0,
      publishedExerciseIds: [...publishedExerciseIds].toSorted(),
      publishedRevisions: {
        centerBox: revisions["css.flexbox.alignment.center-box.001"],
        spaceBetweenItems:
          revisions["css.flexbox.alignment.space-between-items.001"],
        alignItemsEnd:
          revisions["css.flexbox.alignment.align-items-end.001"],
      },
      generatedRegistryLessons: lessonKeys.size,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await auditM6BRebaseline();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length > 0) process.exitCode = 1;
}
