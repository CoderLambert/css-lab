import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { LessonContentInspection, LessonContentInspector, LessonSourceRef } from "../lesson-content-source";
import { SlugSchema } from "../schemas/common";
import { canonicalContentRoot, safeRegularFile } from "./secure-content-path";

function ensureSlug(slug: string): void {
  if (!SlugSchema.safeParse(slug).success) throw new Error("Invalid content slug");
}

export class FileLessonContentInspector implements LessonContentInspector {
  constructor(private readonly configuredCoursesRoot = join(process.cwd(), "content", "courses")) {}

  async inspectLessonContent(source: LessonSourceRef): Promise<LessonContentInspection> {
    ensureSlug(source.courseSlug);
    ensureSlug(source.moduleSlug);
    ensureSlug(source.lessonSlug);
    const root = await canonicalContentRoot(this.configuredCoursesRoot);
    const path = await safeRegularFile(root, [
      source.courseSlug, "modules", source.moduleSlug, "lessons", source.lessonSlug, "lesson.mdx",
    ], { allowMissing: true });
    if (!path) return { exists: false, isEmpty: true };
    try {
      const content = await readFile(path, "utf8");
      return { exists: true, isEmpty: content.trim().length === 0 };
    } catch (error) {
      throw new Error("Failed to inspect lesson content", { cause: error });
    }
  }
}
