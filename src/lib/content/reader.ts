import type { Course, Exercise, Lesson, Module } from "./types";

export interface ContentReader {
  listCourses(): Promise<Course[]>;

  getCourseBySlug(slug: string): Promise<Course | null>;

  listModules(courseSlug: string): Promise<Module[]>;

  getModuleBySlug(courseSlug: string, moduleSlug: string): Promise<Module | null>;

  listLessons(courseSlug: string, moduleSlug: string): Promise<Lesson[]>;

  getLessonBySlug(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
  ): Promise<Lesson | null>;

  listExercises(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
  ): Promise<Exercise[]>;

  getExerciseBySlug(
    courseSlug: string,
    moduleSlug: string,
    lessonSlug: string,
    exerciseSlug: string,
  ): Promise<Exercise | null>;
}
