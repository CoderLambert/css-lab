import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { CheckResults } from "@/features/exercise/components/check-results";
import type { CheckState } from "@/features/exercise/lib/check-state";
import type { Exercise, Lesson } from "@/lib/content/types";

interface LessonPanelProps {
  moduleTitle: string;
  lesson: Omit<Lesson, "bodyMdxSource">;
  lessonContent: ReactNode;
  exercise: Exercise;
  checkState?: CheckState;
}

export function LessonPanel({
  moduleTitle,
  lesson,
  lessonContent,
  exercise,
  checkState,
}: LessonPanelProps) {
  const lessonNumber = String(lesson.order).padStart(2, "0");

  return (
    <section
      className="flex h-full min-w-0 flex-col bg-panel"
      aria-labelledby="lesson-title"
    >
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold tabular-nums text-accent-foreground">
            {lessonNumber}
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Lesson
            </p>
            <h2
              id="lesson-title"
              className="mt-1 font-heading text-base font-semibold text-panel-foreground"
            >
              {lesson.title}
            </h2>
          </div>
        </div>
        <span className="shrink-0 pt-1 text-xs text-muted-foreground">
          {lesson.estimatedMinutes} min
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        <Badge
          variant="secondary"
          className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground"
        >
          {moduleTitle}
        </Badge>

        <h1 className="mt-5 max-w-[22rem] font-heading text-[clamp(1.45rem,2.5vw,1.85rem)] font-semibold leading-tight tracking-[-0.035em] text-panel-foreground">
          {exercise.title}
        </h1>
        <p className="mt-4 max-w-[30rem] text-sm leading-7 text-muted-foreground">
          {lesson.description}
        </p>

        <div className="mt-7 border-t border-border pt-5">
          <p className="text-sm font-semibold text-panel-foreground">知识要点</p>
          <div className="mt-3">{lessonContent}</div>
        </div>

        <div className="mt-7">
          <p className="text-sm font-semibold text-panel-foreground">本题任务</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            {exercise.prompt}
          </p>
        </div>

        {checkState ? <CheckResults state={checkState} /> : null}

        <div className="mt-7 border-t border-border pt-5">
          <p className="text-sm font-semibold text-panel-foreground">提示</p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            {exercise.hints.map((hint) => (
              <li key={hint} className="flex gap-2.5">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-success"
                  aria-hidden="true"
                />
                <span>{hint}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
