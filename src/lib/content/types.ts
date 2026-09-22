import type { Check } from "./schemas/exercise";

export type EntityStatus = "draft" | "published";

export interface Course {
  schemaVersion: 1;
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  status: EntityStatus;
}

export interface Module {
  schemaVersion: 1;
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  status: EntityStatus;
  courseId: string;
}

export interface Lesson {
  schemaVersion: 1;
  id: string;
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  order: number;
  status: EntityStatus;
  courseId: string;
  moduleId: string;
  bodyMdx: string;
}

export interface Exercise {
  schemaVersion: 1;
  id: string;
  revision: number;
  slug: string;
  title: string;
  prompt: string;
  order: number;
  status: EntityStatus;
  hints: string[];
  checks: Check[];
  courseId: string;
  moduleId: string;
  lessonId: string;
  fixtureHtml: string;
  starterCss: string;
}
