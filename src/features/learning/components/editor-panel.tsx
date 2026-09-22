"use client";

import { useRef, useState } from "react";
import { Braces } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  CssEditor,
  type CssEditorFormatResult,
  type CssEditorHandle,
} from "@/features/exercise/components/css-editor";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorPanel({ value, onChange }: EditorPanelProps) {
  const editorRef = useRef<CssEditorHandle>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  const handleFormatResult = (result: CssEditorFormatResult) => {
    if (result.status === "error") {
      setFormatError("无法格式化 CSS，请检查当前语法。");
      return;
    }

    if (result.status !== "stale" && result.status !== "cancelled") {
      setFormatError(null);
    }
  };

  const handleFormat = async () => {
    const editor = editorRef.current;

    if (!editor || isFormatting) {
      return;
    }

    setIsFormatting(true);

    try {
      await editor.formatDocument();
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <section
      className="flex h-full min-w-0 flex-col bg-editor text-editor-foreground"
      aria-labelledby="editor-title"
    >
      <div className="flex items-center justify-between gap-3 border-b border-editor-line-active px-5 py-5 sm:px-6">
        <div className="min-w-0">
          <p
            id="editor-title"
            className="font-mono text-sm font-medium text-editor-foreground"
          >
            style.css
          </p>
          <p className="mt-1 text-xs text-editor-muted">实时编辑</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-editor-muted hover:bg-editor-line-active hover:text-editor-foreground"
            disabled={isFormatting}
            aria-label="格式化 CSS"
            onClick={() => {
              void handleFormat();
            }}
          >
            <Braces />
            <span className="hidden sm:inline">
              {isFormatting ? "格式化中…" : "格式化"}
            </span>
          </Button>

          <span className="flex items-center gap-2 text-[11px] text-editor-muted">
            <span
              className="size-1.5 rounded-full bg-success"
              aria-hidden="true"
            />
            synced
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <CssEditor
          ref={editorRef}
          value={value}
          onChange={onChange}
          onFormatResult={handleFormatResult}
        />
      </div>

      <div
        className="flex items-center gap-3 border-t border-editor-line-active px-5 py-3 text-[11px] text-editor-muted sm:px-6"
        aria-live="polite"
      >
        <span>CSS · 2 spaces · UTF-8</span>
        <span
          className={
            formatError
              ? "ml-auto text-warning"
              : "ml-auto hidden text-right sm:inline"
          }
        >
          {formatError ?? "Shift + Alt + F · Esc → Tab 退出编辑器"}
        </span>
      </div>
    </section>
  );
}
