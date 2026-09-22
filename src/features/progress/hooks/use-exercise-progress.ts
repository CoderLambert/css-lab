"use client";

import { useEffect, useRef, useState } from "react";

import { IndexedDbProgressStore } from "../lib/indexeddb-progress-store";
import type { ProgressStore } from "../lib/progress-store";

interface UseExerciseProgressInput {
  exerciseId: string;
  revision: number;
  starterCss: string;
}

interface UseExerciseProgressResult {
  css: string;
  isHydrated: boolean;
  updateCss: (nextCss: string) => void;
  resetCss: () => void;
  markCompleted: (code: string) => Promise<void>;
}

const progressStore: ProgressStore = new IndexedDbProgressStore();

function reportPersistenceError(error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn("CSS Lab progress persistence failed", error);
  }
}

export function useExerciseProgress({
  exerciseId,
  revision,
  starterCss,
}: UseExerciseProgressInput): UseExerciseProgressResult {
  const [css, setCss] = useState(starterCss);
  const [hydratedExerciseKey, setHydratedExerciseKey] = useState<string | null>(
    null,
  );
  const hasLocalMutationRef = useRef(false);
  const currentExerciseKey = `${exerciseId}:${revision}`;

  useEffect(() => {
    let cancelled = false;
    hasLocalMutationRef.current = false;
    const exerciseKey = `${exerciseId}:${revision}`;

    void progressStore
      .getExercise(exerciseId, revision)
      .then((savedProgress) => {
        if (cancelled) {
          return;
        }

        if (!hasLocalMutationRef.current && savedProgress) {
          setCss(savedProgress.code);
        }

        setHydratedExerciseKey(exerciseKey);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        reportPersistenceError(error);
        setHydratedExerciseKey(exerciseKey);
      });

    return () => {
      cancelled = true;
    };
  }, [exerciseId, revision]);

  const saveCode = (nextCss: string) => {
    void progressStore
      .saveCode({
        exerciseId,
        revision,
        code: nextCss,
        updatedAt: Date.now(),
      })
      .catch(reportPersistenceError);
  };

  const updateCss = (nextCss: string) => {
    hasLocalMutationRef.current = true;
    setCss(nextCss);
    saveCode(nextCss);
  };

  const resetCss = () => {
    hasLocalMutationRef.current = true;
    setCss(starterCss);
    saveCode(starterCss);
  };

  const markCompleted = (code: string): Promise<void> => {
    hasLocalMutationRef.current = true;
    const now = Date.now();

    return progressStore
      .markCompleted({
        exerciseId,
        revision,
        code,
        updatedAt: now,
        completedAt: now,
      })
      .catch((error: unknown) => {
        reportPersistenceError(error);
        throw error;
      });
  };

  return {
    css,
    isHydrated: hydratedExerciseKey === currentExerciseKey,
    updateCss,
    resetCss,
    markCompleted,
  };
}
