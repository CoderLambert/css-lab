import { expect, test } from "@playwright/test";

import { readStudioContentHealth } from "../src/features/studio/lib/content-health";
import type {
  ExerciseAssetInspection,
  ExerciseSourceInspector,
} from "../src/lib/content/exercise-source";
import type { LessonContentInspector } from "../src/lib/content/lesson-content-source";
import type { ContentReader } from "../src/lib/content/reader";
import type { Course, Exercise, Lesson, Module } from "../src/lib/content/types";

const course: Course = {
  schemaVersion: 1,
  id: "course-id",
  slug: "course",
  title: "Course",
  description: "fixture",
  order: 1,
  status: "published",
};

const courseModule: Module = {
  schemaVersion: 1,
  id: "module-id",
  slug: "module",
  title: "Module",
  description: "fixture",
  order: 1,
  status: "published",
  courseId: course.id,
};

const lesson: Lesson = {
  schemaVersion: 1,
  id: "lesson-id",
  slug: "lesson",
  title: "Lesson",
  description: "fixture",
  estimatedMinutes: 5,
  order: 1,
  status: "published",
  courseId: course.id,
  moduleId: courseModule.id,
};

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    schemaVersion: 2,
    id: "exercise-id",
    revision: 1,
    slug: "exercise",
    title: "Exercise",
    prompt: "Do it",
    order: 1,
    status: "published",
    hints: [],
    checks: [
      {
        id: "target-exists",
        type: "exists",
        selector: ".target",
        message: "Target exists",
      },
    ],
    courseId: course.id,
    moduleId: courseModule.id,
    lessonId: lesson.id,
    workspace: {
      definition: {
        files: [
          { path: "index.html", language: "html", editable: false },
          { path: "style.css", language: "css", editable: true },
        ],
      },
      starter: {
        files: {
          "index.html": '<div class="target"></div>',
          "style.css": "",
        },
      },
    },
    runtime: { type: "browser", entry: "index.html" },
    ...overrides,
  };
}

function reader(exercise: Exercise): ContentReader {
  return {
    listCourses: async () => [course],
    getCourseBySlug: async () => course,
    listModules: async () => [courseModule],
    getModuleBySlug: async () => courseModule,
    listLessons: async () => [lesson],
    getLessonBySlug: async () => lesson,
    listExercises: async () => [exercise],
    getExerciseBySlug: async () => exercise,
  };
}

const lessonContentInspector: LessonContentInspector = {
  inspectLessonContent: async () => ({ exists: true, isEmpty: false }),
};

function exerciseInspector(
  result: ExerciseAssetInspection | Error,
): ExerciseSourceInspector {
  return {
    inspectExercise: async () => {
      if (result instanceof Error) {
        throw result;
      }
      return result;
    },
  };
}

async function audit(
  exercise: Exercise,
  inspection: ExerciseAssetInspection | Error,
) {
  return readStudioContentHealth(reader(exercise), {
    lessonContentInspector,
    exerciseSourceInspector: exerciseInspector(inspection),
  });
}

test("zero editable is error for visible exercise and warning for draft", async () => {
  const noEditable = makeExercise({
    workspace: {
      definition: {
        files: [{ path: "index.html", language: "html", editable: false }],
      },
      starter: { files: { "index.html": "<main></main>" } },
    },
  });

  const published = await audit(noEditable, {
    starterPaths: ["index.html"],
    solutionPaths: [],
  });
  expect(
    published.issues.find((issue) => issue.code === "workspace-zero-editable"),
  ).toMatchObject({ severity: "error", location: expect.stringContaining("exercise:exercise") });

  const draft = await audit(
    { ...noEditable, status: "draft" },
    { starterPaths: ["index.html"], solutionPaths: [] },
  );
  expect(
    draft.issues.find((issue) => issue.code === "workspace-zero-editable"),
  ).toMatchObject({ severity: "warning" });
});

test("browser capability and undeclared starter failures use stable blocking codes", async () => {
  const exercise = makeExercise({
    workspace: {
      definition: {
        files: [
          { path: "index.html", language: "html", editable: false },
          { path: "extra.html", language: "html", editable: false },
          { path: "main.js", language: "javascript", editable: true },
        ],
      },
      starter: {
        files: {
          "index.html": "",
          "extra.html": "",
          "main.js": "",
        },
      },
    },
  });

  const report = await audit(exercise, {
    starterPaths: ["index.html", "extra.html", "main.js", "rogue.css"],
    solutionPaths: ["main.js"],
  });

  expect(report.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ code: "browser-unsupported-language", severity: "error" }),
      expect.objectContaining({ code: "browser-multiple-html", severity: "error" }),
      expect.objectContaining({ code: "undeclared-starter-file", severity: "error" }),
    ]),
  );
});

test("solution paths exactly match editable paths", async () => {
  const exercise = makeExercise();

  const missing = await audit(exercise, {
    starterPaths: ["index.html", "style.css"],
    solutionPaths: [],
  });
  expect(missing.issues).toContainEqual(
    expect.objectContaining({ code: "missing-solution-file", severity: "error" }),
  );

  const extra = await audit(exercise, {
    starterPaths: ["index.html", "style.css"],
    solutionPaths: ["style.css", "index.html"],
  });
  expect(extra.issues).toContainEqual(
    expect.objectContaining({ code: "unexpected-solution-file", severity: "error" }),
  );

  const healthy = await audit(exercise, {
    starterPaths: ["index.html", "style.css"],
    solutionPaths: ["style.css"],
  });
  expect(
    healthy.issues.some((issue) => issue.code.includes("solution")),
  ).toBe(false);
});

test("source-only inspector failure becomes a blocking health issue", async () => {
  const report = await audit(makeExercise(), new Error("unsafe solution entry"));

  expect(report.issues).toContainEqual(
    expect.objectContaining({
      code: "exercise-source-inspection-failed",
      severity: "error",
      location: expect.stringContaining("exercise:exercise"),
    }),
  );
});


test("existing duplicate order and duplicate check id rules remain active", async () => {
  const duplicateChecks = makeExercise({
    checks: [
      {
        id: "duplicate",
        type: "exists",
        selector: ".target",
        message: "one",
      },
      {
        id: "duplicate",
        type: "exists",
        selector: ".other",
        message: "two",
      },
    ],
  });

  const checkReport = await audit(duplicateChecks, {
    starterPaths: ["index.html", "style.css"],
    solutionPaths: ["style.css"],
  });
  expect(checkReport.issues).toContainEqual(
    expect.objectContaining({
      code: "duplicate-check-id",
      severity: "error",
    }),
  );

  const secondExercise = {
    ...makeExercise({
      id: "exercise-id-2",
      slug: "exercise-two",
    }),
    order: 1,
  };
  const duplicateOrderReader: ContentReader = {
    ...reader(makeExercise()),
    listExercises: async () => [makeExercise(), secondExercise],
  };
  const sourceInspector = exerciseInspector({
    starterPaths: ["index.html", "style.css"],
    solutionPaths: ["style.css"],
  });
  const orderReport = await readStudioContentHealth(duplicateOrderReader, {
    lessonContentInspector,
    exerciseSourceInspector: sourceInspector,
  });

  expect(orderReport.issues).toContainEqual(
    expect.objectContaining({
      code: "duplicate-order",
      severity: "error",
      location: expect.stringContaining("lesson:lesson"),
    }),
  );
});


test("duplicate stable id and published-child-hidden rules remain active", async () => {
  const duplicateStableId = await audit(
    makeExercise({ id: lesson.id }),
    {
      starterPaths: ["index.html", "style.css"],
      solutionPaths: ["style.css"],
    },
  );

  expect(duplicateStableId.issues).toContainEqual(
    expect.objectContaining({
      code: "duplicate-stable-id",
      severity: "error",
    }),
  );

  const draftModule = {
    ...courseModule,
    status: "draft" as const,
  };
  const exercise = makeExercise();
  const hiddenReader: ContentReader = {
    ...reader(exercise),
    listModules: async () => [draftModule],
    getModuleBySlug: async () => draftModule,
  };
  const hidden = await readStudioContentHealth(
    hiddenReader,
    {
      lessonContentInspector,
      exerciseSourceInspector: exerciseInspector({
        starterPaths: ["index.html", "style.css"],
        solutionPaths: ["style.css"],
      }),
    },
  );

  expect(hidden.issues).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        code: "published-child-hidden",
        severity: "warning",
      }),
    ]),
  );
});
