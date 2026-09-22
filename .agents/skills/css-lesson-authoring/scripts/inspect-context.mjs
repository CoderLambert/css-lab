#!/usr/bin/env node

import { join, resolve } from "node:path";

import {
  assertSlug,
  contentPaths,
  findRepoRoot,
  isDirectExecution,
  listExerciseRecords,
  listLessonRecords,
  nextOrder,
  parseArgs,
  readAndValidateRecord,
  requireOption,
} from "./lib.mjs";

export async function inspectContext({
  repoRoot,
  courseSlug,
  moduleSlug,
  lessonSlug = null,
}) {
  assertSlug(courseSlug, "course slug");
  assertSlug(moduleSlug, "module slug");
  if (lessonSlug) assertSlug(lessonSlug, "lesson slug");

  const paths = contentPaths(repoRoot, courseSlug, moduleSlug, lessonSlug);
  const course = await readAndValidateRecord(
    join(paths.courseRoot, "course.json"),
    courseSlug,
    "Course",
  );
  const courseModule = await readAndValidateRecord(
    join(paths.moduleRoot, "module.json"),
    moduleSlug,
    "Module",
  );
  const lessons = await listLessonRecords(repoRoot, courseSlug, moduleSlug);

  const result = {
    course: {
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
    },
    module: {
      id: courseModule.id,
      slug: courseModule.slug,
      title: courseModule.title,
      status: courseModule.status,
    },
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      order: lesson.order,
      status: lesson.status,
      estimatedMinutes: lesson.estimatedMinutes,
    })),
    suggestedNextLessonOrder: nextOrder(lessons),
  };

  if (lessonSlug) {
    const lesson = lessons.find((candidate) => candidate.slug === lessonSlug);
    if (!lesson) {
      throw new Error(
        `Lesson "${lessonSlug}" was not found in ${courseSlug}/${moduleSlug}.`,
      );
    }

    const exercises = await listExerciseRecords(
      repoRoot,
      courseSlug,
      moduleSlug,
      lessonSlug,
    );

    result.lesson = {
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      order: lesson.order,
      status: lesson.status,
      estimatedMinutes: lesson.estimatedMinutes,
    };
    result.exercises = exercises.map((exercise) => ({
      id: exercise.id,
      slug: exercise.slug,
      title: exercise.title,
      order: exercise.order,
      status: exercise.status,
      revision: exercise.revision,
    }));
    result.suggestedNextExerciseOrder = nextOrder(exercises);
  }

  return result;
}

async function main() {
  const { options } = parseArgs(process.argv.slice(2));
  const repoRoot = options.root
    ? resolve(String(options.root))
    : await findRepoRoot();

  const result = await inspectContext({
    repoRoot,
    courseSlug: requireOption(options, "course"),
    moduleSlug: requireOption(options, "module"),
    lessonSlug:
      typeof options.lesson === "string" ? options.lesson.trim() : null,
  });

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (isDirectExecution(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
