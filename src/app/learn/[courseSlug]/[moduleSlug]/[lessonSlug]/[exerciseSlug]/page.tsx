import { notFound } from "next/navigation";

import { LearningWorkspace } from "@/features/learning/components/learning-workspace";
import { readPublishedExerciseSequence } from "@/features/learning/lib/learner-content";
import { renderLessonContent } from "@/features/learning/generated/lesson-content-registry";
import { createLearnerNavigation } from "@/features/learning/lib/learner-navigation";
import { FileContentReader } from "@/lib/content/file/file-content-reader";
import { SlugSchema } from "@/lib/content/schemas/common";

const contentReader = new FileContentReader();

interface LearnExercisePageProps {
  params: Promise<{
    courseSlug: string;
    moduleSlug: string;
    lessonSlug: string;
    exerciseSlug: string;
  }>;
}

export default async function LearnExercisePage({
  params,
}: LearnExercisePageProps) {
  const {
    courseSlug,
    moduleSlug,
    lessonSlug,
    exerciseSlug,
  } = await params;

  if (
    [courseSlug, moduleSlug, lessonSlug, exerciseSlug].some(
      (slug) => !SlugSchema.safeParse(slug).success,
    )
  ) {
    notFound();
  }

  const course = await contentReader.getCourseBySlug(courseSlug);

  if (!course || course.status !== "published") {
    notFound();
  }

  const courseModule = await contentReader.getModuleBySlug(
    courseSlug,
    moduleSlug,
  );

  if (
    !courseModule ||
    courseModule.status !== "published" ||
    courseModule.courseId !== course.id
  ) {
    notFound();
  }

  const lesson = await contentReader.getLessonBySlug(
    courseSlug,
    moduleSlug,
    lessonSlug,
  );

  if (
    !lesson ||
    lesson.status !== "published" ||
    lesson.courseId !== course.id ||
    lesson.moduleId !== courseModule.id
  ) {
    notFound();
  }

  const exercise = await contentReader.getExerciseBySlug(
    courseSlug,
    moduleSlug,
    lessonSlug,
    exerciseSlug,
  );

  if (
    !exercise ||
    exercise.status !== "published" ||
    exercise.courseId !== course.id ||
    exercise.moduleId !== courseModule.id ||
    exercise.lessonId !== lesson.id
  ) {
    notFound();
  }

  const sequence = await readPublishedExerciseSequence(contentReader, course);
  const isInPublishedSequence = sequence.some(
    (entry) =>
      entry.exercise.id === exercise.id &&
      entry.exercise.revision === exercise.revision,
  );

  if (!isInPublishedSequence) {
    notFound();
  }

  const lessonContentKey = `${course.slug}/${courseModule.slug}/${lesson.slug}`;
  const lessonContent = renderLessonContent(lessonContentKey);

  if (!lessonContent) {
    notFound();
  }

  const navigation = createLearnerNavigation(sequence, exercise);

  return (
    <LearningWorkspace
      course={course}
      module={courseModule}
      lesson={lesson}
      lessonContent={lessonContent}
      exercise={exercise}
      navigation={navigation}
    />
  );
}
