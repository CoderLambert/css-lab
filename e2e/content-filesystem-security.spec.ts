import { expect, test } from "@playwright/test";
import {
  mkdir,
  mkdtemp,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { FileContentReader } from "../src/lib/content/file/file-content-reader";
import { FileExerciseSourceInspector } from "../src/lib/content/file/file-exercise-source-inspector";
import { FileLessonContentInspector } from "../src/lib/content/file/file-lesson-content-inspector";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value), "utf8");
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "css-lab-m6a-security-"));
  const courses = join(root, "courses");
  const lesson = join(
    courses,
    "course",
    "modules",
    "module",
    "lessons",
    "lesson",
  );
  const exercise = join(lesson, "exercises", "exercise");

  await mkdir(join(exercise, "starter"), { recursive: true });
  await mkdir(join(exercise, "solution"), { recursive: true });

  await writeJson(join(courses, "course", "course.json"), {
    schemaVersion: 1,
    id: "course-id",
    slug: "course",
    title: "Course",
    description: "fixture",
    order: 1,
    status: "published",
  });
  await writeJson(join(courses, "course", "modules", "module", "module.json"), {
    schemaVersion: 1,
    id: "module-id",
    slug: "module",
    title: "Module",
    description: "fixture",
    order: 1,
    status: "published",
  });
  await writeJson(join(lesson, "lesson.json"), {
    schemaVersion: 1,
    id: "lesson-id",
    slug: "lesson",
    title: "Lesson",
    description: "fixture",
    estimatedMinutes: 5,
    order: 1,
    status: "published",
  });
  await writeFile(join(lesson, "lesson.mdx"), "## Lesson\n", "utf8");
  await writeJson(join(exercise, "exercise.json"), {
    schemaVersion: 2,
    id: "exercise-id",
    revision: 1,
    slug: "exercise",
    title: "Exercise",
    prompt: "Do it",
    order: 1,
    status: "published",
    hints: [],
    checks: [],
    workspace: {
      files: [
        { path: "index.html", language: "html", editable: false },
        { path: "style.css", language: "css", editable: true },
      ],
    },
    runtime: { type: "browser", entry: "index.html" },
  });
  await writeFile(join(exercise, "starter", "index.html"), "<main></main>", "utf8");
  await writeFile(join(exercise, "starter", "style.css"), "", "utf8");
  await writeFile(join(exercise, "solution", "style.css"), "", "utf8");

  return { root, courses, lesson, exercise };
}

test("regular declared starter hydrates and missing declared starter hard-fails", async () => {
  const f = await fixture();
  try {
    const reader = new FileContentReader(f.courses);
    const exercise = await reader.getExerciseBySlug(
      "course",
      "module",
      "lesson",
      "exercise",
    );
    expect(exercise?.workspace.starter.files["index.html"]).toBe("<main></main>");

    await rm(join(f.exercise, "starter", "style.css"));
    await expect(
      reader.getExerciseBySlug("course", "module", "lesson", "exercise"),
    ).rejects.toThrow();
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("declared starter final symlink and intermediate symlink fail closed", async () => {
  const f = await fixture();
  try {
    const outside = join(f.root, "outside.css");
    await writeFile(outside, "outside", "utf8");

    await rm(join(f.exercise, "starter", "style.css"));
    await symlink(outside, join(f.exercise, "starter", "style.css"));
    await expect(
      new FileContentReader(f.courses).getExerciseBySlug(
        "course", "module", "lesson", "exercise",
      ),
    ).rejects.toThrow(/non-symlink|Unsafe|Content/);

    await rm(join(f.exercise, "starter"), { recursive: true, force: true });
    const externalStarter = join(f.root, "external-starter");
    await mkdir(externalStarter);
    await writeFile(join(externalStarter, "index.html"), "", "utf8");
    await writeFile(join(externalStarter, "style.css"), "", "utf8");
    await symlink(externalStarter, join(f.exercise, "starter"));
    await expect(
      new FileContentReader(f.courses).getExerciseBySlug(
        "course", "module", "lesson", "exercise",
      ),
    ).rejects.toThrow(/non-symlink|Content/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("metadata final symlink and ancestor directory symlink fail closed for direct lookup", async () => {
  const f = await fixture();
  try {
    const courseJson = join(f.courses, "course", "course.json");
    const outsideJson = join(f.root, "outside-course.json");
    await writeFile(outsideJson, await (await import("node:fs/promises")).readFile(courseJson, "utf8"), "utf8");
    await rm(courseJson);
    await symlink(outsideJson, courseJson);
    await expect(
      new FileContentReader(f.courses).getCourseBySlug("course"),
    ).rejects.toThrow(/non-symlink|Content/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }

  const second = await fixture();
  try {
    const modules = join(second.courses, "course", "modules");
    const externalModules = join(second.root, "external-modules");
    await (await import("node:fs/promises")).rename(modules, externalModules);
    await symlink(externalModules, modules);
    await expect(
      new FileContentReader(second.courses).getModuleBySlug("course", "module"),
    ).rejects.toThrow(/non-symlink|Content/);
  } finally {
    await rm(second.root, { recursive: true, force: true });
  }
});

test("lesson source missing remains non-fatal but symlink source fails closed", async () => {
  const f = await fixture();
  try {
    const inspector = new FileLessonContentInspector(f.courses);
    const source = {
      courseSlug: "course",
      moduleSlug: "module",
      lessonSlug: "lesson",
    };
    await rm(join(f.lesson, "lesson.mdx"));
    await expect(inspector.inspectLessonContent(source)).resolves.toEqual({
      exists: false,
      isEmpty: true,
    });

    const outside = join(f.root, "outside.mdx");
    await writeFile(outside, "## Outside\n", "utf8");
    await symlink(outside, join(f.lesson, "lesson.mdx"));
    await expect(inspector.inspectLessonContent(source)).rejects.toThrow();
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("source inspector rejects unsafe source-only solution entries without partial output", async () => {
  const f = await fixture();
  try {
    const outside = join(f.root, "outside.css");
    await writeFile(outside, "outside", "utf8");
    await rm(join(f.exercise, "solution", "style.css"));
    await symlink(outside, join(f.exercise, "solution", "style.css"));

    await expect(
      new FileExerciseSourceInspector(f.courses).inspectExercise({
        courseSlug: "course",
        moduleSlug: "module",
        lessonSlug: "lesson",
        exerciseSlug: "exercise",
      }),
    ).rejects.toThrow(/Failed to inspect exercise source/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});
