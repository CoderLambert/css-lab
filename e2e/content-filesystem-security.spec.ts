import { expect, test } from "@playwright/test";
import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { readStudioContentHealth } from "../src/features/studio/lib/content-health";
import { FileContentReader } from "../src/lib/content/file/file-content-reader-impl";
import { FileExerciseSourceInspector } from "../src/lib/content/file/file-exercise-source-inspector-impl";
import { FileLessonContentInspector } from "../src/lib/content/file/file-lesson-content-inspector-impl";

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value), "utf8");
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "m6a-sec-"));
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


test("nested starter intermediate symlink and non-regular final target fail closed", async () => {
  const f = await fixture();

  try {
    const metadataPath = join(f.exercise, "exercise.json");
    const metadata = JSON.parse(
      await (await import("node:fs/promises")).readFile(metadataPath, "utf8"),
    );
    metadata.workspace.files = [
      { path: "index.html", language: "html", editable: false },
      { path: "styles/theme.css", language: "css", editable: true },
    ];
    await writeJson(metadataPath, metadata);
    await rm(join(f.exercise, "starter", "style.css"));

    const outsideStyles = join(f.root, "outside-styles");
    await mkdir(outsideStyles);
    await writeFile(join(outsideStyles, "theme.css"), "", "utf8");
    await symlink(outsideStyles, join(f.exercise, "starter", "styles"));

    await expect(
      new FileContentReader(f.courses).getExerciseBySlug(
        "course",
        "module",
        "lesson",
        "exercise",
      ),
    ).rejects.toThrow(/non-symlink|Content/);

    await rm(join(f.exercise, "starter", "styles"), {
      recursive: true,
      force: true,
    });
    await mkdir(join(f.exercise, "starter", "styles", "theme.css"), {
      recursive: true,
    });

    await expect(
      new FileContentReader(f.courses).getExerciseBySlug(
        "course",
        "module",
        "lesson",
        "exercise",
      ),
    ).rejects.toThrow(/regular file|Content/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("declared starter root escape is rejected for direct and list lookup", async () => {
  const f = await fixture();

  try {
    const metadataPath = join(f.exercise, "exercise.json");
    const metadata = JSON.parse(
      await readFile(metadataPath, "utf8"),
    );
    const parentSegment = String.fromCharCode(46, 46);

    metadata.workspace.files = [
      { path: "index.html", language: "html", editable: false },
      {
        path: parentSegment + "/outside.css",
        language: "css",
        editable: true,
      },
    ];

    await writeJson(metadataPath, metadata);
    await writeFile(
      join(f.exercise, "outside.css"),
      ".container { display: block; }",
      "utf8",
    );

    const reader = new FileContentReader(f.courses);

    await expect(
      reader.getExerciseBySlug(
        "course",
        "module",
        "lesson",
        "exercise",
      ),
    ).rejects.toThrow(/WorkspacePath|invalid/i);

    await expect(
      reader.listExercises("course", "module", "lesson"),
    ).rejects.toThrow(/WorkspacePath|invalid/i);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("source inspector rejects unsafe undeclared starter entry", async () => {
  const f = await fixture();

  try {
    const outside = join(f.root, "outside.css");
    await writeFile(outside, "outside", "utf8");
    await symlink(outside, join(f.exercise, "starter", "rogue.css"));

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


const execFileAsync = promisify(execFile);

async function createNamedPipe(path: string): Promise<void> {
  await execFileAsync("mkfifo", [path]);
}

test("configured coursesRoot symlink is allowed but descendant symlinks are not", async () => {
  test.skip(process.platform === "win32");

  const rootAliasFixture = await fixture();

  try {
    const alias = join(rootAliasFixture.root, "courses-alias");
    await symlink(rootAliasFixture.courses, alias, "dir");

    await expect(
      new FileContentReader(alias).getExerciseBySlug(
        "course",
        "module",
        "lesson",
        "exercise",
      ),
    ).resolves.toMatchObject({ id: "exercise-id" });
  } finally {
    await rm(rootAliasFixture.root, { recursive: true, force: true });
  }

  const cases = [
    {
      label: "course",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.courses, "course"),
      direct: (reader: FileContentReader) =>
        reader.getCourseBySlug("course"),
      list: (reader: FileContentReader) =>
        reader.listCourses(),
    },
    {
      label: "module",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.courses, "course", "modules", "module"),
      direct: (reader: FileContentReader) =>
        reader.getModuleBySlug("course", "module"),
      list: (reader: FileContentReader) =>
        reader.listModules("course"),
    },
    {
      label: "lesson",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        f.lesson,
      direct: (reader: FileContentReader) =>
        reader.getLessonBySlug("course", "module", "lesson"),
      list: (reader: FileContentReader) =>
        reader.listLessons("course", "module"),
    },
    {
      label: "exercise",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        f.exercise,
      direct: (reader: FileContentReader) =>
        reader.getExerciseBySlug("course", "module", "lesson", "exercise"),
      list: (reader: FileContentReader) =>
        reader.listExercises("course", "module", "lesson"),
    },
  ];

  for (const entry of cases) {
    const f = await fixture();

    try {
      const original = entry.path(f);
      const outside = join(f.root, "outside-" + entry.label);
      await rename(original, outside);
      await symlink(outside, original, "dir");

      const reader = new FileContentReader(f.courses);

      await expect(entry.direct(reader)).rejects.toThrow();
      await expect(entry.list(reader)).rejects.toThrow();
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }
});

test("all metadata final files reject symlink and non-regular targets", async () => {
  test.skip(process.platform === "win32");

  const cases = [
    {
      label: "course",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.courses, "course", "course.json"),
      read: (reader: FileContentReader) =>
        reader.getCourseBySlug("course"),
    },
    {
      label: "module",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.courses, "course", "modules", "module", "module.json"),
      read: (reader: FileContentReader) =>
        reader.getModuleBySlug("course", "module"),
    },
    {
      label: "lesson",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.lesson, "lesson.json"),
      read: (reader: FileContentReader) =>
        reader.getLessonBySlug("course", "module", "lesson"),
    },
    {
      label: "exercise",
      path: (f: Awaited<ReturnType<typeof fixture>>) =>
        join(f.exercise, "exercise.json"),
      read: (reader: FileContentReader) =>
        reader.getExerciseBySlug("course", "module", "lesson", "exercise"),
    },
  ];

  for (const entry of cases) {
    const linked = await fixture();

    try {
      const path = entry.path(linked);
      const outside = join(linked.root, entry.label + ".json");
      await writeFile(outside, await readFile(path, "utf8"), "utf8");
      await rm(path);
      await symlink(outside, path);

      await expect(
        entry.read(new FileContentReader(linked.courses)),
      ).rejects.toThrow(/regular file|non-symlink|Content/);
    } finally {
      await rm(linked.root, { recursive: true, force: true });
    }

    const nonRegular = await fixture();

    try {
      const path = entry.path(nonRegular);
      await rm(path);
      await mkdir(path);

      await expect(
        entry.read(new FileContentReader(nonRegular.courses)),
      ).rejects.toThrow(/regular file|Content/);
    } finally {
      await rm(nonRegular.root, { recursive: true, force: true });
    }
  }
});

test("lesson.mdx non-regular target fails closed while missing semantics stay separate", async () => {
  const f = await fixture();

  try {
    const path = join(f.lesson, "lesson.mdx");
    await rm(path);
    await mkdir(path);

    await expect(
      new FileLessonContentInspector(f.courses).inspectLessonContent({
        courseSlug: "course",
        moduleSlug: "module",
        lessonSlug: "lesson",
      }),
    ).rejects.toThrow(/regular file|Content/);
  } finally {
    await rm(f.root, { recursive: true, force: true });
  }
});

test("source inspector rejects non-regular source-only starter and solution entries", async () => {
  test.skip(process.platform === "win32");

  for (const directory of ["starter", "solution"] as const) {
    const f = await fixture();

    try {
      await createNamedPipe(
        join(f.exercise, directory, "rogue.pipe"),
      );

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
  }
});

test("Reader hard-load and source-only Studio health are mutually exclusive", async () => {
  test.skip(process.platform === "win32");

  const declared = await fixture();

  try {
    const outside = join(declared.root, "declared.css");
    await writeFile(outside, "outside", "utf8");
    const path = join(declared.exercise, "starter", "style.css");
    await rm(path);
    await symlink(outside, path);

    await expect(
      readStudioContentHealth(
        new FileContentReader(declared.courses),
        {
          lessonContentInspector:
            new FileLessonContentInspector(declared.courses),
          exerciseSourceInspector:
            new FileExerciseSourceInspector(declared.courses),
        },
      ),
    ).rejects.toThrow();
  } finally {
    await rm(declared.root, { recursive: true, force: true });
  }

  const sourceOnly = await fixture();

  try {
    const outside = join(sourceOnly.root, "solution.css");
    await writeFile(outside, "outside", "utf8");
    const path = join(sourceOnly.exercise, "solution", "style.css");
    await rm(path);
    await symlink(outside, path);

    const report = await readStudioContentHealth(
      new FileContentReader(sourceOnly.courses),
      {
        lessonContentInspector:
          new FileLessonContentInspector(sourceOnly.courses),
        exerciseSourceInspector:
          new FileExerciseSourceInspector(sourceOnly.courses),
      },
    );

    const issue = report.issues.find(
      (candidate) =>
        candidate.code === "exercise-source-inspection-failed",
    );

    expect(issue).toMatchObject({
      severity: "error",
      location: expect.stringContaining("exercise:exercise"),
    });
    expect(issue?.message).not.toContain(sourceOnly.root);
    expect(issue?.location).not.toContain(sourceOnly.root);
  } finally {
    await rm(sourceOnly.root, { recursive: true, force: true });
  }
});
