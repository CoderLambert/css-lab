import { notFound, redirect } from "next/navigation";

import { readFirstPublishedExercise } from "@/features/learning/lib/learner-content";
import { createLearnExerciseHref } from "@/features/learning/lib/learner-navigation";
import { FileContentReader } from "@/lib/content/file/file-content-reader";

const contentReader = new FileContentReader();

export default async function LearnPage() {
  const firstExercise = await readFirstPublishedExercise(contentReader);

  if (!firstExercise) {
    notFound();
  }

  redirect(createLearnExerciseHref(firstExercise));
}
