import type { ExerciseProgress } from "./progress-schema";

export interface ExerciseProgressKey {
  exerciseId: string;
  revision: number;
}

export interface SaveExerciseDraftInput extends ExerciseProgressKey {
  files: Record<string, string>;
  updatedAt: number;
}

export interface MarkExerciseCompletedInput extends SaveExerciseDraftInput {
  completedAt: number;
}

export interface ProgressStore {
  getExercise(
    exerciseId: string,
    revision: number,
  ): Promise<ExerciseProgress | null>;

  getExercises(
    keys: readonly ExerciseProgressKey[],
  ): Promise<ExerciseProgress[]>;

  saveDraft(input: SaveExerciseDraftInput): Promise<void>;

  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
