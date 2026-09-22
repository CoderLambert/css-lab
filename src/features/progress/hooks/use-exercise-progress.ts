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
  updateCss: (nextCss: string) => void;
  resetCss: () => void;
  markCompleted: () => void;
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
  const hasLocalMutationRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    void progressStore
      .getExercise(exerciseId, revision)
      .then((savedProgress) => {
        if (
          cancelled ||
          hasLocalMutationRef.current ||
          !savedProgress
        ) {
          return;
        }

        setCss(savedProgress.code);
      })
      .catch(reportPersistenceError);

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

  const markCompleted = () => {
    hasLocalMutationRef.current = true;
    const now = Date.now();

    void progressStore
      .markCompleted({
        exerciseId,
        revision,
        code: css,
        updatedAt: now,
        completedAt: now,
      })
      .catch(reportPersistenceError);
  };

  return {
    css,
    updateCss,
    resetCss,
    markCompleted,
  };
}
