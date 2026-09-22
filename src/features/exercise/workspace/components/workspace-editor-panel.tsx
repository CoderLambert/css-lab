"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CssEditor,
  type CssEditorHandle,
} from "@/features/exercise/components/css-editor";
import {
  HtmlEditor,
  type HtmlEditorHandle,
} from "@/features/exercise/components/html-editor";
import type {
  ExerciseDraft,
  ExerciseWorkspace,
  WorkspacePath,
} from "@/lib/workspace/types";
import type { EditorFormatResult } from "../editor/code-mirror-editor";
import {
  editableWorkspaceFiles,
  isWorkspaceFileDirty,
  resolveActiveWorkspacePath,
} from "../editor/workspace-editor-model";

interface WorkspaceEditorPanelProps {
  workspace: ExerciseWorkspace;
  draft: ExerciseDraft;
  onFileChange(
    path: WorkspacePath,
    content: string,
  ): void;
}

type EditorHandle = CssEditorHandle | HtmlEditorHandle;

function supportedLanguageLabel(
  language: "html" | "css",
): string {
  return language === "html" ? "HTML" : "CSS";
}

export function WorkspaceEditorPanel({
  workspace,
  draft,
  onFileChange,
}: WorkspaceEditorPanelProps) {
  const editableFiles = useMemo(
    () => editableWorkspaceFiles(workspace),
    [workspace],
  );
  const [activePath, setActivePath] = useState<WorkspacePath | null>(
    () => resolveActiveWorkspacePath(workspace, null),
  );
  const editorRef = useRef<EditorHandle>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const resolvedActivePath = resolveActiveWorkspacePath(
    workspace,
    activePath,
  );

  useEffect(() => {
    editorRef.current?.focus();
  }, [resolvedActivePath]);

  const activeFile = editableFiles.find(
    (file) => file.path === resolvedActivePath,
  );

  const activateRelativeTab = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % editableFiles.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (index - 1 + editableFiles.length) %
        editableFiles.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = editableFiles.length - 1;
    }

    if (nextIndex === null) {
      return;
    }

    event.preventDefault();
    setActivePath(editableFiles[nextIndex]?.path ?? null);
  };

  if (!activeFile || !resolvedActivePath) {
    return (
      <section
        className="flex h-full min-w-0 items-center justify-center bg-editor px-6 text-center text-sm text-editor-muted"
        aria-label="Workspace editor"
      >
        当前 Exercise 没有可编辑文件。
      </section>
    );
  }

  const supported =
    activeFile.language === "html" ||
    activeFile.language === "css";
  const label = supported
    ? supportedLanguageLabel(activeFile.language)
    : activeFile.language.toUpperCase();
  const value =
    draft.files[resolvedActivePath] ??
    workspace.starter.files[resolvedActivePath] ??
    "";

  const handleFormatResult = (result: EditorFormatResult) => {
    setFormatError(
      result.status === "error"
        ? `无法格式化 ${label}，请检查当前语法。`
        : null,
    );
  };

  const handleFormat = async () => {
    if (!editorRef.current || isFormatting) {
      return;
    }

    setIsFormatting(true);

    try {
      await editorRef.current.formatDocument();
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <section
      className="flex h-full min-w-0 flex-col bg-editor text-editor-foreground"
      aria-labelledby="workspace-editor-title"
    >
      <div className="shrink-0 border-b border-editor-line-active">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-5">
          <div className="min-w-0">
            <p
              id="workspace-editor-title"
              className="truncate font-mono text-sm font-medium text-editor-foreground"
            >
              {resolvedActivePath}
            </p>
            <p className="mt-0.5 text-[11px] text-editor-muted">
              {label} · 实时预览
            </p>
          </div>

          {supported ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0 text-editor-muted hover:bg-editor-line-active hover:text-editor-foreground"
              disabled={isFormatting}
              aria-label={`格式化 ${label}`}
              onClick={() => {
                void handleFormat();
              }}
            >
              <Braces />
              <span className="hidden sm:inline">
                {isFormatting ? "格式化中…" : "格式化"}
              </span>
            </Button>
          ) : null}
        </div>

        {editableFiles.length > 1 ? (
          <div
            role="tablist"
            aria-label="可编辑文件"
            className="flex min-w-0 gap-1 overflow-x-auto border-t border-editor-line-active px-3 py-2"
          >
            {editableFiles.map((file, index) => {
              const active = file.path === resolvedActivePath;
              const dirty = isWorkspaceFileDirty(
                workspace,
                draft,
                file.path,
              );

              return (
                <button
                  key={file.path}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  className={
                    active
                      ? "rounded-md bg-editor-line-active px-2.5 py-1.5 font-mono text-xs text-editor-foreground"
                      : "rounded-md px-2.5 py-1.5 font-mono text-xs text-editor-muted hover:bg-editor-line-active hover:text-editor-foreground"
                  }
                  onClick={() => setActivePath(file.path)}
                  onKeyDown={(event) =>
                    activateRelativeTab(event, index)
                  }
                >
                  {file.path}
                  {dirty ? " •" : ""}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1">
        {activeFile.language === "css" ? (
          <CssEditor
            key={resolvedActivePath}
            ref={editorRef}
            value={value}
            onChange={(content) =>
              onFileChange(resolvedActivePath, content)
            }
            onFormatResult={handleFormatResult}
          />
        ) : activeFile.language === "html" ? (
          <HtmlEditor
            key={resolvedActivePath}
            ref={editorRef}
            value={value}
            onChange={(content) =>
              onFileChange(resolvedActivePath, content)
            }
            onFormatResult={handleFormatResult}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-editor-muted">
            当前编辑器尚不支持 {label}。
          </div>
        )}
      </div>

      <div
        className="flex h-9 shrink-0 items-center gap-3 border-t border-editor-line-active px-4 text-[11px] text-editor-muted sm:px-5"
        aria-live="polite"
      >
        <span>2 spaces · UTF-8</span>
        <span
          className={
            formatError
              ? "ml-auto text-warning"
              : "ml-auto hidden text-right sm:inline"
          }
        >
          {formatError ?? "Shift + Alt + F"}
        </span>
      </div>
    </section>
  );
}
