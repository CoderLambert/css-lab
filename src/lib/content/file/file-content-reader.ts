import "server-only";

import { join } from "node:path";

import { SlugSchema } from "../schemas/common";
import { CourseRecordSchema } from "../schemas/course";
import { ExerciseRecordSchema } from "../schemas/exercise";
import { LessonRecordSchema } from "../schemas/lesson";
import { ModuleRecordSchema } from "../schemas/module";
import type { ContentReader } from "../reader";
import type { Course, Exercise, Lesson, Module } from "../types";
import { assertSlugMatchesDirectory, readJsonFile, readTextFile } from "./file-utils";
import { canonicalContentRoot, listSafeDirectoryNames, safeDirectory, safeRegularFile } from "./secure-content-path";

type OrderedEntity = { order: number };

function sortByOrder<T extends OrderedEntity>(entities: T[]): T[] {
  return entities.toSorted((left, right) => left.order - right.order);
}

function ensureSlug(slug: string): void {
  if (!SlugSchema.safeParse(slug).success) throw new Error("Invalid content slug");
}

export class FileContentReader implements ContentReader {
  constructor(private readonly configuredCoursesRoot = join(process.cwd(), "content", "courses")) {}

  private root(): Promise<string> {
    return canonicalContentRoot(this.configuredCoursesRoot);
  }

  async listCourses(): Promise<Course[]> {
    const root = await this.root();
    const names = await listSafeDirectoryNames(root, []);
    return sortByOrder(await Promise.all(names.map((name) => this.readCourse(root, name))));
  }

  async getCourseBySlug(slug: string): Promise<Course | null> {
    ensureSlug(slug);
    const root = await this.root();
    if (!(await safeDirectory(root, [slug], { allowMissing: true }))) return null;
    return this.readCourse(root, slug);
  }

  async listModules(courseSlug: string): Promise<Module[]> {
    ensureSlug(courseSlug);
    const course = await this.getCourseBySlug(courseSlug);
    if (!course) return [];
    const root = await this.root();
    const names = await listSafeDirectoryNames(root, [courseSlug, "modules"]);
    return sortByOrder(await Promise.all(names.map((name) =>
      this.readModule(root, courseSlug, name, course.id))));
  }

  async getModuleBySlug(courseSlug: string, moduleSlug: string): Promise<Module | null> {
    ensureSlug(courseSlug); ensureSlug(moduleSlug);
    const course = await this.getCourseBySlug(courseSlug);
    if (!course) return null;
    const root = await this.root();
    if (!(await safeDirectory(root, [courseSlug, "modules", moduleSlug], { allowMissing: true }))) return null;
    return this.readModule(root, courseSlug, moduleSlug, course.id);
  }

  async listLessons(courseSlug: string, moduleSlug: string): Promise<Lesson[]> {
    ensureSlug(courseSlug); ensureSlug(moduleSlug);
    const parent = await this.getModuleBySlug(courseSlug, moduleSlug);
    if (!parent) return [];
    const root = await this.root();
    const names = await listSafeDirectoryNames(root, [courseSlug, "modules", moduleSlug, "lessons"]);
    return sortByOrder(await Promise.all(names.map((name) =>
      this.readLesson(root, courseSlug, moduleSlug, name, parent))));
  }

  async getLessonBySlug(courseSlug: string, moduleSlug: string, lessonSlug: string): Promise<Lesson | null> {
    ensureSlug(courseSlug); ensureSlug(moduleSlug); ensureSlug(lessonSlug);
    const parent = await this.getModuleBySlug(courseSlug, moduleSlug);
    if (!parent) return null;
    const root = await this.root();
    if (!(await safeDirectory(root, [courseSlug, "modules", moduleSlug, "lessons", lessonSlug], { allowMissing: true }))) return null;
    return this.readLesson(root, courseSlug, moduleSlug, lessonSlug, parent);
  }

  async listExercises(courseSlug: string, moduleSlug: string, lessonSlug: string): Promise<Exercise[]> {
    ensureSlug(courseSlug); ensureSlug(moduleSlug); ensureSlug(lessonSlug);
    const lesson = await this.getLessonBySlug(courseSlug, moduleSlug, lessonSlug);
    if (!lesson) return [];
    const root = await this.root();
    const parent = [courseSlug, "modules", moduleSlug, "lessons", lessonSlug, "exercises"];
    const names = await listSafeDirectoryNames(root, parent);
    return sortByOrder(await Promise.all(names.map((name) =>
      this.readExercise(root, courseSlug, moduleSlug, lessonSlug, name, lesson))));
  }

  async getExerciseBySlug(courseSlug: string, moduleSlug: string, lessonSlug: string, exerciseSlug: string): Promise<Exercise | null> {
    ensureSlug(courseSlug); ensureSlug(moduleSlug); ensureSlug(lessonSlug); ensureSlug(exerciseSlug);
    const lesson = await this.getLessonBySlug(courseSlug, moduleSlug, lessonSlug);
    if (!lesson) return null;
    const root = await this.root();
    const segments = [courseSlug, "modules", moduleSlug, "lessons", lessonSlug, "exercises", exerciseSlug];
    if (!(await safeDirectory(root, segments, { allowMissing: true }))) return null;
    return this.readExercise(root, courseSlug, moduleSlug, lessonSlug, exerciseSlug, lesson);
  }

  private async readCourse(root: string, directoryName: string): Promise<Course> {
    const segments = [directoryName];
    const directoryPath = (await safeDirectory(root, segments))!;
    const metadataPath = (await safeRegularFile(root, [...segments, "course.json"]))!;
    const record = await readJsonFile(metadataPath, CourseRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);
    return { ...record };
  }

  private async readModule(root: string, courseSlug: string, directoryName: string, courseId: string): Promise<Module> {
    const segments = [courseSlug, "modules", directoryName];
    const directoryPath = (await safeDirectory(root, segments))!;
    const metadataPath = (await safeRegularFile(root, [...segments, "module.json"]))!;
    const record = await readJsonFile(metadataPath, ModuleRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);
    return { ...record, courseId };
  }

  private async readLesson(root: string, courseSlug: string, moduleSlug: string, directoryName: string, module: Module): Promise<Lesson> {
    const segments = [courseSlug, "modules", moduleSlug, "lessons", directoryName];
    const directoryPath = (await safeDirectory(root, segments))!;
    const metadataPath = (await safeRegularFile(root, [...segments, "lesson.json"]))!;
    const record = await readJsonFile(metadataPath, LessonRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);
    return { ...record, courseId: module.courseId, moduleId: module.id };
  }

  private async readExercise(root: string, courseSlug: string, moduleSlug: string, lessonSlug: string, directoryName: string, lesson: Lesson): Promise<Exercise> {
    const segments = [courseSlug, "modules", moduleSlug, "lessons", lessonSlug, "exercises", directoryName];
    const directoryPath = (await safeDirectory(root, segments))!;
    const metadataPath = (await safeRegularFile(root, [...segments, "exercise.json"]))!;
    const record = await readJsonFile(metadataPath, ExerciseRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);

    const starterRoot = [...segments, "starter"];
    await safeDirectory(root, starterRoot);
    const starterEntries = await Promise.all(record.workspace.files.map(async (file) => {
      const filePath = (await safeRegularFile(root, [...starterRoot, ...file.path.split("/")]))!;
      return [file.path, await readTextFile(filePath)] as const;
    }));

    return {
      schemaVersion: 2,
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
        definition: { files: record.workspace.files.map((file) => ({ ...file })) },
        starter: { files: Object.fromEntries(starterEntries) },
      },
      runtime: { ...record.runtime },
    };
  }
}
