import "server-only";

import type { ContentReader } from "@/lib/content/reader";
import type { Course } from "@/lib/content/types";
import type { LearnerExerciseEntry } from "./learner-navigation";

export async function readPublishedExerciseSequence(
  contentReader: ContentReader,
  course: Course,
): Promise<LearnerExerciseEntry[]> {
  if (course.status !== "published") {
    return [];
  }

  const modules = await contentReader.listModules(course.slug);
  const publishedModules = modules.filter(
    (module) =>
      module.status === "published" && module.courseId === course.id,
  );
  const moduleEntries = await Promise.all(
    publishedModules.map(async (module) => {
      const lessons = await contentReader.listLessons(course.slug, module.slug);
      const publishedLessons = lessons.filter(
        (lesson) =>
          lesson.status === "published" &&
          lesson.courseId === course.id &&
          lesson.moduleId === module.id,
      );
      const lessonEntries = await Promise.all(
        publishedLessons.map(async (lesson) => {
          const exercises = await contentReader.listExercises(
            course.slug,
            module.slug,
            lesson.slug,
          );
          return exercises
            .filter(
              (exercise) =>
                exercise.status === "published" &&
                exercise.courseId === course.id &&
                exercise.moduleId === module.id &&
                exercise.lessonId === lesson.id,
            )
            .map((exercise) => ({
              course,
              module,
              lesson,
              exercise,
            }));
        }),
      );

      return lessonEntries.flat();
    }),
  );

  return moduleEntries.flat();
}

export async function readFirstPublishedExercise(
  contentReader: ContentReader,
): Promise<LearnerExerciseEntry | null> {
  const courses = await contentReader.listCourses();

  for (const course of courses) {
    if (course.status !== "published") {
      continue;
    }

    const sequence = await readPublishedExerciseSequence(contentReader, course);

    if (sequence.length > 0) {
      return sequence[0];
    }
  }

  return null;
}
