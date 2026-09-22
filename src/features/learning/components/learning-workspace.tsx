"use client";

import {
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import type { CheckState } from "@/features/exercise/lib/check-state";
import type { BrowserCheckRequest } from "@/features/exercise/runtime/browser/lib/browser-host";
import type { CheckResultMessage } from "@/features/exercise/runtime/browser/lib/browser-messages";
import { useExerciseProgress } from "@/features/progress/hooks/use-exercise-progress";
import { useLearningProgress } from "@/features/progress/hooks/use-learning-progress";
import type { Course, Exercise, Lesson, Module } from "@/lib/content/types";
import { createExecutionSnapshot } from "@/lib/workspace/execution-snapshot";
import type { ExerciseDraft } from "@/lib/workspace/types";
import type { LearnerNavigation } from "../lib/learner-navigation";
import { WorkspaceEditorPanel } from "@/features/exercise/workspace/components/workspace-editor-panel";
import { LessonPanel } from "./lesson-panel";
import { PreviewPanel } from "./preview-panel";
import { WorkspaceFooter } from "./workspace-footer";
import { WorkspaceHeader } from "./workspace-header";

interface LearningWorkspaceProps {
  course: Course;
  module: Module;
  lesson: Lesson;
  lessonContent: ReactNode;
  exercise: Exercise;
  navigation: LearnerNavigation;
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
  course,
  module,
  lesson,
  lessonContent,
  exercise,
  navigation,
}: LearningWorkspaceProps) {
  const {
    draft,
    isHydrated,
    updateFile,
    resetAll,
    markCompleted,
  } = useExerciseProgress({
    exerciseId: exercise.id,
    revision: exercise.revision,
    workspace: exercise.workspace,
  });
  const snapshot = useMemo(
    () => createExecutionSnapshot(exercise.workspace, draft),
    [draft, exercise.workspace],
  );
  const [progressRefreshToken, setProgressRefreshToken] = useState(0);
  const { isHydrated: isProgressHydrated, progress } = useLearningProgress({
    exercises: navigation.progressExercises,
    currentModuleId: module.id,
    currentLessonId: lesson.id,
    refreshToken: progressRefreshToken,
  });
  const [checkState, setCheckState] = useState<CheckState>({
    status: "idle",
  });
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const requestCounterRef = useRef(0);
  const activeCheckRef = useRef<{
    requestId: string;
    draft: ExerciseDraft;
    request: BrowserCheckRequest;
  } | null>(null);
  const isDesktopWorkspace = useSyncExternalStore(
    subscribeToDesktopWorkspace,
    getDesktopWorkspaceSnapshot,
    getDesktopWorkspaceServerSnapshot,
  );

  const checkRequest =
    checkState.status === "checking" &&
    activeCheckRef.current?.requestId === checkState.requestId
      ? activeCheckRef.current.request
      : null;

  const handleFileChange = (path: string, content: string) => {
    activeCheckRef.current = null;
    updateFile(path, content);
    setCheckState({ status: "idle" });
  };

  const handleReset = () => {
    activeCheckRef.current = null;
    resetAll();
    setCheckState({ status: "idle" });
  };

  const handleRevealHint = () => {
    setRevealedHintCount((current) =>
      Math.min(current + 1, exercise.hints.length),
    );
  };

  const handleCheck = () => {
    if (!isHydrated) {
      return;
    }

    requestCounterRef.current += 1;
    const requestId = `${exercise.id}:${requestCounterRef.current}`;

    const capturedDraft: ExerciseDraft = {
      files: { ...draft.files },
    };
    const request: BrowserCheckRequest = {
      requestId,
      checks: exercise.checks,
      snapshot: createExecutionSnapshot(
        exercise.workspace,
        capturedDraft,
      ),
    };

    activeCheckRef.current = {
      requestId,
      draft: capturedDraft,
      request,
    };
    setCheckState({
      status: "checking",
      requestId,
    });
  };

  const handleCheckResult = (result: CheckResultMessage) => {
    const activeCheck = activeCheckRef.current;

    if (!activeCheck || activeCheck.requestId !== result.requestId) {
      return;
    }

    activeCheckRef.current = null;
    setCheckState({
      status: "complete",
      requestId: result.requestId,
      passed: result.passed,
      results: result.results,
    });

    if (result.passed) {
      void markCompleted(activeCheck.draft)
        .then(() => {
          setProgressRefreshToken((current) => current + 1);
        })
        .catch(() => {
          // The checker result remains successful if persistence is unavailable.
        });
    }
  };

  const lessonPanel = (
    <LessonPanel
      moduleTitle={module.title}
      lesson={lesson}
      lessonContent={lessonContent}
      exercise={exercise}
    />
  );

  const previewPanel = (
    <PreviewPanel
      runtime={exercise.runtime}
      snapshot={snapshot}
      checkRequest={checkRequest}
      checkState={checkState}
      hints={exercise.hints}
      revealedHintCount={revealedHintCount}
      onCheckResult={handleCheckResult}
    />
  );

  return (
    <div className="flex h-dvh min-h-0 w-full flex-col overflow-hidden bg-background text-workspace-foreground">
      <WorkspaceHeader
        courseTitle={course.title}
        moduleTitle={module.title}
        currentExerciseNumber={navigation.currentIndex + 1}
        totalExercises={navigation.totalExercises}
        progressPercent={progress.course.percent}
        isProgressHydrated={isProgressHydrated}
      />

      <main className="min-h-0 flex-1 bg-workspace">
        {isDesktopWorkspace ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full">
            <ResizablePanel
              defaultSize="34"
              minSize="28"
              maxSize="42"
              className="min-w-0"
            >
              {lessonPanel}
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel defaultSize="66" minSize="58" className="min-w-0">
              <ResizablePanelGroup orientation="horizontal" className="h-full">
                <ResizablePanel
                  defaultSize="62"
                  minSize="48"
                  className="min-w-0"
                >
                  <WorkspaceEditorPanel
                    workspace={exercise.workspace}
                    draft={draft}
                    onFileChange={handleFileChange}
                  />
                </ResizablePanel>

                <ResizableHandle />

                <ResizablePanel
                  defaultSize="38"
                  minSize="30"
                  className="min-w-0"
                >
                  {previewPanel}
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full overflow-y-auto">
            <div className="grid min-h-full grid-cols-1 min-[800px]:grid-cols-2">
              <div className="min-h-[620px] min-w-0 border-b border-border min-[800px]:border-r">
                {lessonPanel}
              </div>
              <div className="min-h-[620px] min-w-0 border-b border-border">
                <WorkspaceEditorPanel
                    workspace={exercise.workspace}
                    draft={draft}
                    onFileChange={handleFileChange}
                  />
              </div>
              <div className="min-h-[560px] min-w-0 min-[800px]:col-span-2">
                {previewPanel}
              </div>
            </div>
          </div>
        )}
      </main>

      <WorkspaceFooter
        isChecking={checkState.status === "checking"}
        isHydrated={isHydrated}
        previousHref={navigation.previousHref}
        nextHref={navigation.nextHref}
        hintCount={exercise.hints.length}
        revealedHintCount={revealedHintCount}
        onCheck={handleCheck}
        onReset={handleReset}
        onRevealHint={handleRevealHint}
      />
    </div>
  );
}

export function LearningWorkspace({
  course,
  module,
  lesson,
  lessonContent,
  exercise,
  navigation,
}: LearningWorkspaceProps) {
  return (
    <LearningWorkspaceSession
      key={`${exercise.id}:${exercise.revision}`}
      course={course}
      module={module}
      lesson={lesson}
      lessonContent={lessonContent}
      exercise={exercise}
      navigation={navigation}
    />
  );
}
