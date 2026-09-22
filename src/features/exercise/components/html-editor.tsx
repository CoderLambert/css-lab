"use client";

import { useMemo, type Ref } from "react";
import { html } from "@codemirror/lang-html";

import { formatHtml } from "@/features/exercise/lib/editor/format-html";
import {
  CodeMirrorEditor,
  type CodeEditorHandle,
  type EditorFormatResult,
} from "@/features/exercise/workspace/editor/code-mirror-editor";

export type HtmlEditorFormatResult = EditorFormatResult;
export type HtmlEditorHandle = CodeEditorHandle;

interface HtmlEditorProps {
  ref?: Ref<HtmlEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  onFormatResult?: (result: HtmlEditorFormatResult) => void;
}

export function HtmlEditor({
  ref,
  value,
  onChange,
  onFormatResult,
}: HtmlEditorProps) {
  const extensions = useMemo(() => [html()], []);

  return (
    <CodeMirrorEditor
      ref={ref}
      value={value}
      onChange={onChange}
      extensions={extensions}
      formatDocument={formatHtml}
      formatFailureLabel="HTML"
      onFormatResult={onFormatResult}
    />
  );
}
