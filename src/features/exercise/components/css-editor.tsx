"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
} from "react";
import { css } from "@codemirror/lang-css";
import { isolateHistory } from "@codemirror/commands";
import { Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";

import { cssColorSwatches } from "@/features/exercise/lib/editor/css-color-swatches";
import { createCssEditorKeymap } from "@/features/exercise/lib/editor/css-editor-keymap";
import {
  cssLabSyntaxHighlighting,
  cssLabTheme,
} from "@/features/exercise/lib/editor/css-editor-theme";
import { externalSyncAnnotation } from "@/features/exercise/lib/editor/css-editor-transactions";
import { formatCss } from "@/features/exercise/lib/editor/format-css";

export type CssEditorFormatResult =
  | { status: "formatted" }
  | { status: "unchanged" }
  | { status: "stale" }
  | { status: "cancelled" }
  | { status: "error" };

export interface CssEditorHandle {
  formatDocument(): Promise<CssEditorFormatResult>;
  focus(): void;
}

interface CssEditorProps {
  ref?: Ref<CssEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  onFormatResult?: (result: CssEditorFormatResult) => void;
}

function isExternalSync(update: {
  transactions: readonly Transaction[];
}): boolean {
  return update.transactions.some(
    (transaction) =>
      transaction.annotation(externalSyncAnnotation) === true,
  );
}

export function CssEditor({
  ref,
  value,
  onChange,
  onFormatResult,
}: CssEditorProps) {
  const editorParentRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onFormatResultRef = useRef(onFormatResult);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onFormatResultRef.current = onFormatResult;
  }, [onFormatResult]);

  const reportFormatResult = useCallback(
    (result: CssEditorFormatResult): CssEditorFormatResult => {
      onFormatResultRef.current?.(result);
      return result;
    },
    [],
  );

  const formatDocumentInView = useCallback(
    async (view: EditorView): Promise<CssEditorFormatResult> => {
      const sourceDoc = view.state.doc;
      const source = sourceDoc.toString();
      const cursorOffset = view.state.selection.main.head;

      let formatted: string;
      let formattedCursorOffset: number;

      try {
        const result = await formatCss(source, cursorOffset);
        formatted = result.formatted;
        formattedCursorOffset = result.cursorOffset;
      } catch (error: unknown) {
        if (editorViewRef.current !== view) {
          return { status: "cancelled" };
        }

        if (process.env.NODE_ENV !== "production") {
          console.warn("CSS Lab CSS formatting failed", error);
        }

        return reportFormatResult({ status: "error" });
      }

      if (editorViewRef.current !== view) {
        return { status: "cancelled" };
      }

      if (view.state.doc !== sourceDoc) {
        return reportFormatResult({ status: "stale" });
      }

      if (formatted === source) {
        view.focus();
        return reportFormatResult({ status: "unchanged" });
      }

      view.dispatch({
        changes: {
          from: 0,
          to: sourceDoc.length,
          insert: formatted,
        },
        selection: {
          anchor: Math.min(formattedCursorOffset, formatted.length),
        },
        scrollIntoView: true,
        annotations: [
          Transaction.userEvent.of("input.format"),
          isolateHistory.of("full"),
        ],
      });
      view.focus();

      return reportFormatResult({ status: "formatted" });
    },
    [reportFormatResult],
  );

  useImperativeHandle(
    ref,
    () => ({
      formatDocument: async () => {
        const view = editorViewRef.current;

        if (!view) {
          return { status: "cancelled" };
        }

        return formatDocumentInView(view);
      },
      focus: () => {
        editorViewRef.current?.focus();
      },
    }),
    [formatDocumentInView],
  );

  useEffect(() => {
    const parent = editorParentRef.current;

    if (!parent) {
      return;
    }

    const editorView = new EditorView({
      doc: initialValueRef.current,
      parent,
      extensions: [
        createCssEditorKeymap((view) => {
          void formatDocumentInView(view);
        }),
        basicSetup,
        css(),
        cssLabTheme,
        cssLabSyntaxHighlighting,
        cssColorSwatches,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || isExternalSync(update)) {
            return;
          }

          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();

      if (editorViewRef.current === editorView) {
        editorViewRef.current = null;
      }
    };
  }, [formatDocumentInView]);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView || editorView.state.doc.toString() === value) {
      return;
    }

    editorView.dispatch({
      changes: {
        from: 0,
        to: editorView.state.doc.length,
        insert: value,
      },
      annotations: [
        externalSyncAnnotation.of(true),
        Transaction.addToHistory.of(false),
      ],
    });
  }, [value]);

  return <div ref={editorParentRef} className="h-full w-full" />;
}
