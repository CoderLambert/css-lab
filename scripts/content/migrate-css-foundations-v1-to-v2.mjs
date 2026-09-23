#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  lstat,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const LEGACY_FILE_NAMES = [
  "exercise.json",
  "fixture.html",
  "base.css",
  "starter.css",
  "solution.css",
];

const STATUS_VALUES = new Set(["draft", "published"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LEGACY_RECORD_FIELDS = new Set([
  "schemaVersion",
  "id",
  "revision",
  "slug",
  "title",
  "prompt",
  "order",
  "status",
  "hints",
  "checks",
]);

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected positional argument: ${token}`);
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function requireString(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required option --${key}.`);
  }
  return value.trim();
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function assertInside(base, candidate, label) {
  const root = resolve(base);
  const target = resolve(candidate);
  if (target !== root && !target.startsWith(`${root}${sep}`)) {
    throw new Error(`${label} escapes root: ${candidate}`);
  }
}

async function assertDirectory(path, label) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error(`${label} must be a real directory: ${path}`);
  }
}

async function readRegularTextFile(path, label) {
  const stat = await lstat(path);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error(`${label} must be a regular non-symlink file: ${path}`);
  }
  return readFile(path, "utf8");
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertPositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function validateCheck(check, index) {
  if (!check || typeof check !== "object" || Array.isArray(check)) {
    throw new Error(`check[${index}] must be an object.`);
  }
  assertNonEmptyString(check.id, `check[${index}].id`);
  assertNonEmptyString(check.message, `check[${index}].message`);

  if (check.type === "style") {
    const allowed = new Set(["id", "type", "selector", "property", "equals", "alsoAccepts", "message"]);
    for (const key of Object.keys(check)) {
      if (!allowed.has(key)) throw new Error(`Unsupported style check field "${key}".`);
    }
    assertNonEmptyString(check.selector, `check[${index}].selector`);
    assertNonEmptyString(check.property, `check[${index}].property`);
    assertNonEmptyString(check.equals, `check[${index}].equals`);
    if (check.alsoAccepts !== undefined) {
      if (!Array.isArray(check.alsoAccepts) || check.alsoAccepts.some((value) => typeof value !== "string" || value.trim().length === 0)) {
        throw new Error(`check[${index}].alsoAccepts must contain non-empty strings.`);
      }
    }
    return;
  }

  if (check.type === "exists") {
    const allowed = new Set(["id", "type", "selector", "message"]);
    for (const key of Object.keys(check)) {
      if (!allowed.has(key)) throw new Error(`Unsupported exists check field "${key}".`);
    }
    assertNonEmptyString(check.selector, `check[${index}].selector`);
    return;
  }

  if (check.type === "count") {
    const allowed = new Set(["id", "type", "selector", "equals", "message"]);
    for (const key of Object.keys(check)) {
      if (!allowed.has(key)) throw new Error(`Unsupported count check field "${key}".`);
    }
    assertNonEmptyString(check.selector, `check[${index}].selector`);
    if (!Number.isInteger(check.equals) || check.equals < 0) {
      throw new Error(`check[${index}].equals must be a non-negative integer.`);
    }
    return;
  }

  throw new Error(`Unsupported check type "${String(check.type)}".`);
}

export function validateLegacyExerciseRecord(record, sourcePath, expectedSlug) {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    throw new Error(`Legacy Exercise metadata must be an object: ${sourcePath}`);
  }
  for (const key of Object.keys(record)) {
    if (!LEGACY_RECORD_FIELDS.has(key)) {
      throw new Error(`Unsupported legacy Exercise field "${key}" at ${sourcePath}.`);
    }
  }
  if (record.schemaVersion !== 1) {
    throw new Error(`Legacy Exercise schemaVersion must be 1: ${sourcePath}`);
  }
  assertNonEmptyString(record.id, "Exercise id");
  assertPositiveInteger(record.revision, "Exercise revision");
  assertNonEmptyString(record.slug, "Exercise slug");
  if (!SLUG_PATTERN.test(record.slug) || record.slug !== expectedSlug) {
    throw new Error(`Exercise slug must match directory "${expectedSlug}": ${sourcePath}`);
  }
  assertNonEmptyString(record.title, "Exercise title");
  assertNonEmptyString(record.prompt, "Exercise prompt");
  assertPositiveInteger(record.order, "Exercise order");
  if (!STATUS_VALUES.has(record.status)) {
    throw new Error(`Exercise status must be draft or published: ${sourcePath}`);
  }
  if (!Array.isArray(record.hints) || record.hints.some((hint) => typeof hint !== "string" || hint.trim().length === 0)) {
    throw new Error(`Exercise hints must contain non-empty strings: ${sourcePath}`);
  }
  if (!Array.isArray(record.checks)) {
    throw new Error(`Exercise checks must be an array: ${sourcePath}`);
  }
  record.checks.forEach(validateCheck);
  return record;
}

export function toExerciseV2Record(record) {
  return {
    schemaVersion: 2,
    id: record.id,
    revision: record.revision,
    slug: record.slug,
    title: record.title,
    prompt: record.prompt,
    order: record.order,
    status: record.status,
    hints: record.hints,
    checks: record.checks,
    workspace: {
      files: [
        { path: "index.html", language: "html", editable: false },
        { path: "base.css", language: "css", editable: false },
        { path: "style.css", language: "css", editable: true },
      ],
    },
    runtime: { type: "browser", entry: "index.html" },
  };
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function readLegacyExercise(sourceExerciseDir) {
  await assertDirectory(sourceExerciseDir, "Legacy Exercise directory");
  const entries = await readdir(sourceExerciseDir, { withFileTypes: true });
  const names = entries.map((entry) => entry.name).sort();
  const expected = [...LEGACY_FILE_NAMES].sort();
  const unexpected = names.filter((name) => !expected.includes(name));
  const missing = expected.filter((name) => !names.includes(name));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new Error(
      `Legacy Exercise asset set mismatch at ${sourceExerciseDir}; missing=[${missing.join(",")}], unexpected=[${unexpected.join(",")}].`,
    );
  }

  const sources = {};
  for (const fileName of LEGACY_FILE_NAMES) {
    sources[fileName] = await readRegularTextFile(
      join(sourceExerciseDir, fileName),
      `Legacy asset ${fileName}`,
    );
  }

  let record;
  try {
    record = JSON.parse(sources["exercise.json"]);
  } catch (error) {
    throw new Error(`Invalid legacy Exercise JSON: ${join(sourceExerciseDir, "exercise.json")}`, { cause: error });
  }
  validateLegacyExerciseRecord(
    record,
    join(sourceExerciseDir, "exercise.json"),
    basename(sourceExerciseDir),
  );

  return {
    record,
    sources,
    hashes: Object.fromEntries(
      LEGACY_FILE_NAMES.map((fileName) => [fileName, sha256(sources[fileName])]),
    ),
  };
}

async function inspectTarget(targetExerciseDir, sourceId) {
  if (!(await pathExists(targetExerciseDir))) return { state: "absent" };

  const stat = await lstat(targetExerciseDir);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    return { state: "partial", reason: "target path is not a real directory" };
  }

  const metadataPath = join(targetExerciseDir, "exercise.json");
  if (!(await pathExists(metadataPath))) {
    return { state: "partial", reason: "target directory exists without exercise.json" };
  }

  try {
    const metadataSource = await readRegularTextFile(metadataPath, "Target exercise.json");
    const metadata = JSON.parse(metadataSource);
    if (metadata.id === sourceId) {
      return { state: "overlap", status: metadata.status ?? null, revision: metadata.revision ?? null };
    }
    return { state: "partial", reason: `target stable id differs: ${String(metadata.id)}` };
  } catch (error) {
    return { state: "partial", reason: error.message };
  }
}

async function writeMigratedExercise(targetExerciseDir, record, sources) {
  await mkdir(dirname(targetExerciseDir), { recursive: true });
  if (await pathExists(targetExerciseDir)) {
    throw new Error(`Refusing to overwrite target Exercise: ${targetExerciseDir}`);
  }

  await mkdir(targetExerciseDir);
  try {
    await mkdir(join(targetExerciseDir, "starter"));
    await mkdir(join(targetExerciseDir, "solution"));
    await Promise.all([
      writeFile(join(targetExerciseDir, "exercise.json"), `${JSON.stringify(record, null, 2)}\n`, "utf8"),
      writeFile(join(targetExerciseDir, "starter", "index.html"), sources["fixture.html"], "utf8"),
      writeFile(join(targetExerciseDir, "starter", "base.css"), sources["base.css"], "utf8"),
      writeFile(join(targetExerciseDir, "starter", "style.css"), sources["starter.css"], "utf8"),
      writeFile(join(targetExerciseDir, "solution", "style.css"), sources["solution.css"], "utf8"),
    ]);
  } catch (error) {
    await rm(targetExerciseDir, { recursive: true, force: true });
    throw error;
  }
}

async function discoverLegacyExerciseDirectories(root) {
  await assertDirectory(root, "Source root");
  const output = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const names = new Set(entries.map((entry) => entry.name));
    if (names.has("exercise.json")) {
      output.push(directory);
      return;
    }
    if (entries.some((entry) => entry.isSymbolicLink())) {
      throw new Error(`Source tree contains a symlink outside an Exercise directory: ${directory}`);
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(directory, entry.name));
      } else if (!entry.isFile()) {
        throw new Error(`Source tree contains a non-regular entry: ${join(directory, entry.name)}`);
      }
    }
  }

  await walk(root);
  return output.sort();
}

export async function migrateCssFoundationsV1ToV2({
  sourceRoot,
  targetRoot,
  dryRun = false,
  overlapPolicy = "reject",
}) {
  const source = resolve(sourceRoot);
  const target = resolve(targetRoot);
  if (source === target) {
    throw new Error("sourceRoot and targetRoot must be different; in-place migration is intentionally unsupported.");
  }
  if (!["reject", "skip"].includes(overlapPolicy)) {
    throw new Error('overlapPolicy must be "reject" or "skip".');
  }

  const exerciseDirs = await discoverLegacyExerciseDirectories(source);
  const summary = {
    schemaVersion: 1,
    sourceRoot: source,
    targetRoot: target,
    dryRun,
    overlapPolicy,
    exercisesDiscovered: exerciseDirs.length,
    wouldMigrate: 0,
    migrated: 0,
    skippedOverlap: [],
    rejected: [],
    exercises: [],
  };

  for (const sourceExerciseDir of exerciseDirs) {
    const relativePath = relative(source, sourceExerciseDir);
    const targetExerciseDir = join(target, relativePath);
    assertInside(source, sourceExerciseDir, "Source Exercise path");
    assertInside(target, targetExerciseDir, "Target Exercise path");

    try {
      const legacy = await readLegacyExercise(sourceExerciseDir);
      const targetState = await inspectTarget(targetExerciseDir, legacy.record.id);
      const exerciseSummary = {
        id: legacy.record.id,
        slug: legacy.record.slug,
        order: legacy.record.order,
        status: legacy.record.status,
        revision: legacy.record.revision,
        checkCount: legacy.record.checks.length,
        relativePath,
        sourceHashes: legacy.hashes,
      };

      if (targetState.state === "overlap") {
        if (overlapPolicy === "skip") {
          summary.skippedOverlap.push({
            ...exerciseSummary,
            targetRevision: targetState.revision,
            targetStatus: targetState.status,
          });
          continue;
        }
        throw new Error(
          `Target overlap exists for stable id ${legacy.record.id} at ${targetExerciseDir}.`,
        );
      }
      if (targetState.state === "partial") {
        throw new Error(`Partial/unsafe target at ${targetExerciseDir}: ${targetState.reason}`);
      }

      const v2 = toExerciseV2Record(legacy.record);
      summary.wouldMigrate += 1;
      summary.exercises.push(exerciseSummary);
      if (!dryRun) {
        await writeMigratedExercise(targetExerciseDir, v2, legacy.sources);
        summary.migrated += 1;
      }
    } catch (error) {
      summary.rejected.push({
        relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return summary;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await migrateCssFoundationsV1ToV2({
    sourceRoot: requireString(options, "source-root"),
    targetRoot: requireString(options, "target-root"),
    dryRun: options["dry-run"] === true,
    overlapPolicy:
      typeof options["overlap-policy"] === "string"
        ? options["overlap-policy"]
        : "reject",
  });
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (summary.rejected.length > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
