import type { ReactNode } from "react";

import type { Exercise, Lesson } from "@/lib/content/types";

interface LessonPanelProps {
  moduleTitle: string;
  lesson: Lesson;
  lessonContent: ReactNode;
  exercise: Exercise;
}

export function LessonPanel({
  moduleTitle,
  lesson,
  lessonContent,
  exercise,
}: LessonPanelProps) {
  const lessonNumber = String(lesson.order).padStart(2, "0");

  return (
    <section
      className="flex h-full min-w-0 flex-col bg-panel"
      aria-labelledby="lesson-title"
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-6 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            <span>{moduleTitle}</span>
            <span aria-hidden="true">·</span>
            <span>Lesson {lessonNumber}</span>
            <span aria-hidden="true">·</span>
            <span>{lesson.estimatedMinutes} min</span>
          </div>

          <h1
            id="lesson-title"
            className="mt-4 font-heading text-3xl font-semibold leading-tight tracking-[-0.035em] text-panel-foreground"
          >
            {lesson.title}
          </h1>

          <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
            {lesson.description}
          </p>

          <div className="mt-8 border-y border-border py-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Current exercise
            </p>
            <h2 className="mt-2 font-heading text-lg font-semibold text-panel-foreground">
              {exercise.title}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {exercise.prompt}
            </p>
          </div>

          <article className="mt-8 space-y-6 text-muted-foreground">
            {lessonContent}
          </article>
        </div>
      </div>
    </section>
  );
}
