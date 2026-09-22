"use client";

import { useState, useSyncExternalStore } from "react";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
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
  const [css, setCss] = useState(exercise.starterCss);
  const isDesktopWorkspace = useSyncExternalStore(
    subscribeToDesktopWorkspace,
    getDesktopWorkspaceSnapshot,
    getDesktopWorkspaceServerSnapshot,
  );

  const handleReset = () => {
    setCss(exercise.starterCss);
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
                  <LessonPanel lesson={lesson} exercise={exercise} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="40" minSize="28" className="min-w-0">
                  <EditorPanel value={css} onChange={setCss} />
                </ResizablePanel>
                <ResizableHandle withHandle />
                <ResizablePanel defaultSize="35" minSize="26" className="min-w-0">
                  <PreviewPanel
                    html={exercise.fixtureHtml}
                    baseCss={exercise.baseCss}
                    css={css}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          ) : (
            <div className="grid min-h-[760px] grid-cols-1 min-[800px]:grid-cols-2">
              <div className="min-h-[560px] min-w-0 border-b border-border min-[800px]:border-r">
                <LessonPanel lesson={lesson} exercise={exercise} />
              </div>
              <div className="min-h-[520px] min-w-0 border-b border-border">
                <EditorPanel value={css} onChange={setCss} />
              </div>
              <div className="min-h-[560px] min-w-0 min-[800px]:col-span-2">
                <PreviewPanel
                  html={exercise.fixtureHtml}
                  baseCss={exercise.baseCss}
                  css={css}
                />
              </div>
            </div>
          )}
        </main>

        <WorkspaceFooter onReset={handleReset} />
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
