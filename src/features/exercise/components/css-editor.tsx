"use client";

import { useMemo, type Ref } from "react";
import { css } from "@codemirror/lang-css";

import {
  cssColorSwatches,
  cssColorSwatchTheme,
} from "@/features/exercise/lib/editor/css-color-swatches";
import { formatCss } from "@/features/exercise/lib/editor/format-css";
import {
  CodeMirrorEditor,
  type CodeEditorHandle,
  type EditorFormatResult,
} from "@/features/exercise/workspace/editor/code-mirror-editor";

export type CssEditorFormatResult = EditorFormatResult;
export type CssEditorHandle = CodeEditorHandle;

interface CssEditorProps {
  ref?: Ref<CssEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  onFormatResult?: (result: CssEditorFormatResult) => void;
}

export function CssEditor({
  ref,
  value,
  onChange,
  onFormatResult,
}: CssEditorProps) {
  const extensions = useMemo(
    () => [css(), cssColorSwatches, cssColorSwatchTheme],
    [],
  );

  return (
    <CodeMirrorEditor
      ref={ref}
      value={value}
      onChange={onChange}
      extensions={extensions}
      formatDocument={formatCss}
      formatFailureLabel="CSS"
      onFormatResult={onFormatResult}
    />
  );
}
