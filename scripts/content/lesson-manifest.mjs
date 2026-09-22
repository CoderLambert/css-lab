import { readdir } from "node:fs/promises";
import { join } from "node:path";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function assertSlug(slug, location) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid content directory slug "${slug}" at ${location}`);
  }
}

async function readDirectoryEntries(directoryPath) {
  return readdir(directoryPath, { withFileTypes: true });
}

function hasRegularFile(entries, fileName) {
  return entries.some((entry) => entry.name === fileName && entry.isFile());
}

function findDirectory(entries, directoryName) {
  return entries.find(
    (entry) => entry.name === directoryName && entry.isDirectory(),
  );
}

function sortedDirectories(entries) {
  return entries
    .filter((entry) => entry.isDirectory())
    .toSorted((left, right) => left.name.localeCompare(right.name));
}

export async function readLessonManifest({
  coursesRoot = join(process.cwd(), "content", "courses"),
} = {}) {
  const manifest = [];
  const courseEntries = await readDirectoryEntries(coursesRoot);

  for (const courseEntry of sortedDirectories(courseEntries)) {
    assertSlug(courseEntry.name, coursesRoot);

    const courseRoot = join(coursesRoot, courseEntry.name);
    const courseContents = await readDirectoryEntries(courseRoot);
    const modulesDirectory = findDirectory(courseContents, "modules");

    if (!modulesDirectory) {
      continue;
    }

    const modulesRoot = join(courseRoot, modulesDirectory.name);
    const moduleEntries = await readDirectoryEntries(modulesRoot);

    for (const moduleEntry of sortedDirectories(moduleEntries)) {
      assertSlug(moduleEntry.name, modulesRoot);

      const moduleRoot = join(modulesRoot, moduleEntry.name);
      const moduleContents = await readDirectoryEntries(moduleRoot);
      const lessonsDirectory = findDirectory(moduleContents, "lessons");

      if (!lessonsDirectory) {
        continue;
      }

      const lessonsRoot = join(moduleRoot, lessonsDirectory.name);
      const lessonEntries = await readDirectoryEntries(lessonsRoot);

      for (const lessonEntry of sortedDirectories(lessonEntries)) {
        assertSlug(lessonEntry.name, lessonsRoot);

        const lessonRoot = join(lessonsRoot, lessonEntry.name);
        const lessonContents = await readDirectoryEntries(lessonRoot);

        if (!hasRegularFile(lessonContents, "lesson.json")) {
          throw new Error(
            `Missing lesson.json for lesson ${[
              courseEntry.name,
              moduleEntry.name,
              lessonEntry.name,
            ].join("/")}: ${join(lessonRoot, "lesson.json")}`,
          );
        }

        const key = [courseEntry.name, moduleEntry.name, lessonEntry.name].join(
          "/",
        );

        if (!hasRegularFile(lessonContents, "lesson.mdx")) {
          throw new Error(
            `Missing lesson.mdx for lesson ${key}: ${join(lessonRoot, "lesson.mdx")}`,
          );
        }

        manifest.push({
          key,
          courseSlug: courseEntry.name,
          moduleSlug: moduleEntry.name,
          lessonSlug: lessonEntry.name,
          mdxImportPath: `@content/courses/${courseEntry.name}/modules/${moduleEntry.name}/lessons/${lessonEntry.name}/lesson.mdx`,
        });
      }
    }
  }

  manifest.sort((left, right) => left.key.localeCompare(right.key));

  const keys = new Set();

  for (const entry of manifest) {
    if (keys.has(entry.key)) {
      throw new Error(`Duplicate lesson manifest key: ${entry.key}`);
    }

    keys.add(entry.key);
  }

  return manifest;
}
