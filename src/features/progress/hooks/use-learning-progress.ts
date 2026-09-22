"use client";

import { useEffect, useMemo, useState } from "react";

import { IndexedDbProgressStore } from "../lib/indexeddb-progress-store";
import {
  aggregateLearningProgress,
  type LearningProgress,
  type ProgressExerciseDescriptor,
} from "../lib/progress-aggregation";
import type { ProgressStore } from "../lib/progress-store";

interface UseLearningProgressInput {
  exercises: readonly ProgressExerciseDescriptor[];
  currentModuleId: string;
  currentLessonId: string;
  refreshToken: number;
}

interface UseLearningProgressResult {
  isHydrated: boolean;
  progress: LearningProgress;
}

const progressStore: ProgressStore = new IndexedDbProgressStore();

function reportPersistenceError(error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn("CSS Lab progress persistence failed", error);
  }
}

function createProgressRequestKey(
  exercises: readonly ProgressExerciseDescriptor[],
  currentModuleId: string,
  currentLessonId: string,
  refreshToken: number,
): string {
  return JSON.stringify({
    currentModuleId,
    currentLessonId,
    refreshToken,
    exercises: exercises.map(
      ({ exerciseId, revision, moduleId, lessonId }) => [
        exerciseId,
        revision,
        moduleId,
        lessonId,
      ],
    ),
  });
}

export function useLearningProgress({
  exercises,
  currentModuleId,
  currentLessonId,
  refreshToken,
}: UseLearningProgressInput): UseLearningProgressResult {
  const exerciseKeys = useMemo(
    () =>
      exercises.map(({ exerciseId, revision }) => ({
        exerciseId,
        revision,
      })),
    [exercises],
  );
  const requestKey = createProgressRequestKey(
    exercises,
    currentModuleId,
    currentLessonId,
    refreshToken,
  );
  const [progress, setProgress] = useState(() =>
    aggregateLearningProgress(
      exercises,
      [],
      currentModuleId,
      currentLessonId,
    ),
  );
  const [hydratedRequestKey, setHydratedRequestKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    void progressStore
      .getExercises(exerciseKeys)
      .then((storedProgress) => {
        if (cancelled) {
          return;
        }

        setProgress(
          aggregateLearningProgress(
            exercises,
            storedProgress,
            currentModuleId,
            currentLessonId,
          ),
        );
        setHydratedRequestKey(requestKey);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        reportPersistenceError(error);
        setProgress(
          aggregateLearningProgress(
            exercises,
            [],
            currentModuleId,
            currentLessonId,
          ),
        );
        setHydratedRequestKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [
    currentLessonId,
    currentModuleId,
    exerciseKeys,
    exercises,
    requestKey,
  ]);

  return {
    isHydrated: hydratedRequestKey === requestKey,
    progress,
  };
}
