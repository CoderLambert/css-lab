"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { CheckState } from "@/features/exercise/lib/check-state";
import type { CheckResultMessage } from "@/features/exercise/lib/preview-messages";
import { useExerciseProgress } from "@/features/progress/hooks/use-exercise-progress";
import type { Exercise, Lesson } from "@/lib/content/types";
import { EditorPanel } from "./editor-panel";
import { LessonPanel } from "./lesson-panel";
import { PreviewPanel } from "./preview-panel";
import { WorkspaceFooter } from "./workspace-footer";
import { WorkspaceHeader } from "./workspace-header";

interface LearningWorkspaceProps {
  lesson: Lesson;
  exercise: Exercise;
}

const DESKTOP_WORKSPACE_QUERY = "(min-width: 1200px)";

function subscribeToDesktopWorkspace(onStoreChange: () => void): () => void {
  const mediaQuery = window.matchMedia(DESKTOP_WORKSPACE_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => {
    mediaQuery.removeEventListener("change", onStoreChange);
  };
}

function getDesktopWorkspaceSnapshot(): boolean {
  return window.matchMedia(DESKTOP_WORKSPACE_QUERY).matches;
}

function getDesktopWorkspaceServerSnapshot(): boolean {
  return false;
}

function LearningWorkspaceSession({
  lesson,
  exercise,
}: LearningWorkspaceProps) {
  const {
    css,
    updateCss,
    resetCss,
    markCompleted,
  } = useExerciseProgress({
    exerciseId: exercise.id,
    revision: exercise.revision,
    starterCss: exercise.starterCss,
  });
  const [checkState, setCheckState] = useState<CheckState>({
    status: "idle",
  });
  const requestCounterRef = useRef(0);
  const activeCheckRequestIdRef = useRef<string | null>(null);
  const isDesktopWorkspace = useSyncExternalStore(
    subscribeToDesktopWorkspace,
    getDesktopWorkspaceSnapshot,
    getDesktopWorkspaceServerSnapshot,
  );

  const checkRequest = useMemo(
    () =>
      checkState.status === "checking"
        ? {
            requestId: checkState.requestId,
            checks: exercise.checks,
          }
        : null,
    [checkState, exercise.checks],
  );

  const handleCssChange = (nextCss: string) => {
    activeCheckRequestIdRef.current = null;
    updateCss(nextCss);
    setCheckState({ status: "idle" });
  };

  const handleReset = () => {
    activeCheckRequestIdRef.current = null;
    resetCss();
    setCheckState({ status: "idle" });
  };

  const handleCheck = () => {
    requestCounterRef.current += 1;
    const requestId = `${exercise.id}:${requestCounterRef.current}`;

    activeCheckRequestIdRef.current = requestId;
    setCheckState({
      status: "checking",
      requestId,
    });
  };

  const handleCheckResult = (result: CheckResultMessage) => {
    if (activeCheckRequestIdRef.current !== result.requestId) {
      return;
    }

    activeCheckRequestIdRef.current = null;
    setCheckState({
      status: "complete",
      requestId: result.requestId,
      passed: result.passed,
      results: result.results,
    });

    if (result.passed) {
      markCompleted();
    }
  };

  return (
    <div className="min-h-screen bg-workspace px-3 py-3 text-workspace-foreground sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <div className="mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1800px] flex-col overflow-hidden rounded-[1.75rem] border border-border bg-background shadow-[0_12px_36px_-28px_var(--foreground)] sm:min-h-[calc(100vh-2rem)] lg:min-h-[calc(100vh-2.5rem)]">
        <WorkspaceHeader />

        <main className="min-h-0 flex-1 bg-workspace">
          {isDesktopWorkspace ? (
            <div className="h-full min-h-[620px]">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel defaultSize="25" minSize="19" className="min-w-0">
                  <LessonPanel
                    lesson={lesson}
                    exercise={exercise}
                    checkState={checkState}
                  />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="40" minSize="28" className="min-w-0">
                  <EditorPanel value={css} onChange={handleCssChange} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="35" minSize="26" className="min-w-0">
                  <PreviewPanel
                    html={exercise.fixtureHtml}
                    baseCss={exercise.baseCss}
                    css={css}
                    checkRequest={checkRequest}
                    onCheckResult={handleCheckResult}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          ) : (
            <div className="grid min-h-[760px] grid-cols-1 min-[800px]:grid-cols-2">
              <div className="min-h-[560px] min-w-0 border-b border-border min-[800px]:border-r">
                <LessonPanel
                  lesson={lesson}
                  exercise={exercise}
                  checkState={checkState}
                />
              </div>
              <div className="min-h-[520px] min-w-0 border-b border-border">
                <EditorPanel value={css} onChange={handleCssChange} />
              </div>
              <div className="min-h-[560px] min-w-0 min-[800px]:col-span-2">
                <PreviewPanel
                  html={exercise.fixtureHtml}
                  baseCss={exercise.baseCss}
                  css={css}
                  checkRequest={checkRequest}
                  onCheckResult={handleCheckResult}
                />
              </div>
            </div>
          )}
        </main>

        <WorkspaceFooter
          isChecking={checkState.status === "checking"}
          onCheck={handleCheck}
          onReset={handleReset}
        />
      </div>
    </div>
  );
}

export function LearningWorkspace({
  lesson,
  exercise,
}: LearningWorkspaceProps) {
  return (
    <LearningWorkspaceSession
      key={`${exercise.id}:${exercise.revision}`}
      lesson={lesson}
      exercise={exercise}
    />
  );
}
