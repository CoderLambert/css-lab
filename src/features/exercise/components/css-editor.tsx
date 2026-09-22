"use client";

import { useEffect, useRef } from "react";
import { basicSetup, EditorView } from "codemirror";
import { css } from "@codemirror/lang-css";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

interface CssEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const cssLabTheme = EditorView.theme(
  {
    "&": {
      height: "100%",
      color: "var(--editor-foreground)",
      backgroundColor: "var(--editor)",
      fontFamily: "var(--font-mono)",
      fontSize: "0.875rem",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-mono)",
    },
    ".cm-content": {
      minHeight: "100%",
      padding: "1.5rem 0",
      caretColor: "var(--editor-foreground)",
    },
    ".cm-line": {
      padding: "0 1.5rem",
    },
    ".cm-gutters": {
      border: "none",
      backgroundColor: "var(--editor-gutter)",
      color: "var(--editor-muted)",
    },
    ".cm-gutterElement": {
      minWidth: "2.75rem",
      padding: "0 0.75rem 0 0.5rem",
      textAlign: "right",
    },
    ".cm-activeLine, .cm-activeLineGutter": {
      backgroundColor: "var(--editor-line-active)",
    },
    ".cm-activeLineGutter": {
      color: "var(--editor-foreground)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--editor-foreground)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "color-mix(in oklch, var(--editor-property) 24%, transparent)",
    },
    "&.cm-focused": {
      outline: "none",
    },
  },
  { dark: true },
);

const cssLabHighlightStyle = HighlightStyle.define([
  {
    tag: [tags.className, tags.typeName, tags.tagName, tags.definition(tags.typeName)],
    color: "var(--editor-selector)",
  },
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: "var(--editor-property)",
  },
  {
    tag: [tags.keyword, tags.atom, tags.bool, tags.number, tags.unit, tags.literal],
    color: "var(--editor-value)",
  },
  {
    tag: [tags.string, tags.regexp],
    color: "var(--editor-value)",
  },
  {
    tag: tags.comment,
    color: "var(--editor-comment)",
    fontStyle: "italic",
  },
]);

export function CssEditor({ value, onChange }: CssEditorProps) {
  const editorParentRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const externalUpdateRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const parent = editorParentRef.current;

    if (!parent) {
      return;
    }

    const editorView = new EditorView({
      doc: initialValueRef.current,
      parent,
      extensions: [
        basicSetup,
        css(),
        cssLabTheme,
        syntaxHighlighting(cssLabHighlightStyle),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged || externalUpdateRef.current) {
            return;
          }

          onChangeRef.current(update.state.doc.toString());
        }),
      ],
    });

    editorViewRef.current = editorView;

    return () => {
      editorView.destroy();
      editorViewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const editorView = editorViewRef.current;

    if (!editorView || editorView.state.doc.toString() === value) {
      return;
    }

    externalUpdateRef.current = true;

    try {
      editorView.dispatch({
        changes: {
          from: 0,
          to: editorView.state.doc.length,
          insert: value,
        },
      });
    } finally {
      externalUpdateRef.current = false;
    }
  }, [value]);

  return <div ref={editorParentRef} className="h-full w-full" />;
}
