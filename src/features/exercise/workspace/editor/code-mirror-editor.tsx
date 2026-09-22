"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  type Ref,
} from "react";
import { isolateHistory } from "@codemirror/commands";
import { Transaction, type Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";

import { createEditorKeymap } from "./editor-keymap";
import {
  labEditorTheme,
  labSyntaxHighlighting,
} from "./editor-theme";
import { externalSyncAnnotation } from "./external-sync";

export type EditorFormatResult =
  | { status: "formatted" }
  | { status: "unchanged" }
  | { status: "stale" }
  | { status: "cancelled" }
  | { status: "error" };

export interface CodeEditorHandle {
  formatDocument(): Promise<EditorFormatResult>;
  focus(): void;
}

export interface FormattedDocument {
  formatted: string;
  cursorOffset: number;
}

type DocumentFormatter = (
  source: string,
  cursorOffset: number,
) => Promise<FormattedDocument>;

interface CodeMirrorEditorProps {
  ref?: Ref<CodeEditorHandle>;
  value: string;
  onChange: (value: string) => void;
  extensions: readonly Extension[];
  formatDocument: DocumentFormatter;
  formatFailureLabel: string;
  onFormatResult?: (result: EditorFormatResult) => void;
}

function isExternalSync(update: {
  transactions: readonly Transaction[];
}): boolean {
  return update.transactions.some(
    (transaction) =>
      transaction.annotation(externalSyncAnnotation) === true,
  );
}

export function CodeMirrorEditor({
  ref,
  value,
  onChange,
  extensions,
  formatDocument,
  formatFailureLabel,
  onFormatResult,
}: CodeMirrorEditorProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onFormatResultRef = useRef(onFormatResult);
  const formatterRef = useRef(formatDocument);
  const failureLabelRef = useRef(formatFailureLabel);

  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onFormatResultRef.current = onFormatResult;
    formatterRef.current = formatDocument;
    failureLabelRef.current = formatFailureLabel;
  }, [
    formatDocument,
    formatFailureLabel,
    onChange,
    onFormatResult,
  ]);

  const reportFormatResult = useCallback(
    (result: EditorFormatResult): EditorFormatResult => {
      onFormatResultRef.current?.(result);
      return result;
    },
    [],
  );

  const formatDocumentInView = useCallback(
    async (view: EditorView): Promise<EditorFormatResult> => {
      const sourceDoc = view.state.doc;
      const source = sourceDoc.toString();
      const cursorOffset = view.state.selection.main.head;

      let formatted: string;
      let formattedCursorOffset: number;

      try {
        const result = await formatterRef.current(
          source,
          cursorOffset,
        );
        formatted = result.formatted;
        formattedCursorOffset = result.cursorOffset;
      } catch (error: unknown) {
        if (viewRef.current !== view) {
          return { status: "cancelled" };
        }

        if (process.env.NODE_ENV !== "production") {
          console.warn(
            `CSS Lab ${failureLabelRef.current} formatting failed`,
            error,
          );
        }

        return reportFormatResult({ status: "error" });
      }

      if (viewRef.current !== view) {
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
          anchor: Math.min(
            formattedCursorOffset,
            formatted.length,
          ),
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
        const view = viewRef.current;
        return view
          ? formatDocumentInView(view)
          : { status: "cancelled" };
      },
      focus: () => viewRef.current?.focus(),
    }),
    [formatDocumentInView],
  );

  useEffect(() => {
    const parent = parentRef.current;

    if (!parent) {
      return;
    }

    const view = new EditorView({
      doc: initialValueRef.current,
      parent,
      extensions: [
        createEditorKeymap((editorView) => {
          void formatDocumentInView(editorView);
        }),
        basicSetup,
        ...extensions,
        labEditorTheme,
        labSyntaxHighlighting,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || isExternalSync(update)) {
            return;
          }

          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    viewRef.current = view;

    return () => {
      view.destroy();

      if (viewRef.current === view) {
        viewRef.current = null;
      }
    };
  }, [extensions, formatDocumentInView]);

  useEffect(() => {
    const view = viewRef.current;

    if (!view || view.state.doc.toString() === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: view.state.doc.length,
        insert: value,
      },
      annotations: [
        externalSyncAnnotation.of(true),
        Transaction.addToHistory.of(false),
      ],
    });
  }, [value]);

  return <div ref={parentRef} className="h-full w-full" />;
}
