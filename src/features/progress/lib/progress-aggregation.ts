import type { ExerciseProgress } from "./progress-schema";

export interface ProgressExerciseDescriptor {
  exerciseId: string;
  revision: number;
  moduleId: string;
  lessonId: string;
}

export interface ProgressSummary {
  completed: number;
  total: number;
  percent: number;
}

export interface LearningProgress {
  course: ProgressSummary;
  module: ProgressSummary;
  lesson: ProgressSummary;
}

function createSummary(completed: number, total: number): ProgressSummary {
  return {
    completed,
    total,
    percent: total === 0 ? 0 : (completed / total) * 100,
  };
}

function createProgressKey(exerciseId: string, revision: number): string {
  return `${exerciseId}:${revision}`;
}

export function aggregateLearningProgress(
  exercises: readonly ProgressExerciseDescriptor[],
  storedProgress: readonly ExerciseProgress[],
  currentModuleId: string,
  currentLessonId: string,
): LearningProgress {
  const completedKeys = new Set(
    storedProgress
      .filter((progress) => progress.status === "completed")
      .map((progress) =>
        createProgressKey(progress.exerciseId, progress.revision),
      ),
  );
  const isCompleted = (exercise: ProgressExerciseDescriptor): boolean =>
    completedKeys.has(
      createProgressKey(exercise.exerciseId, exercise.revision),
    );

  const moduleExercises = exercises.filter(
    (exercise) => exercise.moduleId === currentModuleId,
  );
  const lessonExercises = exercises.filter(
    (exercise) => exercise.lessonId === currentLessonId,
  );

  return {
    course: createSummary(
      exercises.filter(isCompleted).length,
      exercises.length,
    ),
    module: createSummary(
      moduleExercises.filter(isCompleted).length,
      moduleExercises.length,
    ),
    lesson: createSummary(
      lessonExercises.filter(isCompleted).length,
      lessonExercises.length,
    ),
  };
}
