import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { SlugSchema } from "../schemas/common";
import type {
  LessonContentInspection,
  LessonContentInspector,
  LessonSourceRef,
} from "../lesson-content-source";

function ensureSlug(slug: string): void {
  if (!SlugSchema.safeParse(slug).success) {
    throw new Error(`Invalid content slug "${slug}"`);
  }
}

export class FileLessonContentInspector implements LessonContentInspector {
  private readonly coursesRoot: string;

  constructor(coursesRoot = join(process.cwd(), "content", "courses")) {
    this.coursesRoot = coursesRoot;
  }

  async inspectLessonContent(
    source: LessonSourceRef,
  ): Promise<LessonContentInspection> {
    ensureSlug(source.courseSlug);
    ensureSlug(source.moduleSlug);
    ensureSlug(source.lessonSlug);

    const contentPath = join(
      this.coursesRoot,
      source.courseSlug,
      "modules",
      source.moduleSlug,
      "lessons",
      source.lessonSlug,
      "lesson.mdx",
    );

    let content: string;

    try {
      content = await readFile(contentPath, "utf8");
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code === "ENOENT"
      ) {
        return { exists: false, isEmpty: true };
      }

      throw new Error("Failed to inspect lesson content", { cause: error });
    }

    return {
      exists: true,
      isEmpty: content.trim().length === 0,
    };
  }
}
