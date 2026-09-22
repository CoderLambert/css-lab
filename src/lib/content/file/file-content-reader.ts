import "server-only";

import { readdir } from "node:fs/promises";
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

async function listDirectoryNames(directoryPath: string): Promise<string[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .toSorted();
}

export class FileContentReader implements ContentReader {
  private readonly coursesRoot: string;

  constructor(coursesRoot = join(process.cwd(), "content", "courses")) {
    this.coursesRoot = coursesRoot;
  }

  async listCourses(): Promise<Course[]> {
    const directoryNames = await listDirectoryNames(this.coursesRoot);
    const courses = await Promise.all(
      directoryNames.map((directoryName) => this.readCourse(directoryName)),
    );

    return sortByOrder(courses.filter((course) => course.status === "published"));
  }

  async getCourseBySlug(slug: string): Promise<Course | null> {
    ensureSlug(slug);
    const courses = await this.listCourses();

    return courses.find((course) => course.slug === slug) ?? null;
  }

  async listModules(courseSlug: string): Promise<Module[]> {
    ensureSlug(courseSlug);
    const course = await this.getCourseBySlug(courseSlug);

    if (!course) {
      return [];
    }

    const modulesDirectory = join(this.coursesRoot, courseSlug, "modules");
    const directoryNames = await listDirectoryNames(modulesDirectory);
    const modules = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readModule(courseSlug, directoryName, course.id),
      ),
    );

    return sortByOrder(modules.filter((module) => module.status === "published"));
  }

  async getModuleBySlug(
    courseSlug: string,
    moduleSlug: string,
  ): Promise<Module | null> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    const modules = await this.listModules(courseSlug);

    return modules.find((module) => module.slug === moduleSlug) ?? null;
  }

  async listLessons(courseSlug: string, moduleSlug: string): Promise<Lesson[]> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    const parentModule = await this.getModuleBySlug(courseSlug, moduleSlug);

    if (!parentModule) {
      return [];
    }

    const lessonsDirectory = join(
      this.coursesRoot,
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
    );
    const directoryNames = await listDirectoryNames(lessonsDirectory);
    const lessons = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readLesson(courseSlug, moduleSlug, directoryName, parentModule),
      ),
    );

    return sortByOrder(lessons.filter((lesson) => lesson.status === "published"));
  }

  async getLessonBySlug(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
  ): Promise<Lesson | null> {
    ensureSlug(courseSlug);
    ensureSlug(moduleSlug);
    ensureSlug(lessonSlug);
    const lessons = await this.listLessons(courseSlug, moduleSlug);

    return lessons.find((lesson) => lesson.slug === lessonSlug) ?? null;
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

    const exercisesDirectory = join(
      this.coursesRoot,
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
      lessonSlug,
      "exercises",
    );
    const directoryNames = await listDirectoryNames(exercisesDirectory);
    const exercises = await Promise.all(
      directoryNames.map((directoryName) =>
        this.readExercise(
          courseSlug,
          moduleSlug,
          lessonSlug,
          directoryName,
          lesson,
        ),
      ),
    );

    return sortByOrder(exercises.filter((exercise) => exercise.status === "published"));
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
    const exercises = await this.listExercises(courseSlug, moduleSlug, lessonSlug);

    return exercises.find((exercise) => exercise.slug === exerciseSlug) ?? null;
  }

  private async readCourse(directoryName: string): Promise<Course> {
    const directoryPath = join(this.coursesRoot, directoryName);
    const metadataPath = join(directoryPath, "course.json");
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
    courseSlug: string,
    directoryName: string,
    courseId: string,
  ): Promise<Module> {
    const directoryPath = join(this.coursesRoot, courseSlug, "modules", directoryName);
    const metadataPath = join(directoryPath, "module.json");
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
    courseSlug: string,
    moduleSlug: string,
    directoryName: string,
    module: Module,
  ): Promise<Lesson> {
    const directoryPath = join(
      this.coursesRoot,
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
      directoryName,
    );
    const metadataPath = join(directoryPath, "lesson.json");
    const record = await readJsonFile(metadataPath, LessonRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);
    const bodyMdx = await readTextFile(join(directoryPath, "lesson.mdx"));

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
      bodyMdx,
    };
  }

  private async readExercise(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    directoryName: string,
    lesson: Lesson,
  ): Promise<Exercise> {
    const directoryPath = join(
      this.coursesRoot,
      courseSlug,
      "modules",
      moduleSlug,
      "lessons",
      lessonSlug,
      "exercises",
      directoryName,
    );
    const metadataPath = join(directoryPath, "exercise.json");
    const record = await readJsonFile(metadataPath, ExerciseRecordSchema);
    assertSlugMatchesDirectory(directoryPath, metadataPath, record.slug);
    const [fixtureHtml, starterCss] = await Promise.all([
      readTextFile(join(directoryPath, "fixture.html")),
      readTextFile(join(directoryPath, "starter.css")),
    ]);

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
      fixtureHtml,
      starterCss,
    };
  }
}
