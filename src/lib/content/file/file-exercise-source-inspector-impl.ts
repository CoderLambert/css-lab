import { join } from "node:path";

import type { ExerciseAssetInspection, ExerciseSourceInspector, ExerciseSourceRef } from "../exercise-source";
import { SlugSchema } from "../schemas/common";
import { canonicalContentRoot, safeDirectory, scanRegularFiles } from "./secure-content-path";

function ensureSlug(slug: string): void {
  if (!SlugSchema.safeParse(slug).success) throw new Error("Invalid content slug");
}

export class FileExerciseSourceInspector implements ExerciseSourceInspector {
  constructor(private readonly configuredCoursesRoot = join(process.cwd(), "content", "courses")) {}

  async inspectExercise(source: ExerciseSourceRef): Promise<ExerciseAssetInspection> {
    ensureSlug(source.courseSlug);
    ensureSlug(source.moduleSlug);
    ensureSlug(source.lessonSlug);
    ensureSlug(source.exerciseSlug);

    const root = await canonicalContentRoot(this.configuredCoursesRoot);
    const exercise = [
      source.courseSlug, "modules", source.moduleSlug, "lessons",
      source.lessonSlug, "exercises", source.exerciseSlug,
    ];
    await safeDirectory(root, exercise);
    try {
      const starterPaths = await scanRegularFiles(root, [...exercise, "starter"]);
      const solution = await safeDirectory(root, [...exercise, "solution"], { allowMissing: true });
      const solutionPaths = solution ? await scanRegularFiles(root, [...exercise, "solution"]) : [];
      return { starterPaths, solutionPaths };
    } catch (error) {
      throw new Error("Failed to inspect exercise source", { cause: error });
    }
  }
}
