import { join } from "node:path";

import { SlugSchema } from "../schemas/common";
import { CourseRecordSchema } from "../schemas/course";
import { ExerciseRecordSchema } from "../schemas/exercise";
import { LessonRecordSchema } from "../schemas/lesson";
import { ModuleRecordSchema } from "../schemas/module";
import type { ContentReader } from "../reader";
import type { Course, Exercise, Lesson, Module } from "../types";
import {
  assertSlugMatchesDirectory,
  readJsonFile,
  readTextFile,
} from "./file-utils";
import {
  canonicalContentRoot,
  listSafeDirectoryNames,
  safeDirectory,
  safeRegularFile,
} from "./secure-content-path";

type OrderedEntity = { order: number };

function sortByOrder<T extends OrderedEntity>(entities: T[]): T[] {
  return entities.toSorted((left, right) => left.order - right.order);
}

function ensureSlug(slug: string): void {
  const result = SlugSchema.safeParse(slug);

  if (!result.success) {
    throw new Error(`Invalid content slug "${slug}"`);
  }
}

export class FileContentReader implements ContentReader {
  private readonly configuredCoursesRoot: string;

  constructor(coursesRoot = join(process.cwd(), "content", "courses")) {
    this.configuredCoursesRoot = coursesRoot;
  }

  private async coursesRoot(): Promise<string> {
    return canonicalContentRoot(this.configuredCoursesRoot);
  }

  async listCourses(): Promise<Course[]> {
    const coursesRoot = await this.coursesRoot();
    const directoryNames = await listSafeDirectoryNames(coursesRoot, []);
    const courses = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readCourse(coursesRoot, directoryName),
      ),
    );

    return sortByOrder(courses);
  }

  async getCourseBySlug(slug: string): Promise<Course | null> {
    ensureSlug(slug);
    const coursesRoot = await this.coursesRoot();
    const directoryPath = await safeDirectory(
      coursesRoot,
      [slug],
      { allowMissing: true },
    );

    if (!directoryPath) {
      return null;
    }

    return this.readCourse(coursesRoot, slug);
  }

  async listModules(courseSlug: string): Promise<Module[]> {
    ensureSlug(courseSlug);
    const course = await this.getCourseBySlug(courseSlug);

    if (!course) {
      return [];
    }

    const coursesRoot = await this.coursesRoot();
    const directoryNames = await listSafeDirectoryNames(
      coursesRoot,
      [courseSlug, "modules"],
    );
    const modules = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readModule(
          coursesRoot,
          courseSlug,
          directoryName,
          course.id,
        ),
      ),
    );

    return sortByOrder(modules);
  }

  async getModuleBySlug(
    courseSlug: string,
    moduleSlug: string,
  ): Promise<Module | null> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    const course = await this.getCourseBySlug(courseSlug);

    if (!course) {
      return null;
    }

    const coursesRoot = await this.coursesRoot();
    const directoryPath = await safeDirectory(
      coursesRoot,
      [courseSlug, "modules", moduleSlug],
      { allowMissing: true },
    );

    if (!directoryPath) {
      return null;
    }

    return this.readModule(
      coursesRoot,
      courseSlug,
      moduleSlug,
      course.id,
    );
  }

  async listLessons(courseSlug: string, moduleSlug: string): Promise<Lesson[]> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    const parentModule = await this.getModuleBySlug(courseSlug, moduleSlug);

    if (!parentModule) {
      return [];
    }

    const coursesRoot = await this.coursesRoot();
    const directoryNames = await listSafeDirectoryNames(
      coursesRoot,
      [courseSlug, "modules", moduleSlug, "lessons"],
    );
    const lessons = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readLesson(
          coursesRoot,
          courseSlug,
          moduleSlug,
          directoryName,
          parentModule,
        ),
      ),
    );

    return sortByOrder(lessons);
  }

  async getLessonBySlug(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
  ): Promise<Lesson | null> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    ensureSlug(lessonSlug);
    const parentModule = await this.getModuleBySlug(courseSlug, moduleSlug);

    if (!parentModule) {
      return null;
    }

    const coursesRoot = await this.coursesRoot();
    const directoryPath = await safeDirectory(
      coursesRoot,
      [courseSlug, "modules", moduleSlug, "lessons", lessonSlug],
      { allowMissing: true },
    );

    if (!directoryPath) {
      return null;
    }

    return this.readLesson(
      coursesRoot,
      courseSlug,
      moduleSlug,
      lessonSlug,
      parentModule,
    );
  }

  async listExercises(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
  ): Promise<Exercise[]> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    ensureSlug(lessonSlug);
    const lesson = await this.getLessonBySlug(courseSlug, moduleSlug, lessonSlug);

    if (!lesson) {
      return [];
    }

    const coursesRoot = await this.coursesRoot();
    const directoryNames = await listSafeDirectoryNames(
      coursesRoot,
      [
        courseSlug,
        "modules",
        moduleSlug,
        "lessons",
        lessonSlug,
        "exercises",
      ],
    );
    const exercises = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readExercise(
          coursesRoot,
          courseSlug,
          moduleSlug,
          lessonSlug,
          directoryName,
          lesson,
        ),
      ),
    );

    return sortByOrder(exercises);
  }

  async getExerciseBySlug(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    exerciseSlug: string,
  ): Promise<Exercise | null> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    ensureSlug(lessonSlug);
    ensureSlug(exerciseSlug);
    const lesson = await this.getLessonBySlug(courseSlug, moduleSlug, lessonSlug);

    if (!lesson) {
      return null;
    }

    const coursesRoot = await this.coursesRoot();
    const directoryPath = await safeDirectory(
      coursesRoot,
      [
        courseSlug,
        "modules",
        moduleSlug,
        "lessons",
        lessonSlug,
        "exercises",
        exerciseSlug,
      ],
      { allowMissing: true },
    );

    if (!directoryPath) {
      return null;
    }

    return this.readExercise(
      coursesRoot,
      courseSlug,
      moduleSlug,
      lessonSlug,
      exerciseSlug,
      lesson,
    );
  }

  private async readCourse(
    coursesRoot: string,
    directoryName: string,
  ): Promise<Course> {
    const segments = [directoryName];
    const directoryPath = (await safeDirectory(coursesRoot, segments))!;
    const metadataPath = (await safeRegularFile(
      coursesRoot,
      [...segments, "course.json"],
    ))!;
    const record = await readJsonFile(metadataPath, CourseRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);

    return {
      schemaVersion: record.schemaVersion,
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      order: record.order,
      status: record.status,
    };
  }

  private async readModule(
    coursesRoot: string,
    courseSlug: string,
    directoryName: string,
    courseId: string,
  ): Promise<Module> {
    const segments = [courseSlug, "modules", directoryName];
    const directoryPath = (await safeDirectory(coursesRoot, segments))!;
    const metadataPath = (await safeRegularFile(
      coursesRoot,
      [...segments, "module.json"],
    ))!;
    const record = await readJsonFile(metadataPath, ModuleRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);

    return {
      schemaVersion: record.schemaVersion,
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      order: record.order,
      status: record.status,
      courseId,
    };
  }

  private async readLesson(
    coursesRoot: string,
    courseSlug: string,
    moduleSlug: string,
    directoryName: string,
    module: Module,
  ): Promise<Lesson> {
    const segments = [
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
      directoryName,
    ];
    const directoryPath = (await safeDirectory(coursesRoot, segments))!;
    const metadataPath = (await safeRegularFile(
      coursesRoot,
      [...segments, "lesson.json"],
    ))!;
    const record = await readJsonFile(metadataPath, LessonRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);

    return {
      schemaVersion: record.schemaVersion,
      id: record.id,
      slug: record.slug,
      title: record.title,
      description: record.description,
      estimatedMinutes: record.estimatedMinutes,
      order: record.order,
      status: record.status,
      courseId: module.courseId,
      moduleId: module.id,
    };
  }

  private async readExercise(
    coursesRoot: string,
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    directoryName: string,
    lesson: Lesson,
  ): Promise<Exercise> {
    const segments = [
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
      lessonSlug,
      "exercises",
      directoryName,
    ];
    const directoryPath = (await safeDirectory(coursesRoot, segments))!;
    const metadataPath = (await safeRegularFile(
      coursesRoot,
      [...segments, "exercise.json"],
    ))!;
    const record = await readJsonFile(metadataPath, ExerciseRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);

    const starterRoot = [...segments, "starter"];
    await safeDirectory(coursesRoot, starterRoot);
    const starterEntries = await Promise.all(
      record.workspace.files.map(async (file) => {
        const starterPath = (await safeRegularFile(
          coursesRoot,
          [...starterRoot, ...file.path.split("/")],
        ))!;

        return [file.path, await readTextFile(starterPath)] as const;
      }),
    );

    return {
      schemaVersion: record.schemaVersion,
      id: record.id,
      revision: record.revision,
      slug: record.slug,
      title: record.title,
      prompt: record.prompt,
      order: record.order,
      status: record.status,
      hints: [...record.hints],
      checks: [...record.checks],
      courseId: lesson.courseId,
      moduleId: lesson.moduleId,
      lessonId: lesson.id,
      workspace: {
        definition: {
          files: record.workspace.files.map((file) => ({ ...file })),
        },
        starter: {
          files: Object.fromEntries(starterEntries),
        },
      },
      runtime: { ...record.runtime },
    };
  }
}
