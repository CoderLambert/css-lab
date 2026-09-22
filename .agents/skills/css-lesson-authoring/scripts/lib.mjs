import { access, readdir, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import { dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SOURCE_ROLES = new Set(["primary", "supplemental", "internal", "example"]);
export const SOURCE_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".html", ".css"]);

export function parseArgs(argv) {
  const options = {};
  const positionals = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const key = token.slice(2);
    if (!key) throw new Error("Invalid empty option.");
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return { options, positionals };
}

export function requireOption(options, key) {
  const value = options[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required option --${key}.`);
  }
  return value.trim();
}

export function assertSlug(value, label = "slug") {
  if (!SLUG_PATTERN.test(value)) {
    throw new Error(`${label} must be kebab-case lowercase text: "${value}".`);
  }
  return value;
}

export function assertEntityId(value, label = "id") {
  if (typeof value !== "string" || value.trim().length === 0 || value !== value.trim()) {
    throw new Error(`${label} must be a non-empty trimmed string.`);
  }
  return value;
}

export function positiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return number;
}

export async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readJson(path) {
  let source;
  try {
    source = await readFile(path, "utf8");
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") {
      throw new Error(`Missing required file: ${path}`);
    }
    throw error;
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Invalid JSON at ${path}: ${error.message}`);
  }
}

export async function sortedDirectories(path) {
  const entries = await readdir(path, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function findRepoRoot(start = process.cwd()) {
  let current = resolve(start);
  while (true) {
    if (
      (await pathExists(join(current, "package.json"))) &&
      (await pathExists(join(current, "content", "courses")))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not find CSS Lab repository root from ${resolve(start)}. Use --root to specify it explicitly.`,
      );
    }
    current = parent;
  }
}

export function contentPaths(repoRoot, courseSlug, moduleSlug, lessonSlug) {
  const coursesRoot = join(repoRoot, "content", "courses");
  const courseRoot = join(coursesRoot, courseSlug);
  const moduleRoot = join(courseRoot, "modules", moduleSlug);
  const lessonsRoot = join(moduleRoot, "lessons");
  const lessonRoot = lessonSlug ? join(lessonsRoot, lessonSlug) : null;
  return {
    coursesRoot,
    courseRoot,
    moduleRoot,
    lessonsRoot,
    lessonRoot,
    exercisesRoot: lessonRoot ? join(lessonRoot, "exercises") : null,
  };
}

export async function readAndValidateRecord(path, expectedSlug, kind) {
  const record = await readJson(path);
  if (record.slug !== expectedSlug) {
    throw new Error(
      `${kind} slug mismatch at ${path}: directory "${expectedSlug}", metadata "${String(record.slug)}".`,
    );
  }
  return record;
}

export async function listLessonRecords(repoRoot, courseSlug, moduleSlug) {
  const { lessonsRoot } = contentPaths(repoRoot, courseSlug, moduleSlug);
  if (!(await pathExists(lessonsRoot))) return [];
  const directories = await sortedDirectories(lessonsRoot);
  const lessons = [];
  for (const directory of directories) {
    assertSlug(directory.name, "lesson directory");
    const record = await readAndValidateRecord(
      join(lessonsRoot, directory.name, "lesson.json"),
      directory.name,
      "Lesson",
    );
    lessons.push({ ...record, directory: directory.name });
  }
  return lessons.sort(
    (left, right) => left.order - right.order || left.slug.localeCompare(right.slug),
  );
}

export async function listExerciseRecords(repoRoot, courseSlug, moduleSlug, lessonSlug) {
  const { exercisesRoot } = contentPaths(repoRoot, courseSlug, moduleSlug, lessonSlug);
  if (!(await pathExists(exercisesRoot))) return [];
  const directories = await sortedDirectories(exercisesRoot);
  const exercises = [];
  for (const directory of directories) {
    assertSlug(directory.name, "exercise directory");
    const record = await readAndValidateRecord(
      join(exercisesRoot, directory.name, "exercise.json"),
      directory.name,
      "Exercise",
    );
    exercises.push({ ...record, directory: directory.name });
  }
  return exercises.sort(
    (left, right) => left.order - right.order || left.slug.localeCompare(right.slug),
  );
}

export function nextOrder(records) {
  return records.reduce(
    (highest, record) => Math.max(highest, Number(record.order) || 0),
    0,
  ) + 1;
}

export function assertOrderAvailable(records, order, kind) {
  const conflict = records.find((record) => record.order === order);
  if (conflict) {
    throw new Error(
      `${kind} order ${order} is already used by "${conflict.slug}". Choose another order.`,
    );
  }
}

async function walkEntityJsonFiles(directory, output) {
  if (!(await pathExists(directory))) return;
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await walkEntityJsonFiles(path, output);
      continue;
    }
    if (
      entry.isFile() &&
      ["course.json", "module.json", "lesson.json", "exercise.json"].includes(entry.name)
    ) {
      output.push(path);
    }
  }
}

export async function assertEntityIdAvailable(coursesRoot, id) {
  const files = [];
  await walkEntityJsonFiles(coursesRoot, files);
  for (const path of files) {
    const record = await readJson(path);
    if (record.id === id) {
      throw new Error(`Entity id "${id}" already exists at ${path}.`);
    }
  }
}

export function skillDirectory() {
  return resolve(dirname(fileURLToPath(import.meta.url)), "..");
}

export function assetPath(fileName) {
  return join(skillDirectory(), "assets", fileName);
}

export async function renderAsset(fileName, replacements = {}) {
  let source = await readFile(assetPath(fileName), "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    source = source.replaceAll(`{{${key}}}`, value);
  }
  const unresolved = source.match(/{{[A-Z0-9_]+}}/g);
  if (unresolved) {
    throw new Error(
      `Unresolved template placeholders in ${fileName}: ${[...new Set(unresolved)].join(", ")}`,
    );
  }
  return source.endsWith("\n") ? source : `${source}\n`;
}

export function isPathInside(baseDirectory, candidate) {
  const base = resolve(baseDirectory);
  const target = resolve(candidate);
  return target === base || target.startsWith(`${base}${sep}`);
}

export function validateSourceExtension(path) {
  const extension = extname(path).toLowerCase();
  if (!SOURCE_EXTENSIONS.has(extension)) {
    throw new Error(
      `Unsupported source file extension "${extension || "(none)"}" for ${path}. Supported: ${[
        ...SOURCE_EXTENSIONS,
      ].join(", ")}.`,
    );
  }
}

export function isDirectExecution(importMetaUrl) {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === resolve(fileURLToPath(importMetaUrl));
}
