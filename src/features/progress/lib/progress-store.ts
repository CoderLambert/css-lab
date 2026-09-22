import type { ExerciseProgress } from "./progress-schema";

export interface ExerciseProgressKey {
  exerciseId: string;
  revision: number;
}

export interface SaveExerciseCodeInput extends ExerciseProgressKey {
  code: string;
  updatedAt: number;
}

export interface MarkExerciseCompletedInput extends SaveExerciseCodeInput {
  completedAt: number;
}

export interface ProgressStore {
  getExercise(
    exerciseId: string,
    revision: number,
  ): Promise<ExerciseProgress | null>;

  saveCode(input: SaveExerciseCodeInput): Promise<void>;

  markCompleted(input: MarkExerciseCompletedInput): Promise<void>;
}
