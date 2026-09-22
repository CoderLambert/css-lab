"use client";

import { useEffect, useRef, useState } from "react";

import {
  createInitialDraft,
  resetDraft,
  resetDraftFile,
  updateDraftFile,
} from "@/lib/workspace/draft";
import type {
  ExerciseDraft,
  ExerciseWorkspace,
  WorkspacePath,
} from "@/lib/workspace/types";
import { IndexedDbProgressStore } from "../lib/indexeddb-progress-store";
import { reconcileDraft } from "../lib/reconcile-draft";
import type { ProgressStore } from "../lib/progress-store";

interface UseExerciseProgressInput {
  exerciseId: string;
  revision: number;
  workspace: ExerciseWorkspace;
}

interface UseExerciseProgressResult {
  draft: ExerciseDraft;
  isHydrated: boolean;
  updateFile: (path: WorkspacePath, content: string) => void;
  resetFile: (path: WorkspacePath) => void;
  resetAll: () => void;
  markCompleted: (draft: ExerciseDraft) => Promise<void>;
}

const progressStore: ProgressStore = new IndexedDbProgressStore();

function reportPersistenceError(error: unknown): void {
  if (process.env.NODE_ENV !== "production") {
    console.warn("Lab progress persistence failed", error);
  }
}

export function useExerciseProgress({
  exerciseId,
  revision,
  workspace,
}: UseExerciseProgressInput): UseExerciseProgressResult {
  const initialDraft = createInitialDraft(workspace);
  const [draft, setDraft] = useState<ExerciseDraft>(initialDraft);
  const draftRef = useRef<ExerciseDraft>(initialDraft);
  const [hydratedExerciseKey, setHydratedExerciseKey] = useState<
    string | null
  >(null);
  const hasLocalMutationRef = useRef(false);
  const currentExerciseKey = `${exerciseId}:${revision}`;

  useEffect(() => {
    let cancelled = false;
    const exerciseKey = `${exerciseId}:${revision}`;
    const nextInitialDraft = createInitialDraft(workspace);

    hasLocalMutationRef.current = false;
    draftRef.current = nextInitialDraft;
    setDraft(nextInitialDraft);
    setHydratedExerciseKey(null);

    void progressStore
      .getExercise(exerciseId, revision)
      .then((savedProgress) => {
        if (cancelled) {
          return;
        }

        if (!hasLocalMutationRef.current) {
          const nextDraft = reconcileDraft(
            workspace,
            savedProgress?.files ?? {},
          );
          draftRef.current = nextDraft;
          setDraft(nextDraft);
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
  }, [exerciseId, revision, workspace]);

  const persistDraft = (nextDraft: ExerciseDraft) => {
    void progressStore
      .saveDraft({
        exerciseId,
        revision,
        files: { ...nextDraft.files },
        updatedAt: Date.now(),
      })
      .catch(reportPersistenceError);
  };

  const applyDraft = (nextDraft: ExerciseDraft) => {
    hasLocalMutationRef.current = true;
    draftRef.current = nextDraft;
    setDraft(nextDraft);
    persistDraft(nextDraft);
  };

  const updateFile = (
    path: WorkspacePath,
    content: string,
  ) => {
    applyDraft(
      updateDraftFile(
        workspace,
        draftRef.current,
        path,
        content,
      ),
    );
  };

  const resetFile = (path: WorkspacePath) => {
    applyDraft(
      resetDraftFile(
        workspace,
        draftRef.current,
        path,
      ),
    );
  };

  const resetAll = () => {
    applyDraft(resetDraft(workspace));
  };

  const markCompleted = (
    capturedDraft: ExerciseDraft,
  ): Promise<void> => {
    hasLocalMutationRef.current = true;
    const now = Date.now();

    return progressStore
      .markCompleted({
        exerciseId,
        revision,
        files: { ...capturedDraft.files },
        updatedAt: now,
        completedAt: now,
      })
      .catch((error: unknown) => {
        reportPersistenceError(error);
        throw error;
      });
  };

  return {
    draft,
    isHydrated: hydratedExerciseKey === currentExerciseKey,
    updateFile,
    resetFile,
    resetAll,
    markCompleted,
  };
}
