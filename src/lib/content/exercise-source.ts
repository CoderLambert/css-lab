import type { WorkspacePath } from "../workspace/types";

export interface ExerciseSourceRef {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
  exerciseSlug: string;
}

export interface ExerciseAssetInspection {
  starterPaths: readonly WorkspacePath[];
  solutionPaths: readonly WorkspacePath[];
}

export interface ExerciseSourceInspector {
  inspectExercise(source: ExerciseSourceRef): Promise<ExerciseAssetInspection>;
}
