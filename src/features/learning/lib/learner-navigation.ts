import type { Course, Exercise, Lesson, Module } from "@/lib/content/types";
import type { ProgressExerciseDescriptor } from "@/features/progress/lib/progress-aggregation";

export interface LearnerExerciseEntry {
  course: Course;
  module: Module;
  lesson: Lesson;
  exercise: Exercise;
}

export interface LearnerNavigation {
  currentIndex: number;
  totalExercises: number;
  previousHref: string | null;
  nextHref: string | null;
  progressExercises: ProgressExerciseDescriptor[];
}

export function createLearnExerciseHref({
  course,
  module,
  lesson,
  exercise,
}: LearnerExerciseEntry): string {
  return `/learn/${course.slug}/${module.slug}/${lesson.slug}/${exercise.slug}`;
}

export function createLearnerNavigation(
  sequence: readonly LearnerExerciseEntry[],
  currentExercise: Exercise,
): LearnerNavigation {
  const currentIndex = sequence.findIndex(
    (entry) =>
      entry.exercise.id === currentExercise.id &&
      entry.exercise.revision === currentExercise.revision,
  );

  if (currentIndex < 0) {
    throw new Error("Current exercise is not in the published learner sequence");
  }

  return {
    currentIndex,
    totalExercises: sequence.length,
    previousHref:
      currentIndex > 0
        ? createLearnExerciseHref(sequence[currentIndex - 1])
        : null,
    nextHref:
      currentIndex < sequence.length - 1
        ? createLearnExerciseHref(sequence[currentIndex + 1])
        : null,
    progressExercises: sequence.map(({ exercise, module, lesson }) => ({
      exerciseId: exercise.id,
      revision: exercise.revision,
      moduleId: module.id,
      lessonId: lesson.id,
    })),
  };
}
