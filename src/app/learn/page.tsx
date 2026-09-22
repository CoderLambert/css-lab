import { notFound } from "next/navigation";

import { LearningWorkspace } from "@/features/learning/components/learning-workspace";
import { FileContentReader } from "@/lib/content/file/file-content-reader";

const contentReader = new FileContentReader();

export default async function LearnPage() {
  const course = await contentReader.getCourseBySlug("css-foundations");

  if (!course || course.status !== "published") {
    notFound();
  }

  const flexboxModule = await contentReader.getModuleBySlug(course.slug, "flexbox");

  if (!flexboxModule || flexboxModule.status !== "published") {
    notFound();
  }

  const lesson = await contentReader.getLessonBySlug(
    course.slug,
    flexboxModule.slug,
    "flexbox-alignment",
  );

  if (!lesson || lesson.status !== "published") {
    notFound();
  }

  const exercise = await contentReader.getExerciseBySlug(
    course.slug,
    flexboxModule.slug,
    lesson.slug,
    "center-box",
  );

  if (!exercise || exercise.status !== "published") {
    notFound();
  }

  return <LearningWorkspace lesson={lesson} exercise={exercise} />;
}
