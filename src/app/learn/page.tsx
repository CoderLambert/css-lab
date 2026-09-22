import { notFound } from "next/navigation";

import { LearningWorkspace } from "@/features/learning/components/learning-workspace";
import { FileContentReader } from "@/lib/content/file/file-content-reader";

const contentReader = new FileContentReader();

export default async function LearnPage() {
  const course = await contentReader.getCourseBySlug("css-foundations");
  const flexboxModule = course
    ? await contentReader.getModuleBySlug(course.slug, "flexbox")
    : null;
  const lesson = course && flexboxModule
    ? await contentReader.getLessonBySlug(course.slug, flexboxModule.slug, "flexbox-alignment")
    : null;
  const exercise = course && flexboxModule && lesson
    ? await contentReader.getExerciseBySlug(
        course.slug,
        flexboxModule.slug,
        lesson.slug,
        "center-box",
      )
    : null;

  if (!course || !flexboxModule || !lesson || !exercise) {
    notFound();
  }

  return <LearningWorkspace lesson={lesson} exercise={exercise} />;
}
