import "server-only";

import type { ExerciseAssetInspection, ExerciseSourceInspector } from "@/lib/content/exercise-source";
import type { ContentReader } from "@/lib/content/reader";
import type { LessonContentInspector } from "@/lib/content/lesson-content-source";
import type {
  Course,
  EntityStatus,
  Exercise,
  Lesson,
  Module,
} from "@/lib/content/types";

export type ContentIssueSeverity = "error" | "warning";

export interface ContentHealthIssue {
  severity: ContentIssueSeverity;
  code: string;
  message: string;
  location: string;
}

export interface StudioExerciseEntry {
  exercise: Exercise;
  learnerHref: string | null;
}

export interface StudioLessonEntry {
  lesson: Lesson;
  exercises: StudioExerciseEntry[];
}

export interface StudioModuleEntry {
  module: Module;
  lessons: StudioLessonEntry[];
}

export interface StudioCourseEntry {
  course: Course;
  modules: StudioModuleEntry[];
}

export interface StudioContentHealth {
  courses: StudioCourseEntry[];
  issues: ContentHealthIssue[];
  errorCount: number;
  warningCount: number;
  counts: {
    courses: number;
    modules: number;
    lessons: number;
    exercises: number;
    publishedExercises: number;
  };
}

type AuditedEntity = {
  id: string;
  title: string;
  order: number;
};

interface RegisteredEntity {
  kind: string;
  title: string;
  location: string;
}

function addIssue(
  issues: ContentHealthIssue[],
  severity: ContentIssueSeverity,
  code: string,
  message: string,
  location: string,
): void {
  issues.push({
    severity,
    code,
    message,
    location,
  });
}

function registerStableId(
  issues: ContentHealthIssue[],
  stableIds: Map<string, RegisteredEntity>,
  kind: string,
  entity: AuditedEntity,
  location: string,
): void {
  const existing = stableIds.get(entity.id);

  if (existing) {
    addIssue(
      issues,
      "error",
      "duplicate-stable-id",
      `${kind} “${entity.title}” 与 ${existing.kind} “${existing.title}” 使用了相同 stable id “${entity.id}”。`,
      `${existing.location} ↔ ${location}`,
    );
    return;
  }

  stableIds.set(entity.id, {
    kind,
    title: entity.title,
    location,
  });
}

function auditSiblingOrders(
  issues: ContentHealthIssue[],
  kind: string,
  entities: AuditedEntity[],
  location: string,
): void {
  const orders = new Map<number, AuditedEntity>();

  for (const entity of entities) {
    const existing = orders.get(entity.order);

    if (existing) {
      addIssue(
        issues,
        "error",
        "duplicate-order",
        `${kind} “${existing.title}” 与 “${entity.title}” 都使用 order ${entity.order}，published sequence 会产生歧义。`,
        location,
      );
      continue;
    }

    orders.set(entity.order, entity);
  }
}

function hiddenPublishedChild(
  issues: ContentHealthIssue[],
  childStatus: EntityStatus,
  parentPublished: boolean,
  kind: string,
  title: string,
  location: string,
): void {
  if (childStatus === "published" && !parentPublished) {
    addIssue(
      issues,
      "warning",
      "published-child-hidden",
      `${kind} “${title}” 标记为 published，但上级发布链未完整 published，因此 learner 看不到它。`,
      location,
    );
  }
}

function auditExerciseChecks(
  issues: ContentHealthIssue[],
  exercise: Exercise,
  visibleInLearner: boolean,
  location: string,
): void {
  if (exercise.checks.length === 0) {
    addIssue(
      issues,
      visibleInLearner ? "error" : "warning",
      "exercise-without-checks",
      `Exercise “${exercise.title}” 没有任何 checker rules。`,
      location,
    );
  }

  const checkIds = new Set<string>();

  for (const check of exercise.checks) {
    if (checkIds.has(check.id)) {
      addIssue(
        issues,
        "error",
        "duplicate-check-id",
        `Exercise “${exercise.title}” 包含重复 check id “${check.id}”。`,
        location,
      );
      continue;
    }

    checkIds.add(check.id);
  }

}


interface StudioSourceDependencies {
  lessonContentInspector: LessonContentInspector;
  exerciseSourceInspector: ExerciseSourceInspector;
}

function auditExerciseWorkspace(
  issues: ContentHealthIssue[],
  exercise: Exercise,
  inspection: ExerciseAssetInspection,
  visibleInLearner: boolean,
  location: string,
): void {
  const workspaceFiles = exercise.workspace.definition.files;
  const editablePaths = workspaceFiles
    .filter((file) => file.editable)
    .map((file) => file.path);

  if (editablePaths.length === 0) {
    addIssue(
      issues,
      visibleInLearner ? "error" : "warning",
      "workspace-zero-editable",
      `Exercise “${exercise.title}” 没有 editable workspace file。`,
      location,
    );
  }

  if (
    exercise.runtime.type === "browser" &&
    workspaceFiles.some(
      (file) =>
        file.language === "javascript" || file.language === "typescript",
    )
  ) {
    addIssue(
      issues,
      "error",
      "browser-unsupported-language",
      `Exercise “${exercise.title}” 包含当前 Browser Runtime 不支持的 JS/TS file。`,
      location,
    );
  }

  if (workspaceFiles.filter((file) => file.language === "html").length > 1) {
    addIssue(
      issues,
      "error",
      "browser-multiple-html",
      `Exercise “${exercise.title}” 包含多个 HTML files。`,
      location,
    );
  }

  const declaredPaths = new Set(workspaceFiles.map((file) => file.path));

  for (const path of inspection.starterPaths) {
    if (!declaredPaths.has(path)) {
      addIssue(
        issues,
        "error",
        "undeclared-starter-file",
        `Starter source 包含未声明 workspace path “${path}”。`,
        location,
      );
    }
  }

  const editablePathSet = new Set(editablePaths);
  const solutionPathSet = new Set(inspection.solutionPaths);

  for (const path of editablePathSet) {
    if (!solutionPathSet.has(path)) {
      addIssue(
        issues,
        "error",
        "missing-solution-file",
        `Editable workspace path “${path}” 缺少 solution file。`,
        location,
      );
    }
  }

  for (const path of solutionPathSet) {
    if (!editablePathSet.has(path)) {
      addIssue(
        issues,
        "error",
        "unexpected-solution-file",
        `Solution path “${path}” 不是 editable workspace path。`,
        location,
      );
    }
  }
}

export async function readStudioContentHealth(
  contentReader: ContentReader,
  sources: StudioSourceDependencies,
): Promise<StudioContentHealth> {
  const issues: ContentHealthIssue[] = [];
  const stableIds = new Map<string, RegisteredEntity>();
  const courses = await contentReader.listCourses();
  const courseEntries: StudioCourseEntry[] = [];
  let moduleCount = 0;
  let lessonCount = 0;
  let exerciseCount = 0;
  let publishedExerciseCount = 0;

  auditSiblingOrders(issues, "Course", courses, "content/courses");

  for (const course of courses) {
    const courseLocation = `course:${course.slug}`;
    registerStableId(issues, stableIds, "Course", course, courseLocation);

    const modules = await contentReader.listModules(course.slug);
    moduleCount += modules.length;
    auditSiblingOrders(issues, "Module", modules, courseLocation);

    const moduleEntries: StudioModuleEntry[] = [];
    let coursePublishedExercises = 0;

    for (const courseModule of modules) {
      const moduleLocation = `${courseLocation}/module:${courseModule.slug}`;
      registerStableId(
        issues,
        stableIds,
        "Module",
        courseModule,
        moduleLocation,
      );

      const coursePublished = course.status === "published";
      hiddenPublishedChild(
        issues,
        courseModule.status,
        coursePublished,
        "Module",
        courseModule.title,
        moduleLocation,
      );

      const lessons = await contentReader.listLessons(
        course.slug,
        courseModule.slug,
      );
      lessonCount += lessons.length;
      auditSiblingOrders(issues, "Lesson", lessons, moduleLocation);

      const lessonEntries: StudioLessonEntry[] = [];
      let modulePublishedExercises = 0;

      for (const lesson of lessons) {
        const lessonLocation = `${moduleLocation}/lesson:${lesson.slug}`;
        registerStableId(issues, stableIds, "Lesson", lesson, lessonLocation);

        const modulePublished =
          coursePublished && courseModule.status === "published";
        hiddenPublishedChild(
          issues,
          lesson.status,
          modulePublished,
          "Lesson",
          lesson.title,
          lessonLocation,
        );

        const lessonContent = await sources.lessonContentInspector.inspectLessonContent(
          {
            courseSlug: course.slug,
            moduleSlug: courseModule.slug,
            lessonSlug: lesson.slug,
          },
        );

        if (!lessonContent.exists) {
          addIssue(
            issues,
            "error",
            "missing-lesson-mdx",
            `Lesson “${lesson.title}” 缺少 lesson.mdx。`,
            lessonLocation,
          );
        } else if (lessonContent.isEmpty) {
          addIssue(
            issues,
            modulePublished && lesson.status === "published"
              ? "error"
              : "warning",
            "empty-lesson-body",
            `Lesson “${lesson.title}” 的 lesson.mdx 为空。`,
            lessonLocation,
          );
        }

        const exercises = await contentReader.listExercises(
          course.slug,
          courseModule.slug,
          lesson.slug,
        );
        exerciseCount += exercises.length;
        auditSiblingOrders(issues, "Exercise", exercises, lessonLocation);

        const exerciseEntries: StudioExerciseEntry[] = [];
        let lessonPublishedExercises = 0;

        for (const exercise of exercises) {
          const exerciseLocation = `${lessonLocation}/exercise:${exercise.slug}`;
          registerStableId(
            issues,
            stableIds,
            "Exercise",
            exercise,
            exerciseLocation,
          );

          const lessonPublished =
            modulePublished && lesson.status === "published";
          hiddenPublishedChild(
            issues,
            exercise.status,
            lessonPublished,
            "Exercise",
            exercise.title,
            exerciseLocation,
          );

          const visibleInLearner =
            lessonPublished && exercise.status === "published";

          auditExerciseChecks(
            issues,
            exercise,
            visibleInLearner,
            exerciseLocation,
          );

          try {
            const inspection = await sources.exerciseSourceInspector.inspectExercise({
              courseSlug: course.slug,
              moduleSlug: courseModule.slug,
              lessonSlug: lesson.slug,
              exerciseSlug: exercise.slug,
            });

            auditExerciseWorkspace(
              issues,
              exercise,
              inspection,
              visibleInLearner,
              exerciseLocation,
            );
          } catch {
            addIssue(
              issues,
              "error",
              "exercise-source-inspection-failed",
              `Exercise “${exercise.title}” 的 source inspection 失败。`,
              exerciseLocation,
            );
          }

          if (visibleInLearner) {
            lessonPublishedExercises += 1;
            modulePublishedExercises += 1;
            coursePublishedExercises += 1;
            publishedExerciseCount += 1;
          }

          exerciseEntries.push({
            exercise,
            learnerHref: visibleInLearner
              ? `/learn/${course.slug}/${courseModule.slug}/${lesson.slug}/${exercise.slug}`
              : null,
          });
        }

        if (
          modulePublished &&
          lesson.status === "published" &&
          lessonPublishedExercises === 0
        ) {
          addIssue(
            issues,
            "warning",
            "published-lesson-empty",
            `Published lesson “${lesson.title}” 没有 published exercises。`,
            lessonLocation,
          );
        }

        lessonEntries.push({
          lesson,
          exercises: exerciseEntries,
        });
      }

      if (
        coursePublished &&
        courseModule.status === "published" &&
        modulePublishedExercises === 0
      ) {
        addIssue(
          issues,
          "warning",
          "published-module-empty",
          `Published module “${courseModule.title}” 没有可见的 published exercises。`,
          moduleLocation,
        );
      }

      moduleEntries.push({
        module: courseModule,
        lessons: lessonEntries,
      });
    }

    if (course.status === "published" && coursePublishedExercises === 0) {
      addIssue(
        issues,
        "warning",
        "published-course-empty",
        `Published course “${course.title}” 没有可见的 published exercises。`,
        courseLocation,
      );
    }

    courseEntries.push({
      course,
      modules: moduleEntries,
    });
  }

  return {
    courses: courseEntries,
    issues,
    errorCount: issues.filter((issue) => issue.severity === "error").length,
    warningCount: issues.filter((issue) => issue.severity === "warning").length,
    counts: {
      courses: courses.length,
      modules: moduleCount,
      lessons: lessonCount,
      exercises: exerciseCount,
      publishedExercises: publishedExerciseCount,
    },
  };
}
