import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { tags } from "@lezer/highlight";

export const cssLabTheme = EditorView.theme(
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
      backgroundColor:
        "color-mix(in oklch, var(--editor-property) 24%, transparent)",
    },
    "&.cm-focused": {
      outline: "none",
    },
    ".cm-tooltip.cm-tooltip-autocomplete": {
      overflow: "hidden",
      border:
        "1px solid color-mix(in oklch, var(--editor-muted) 28%, transparent)",
      borderRadius: "0.625rem",
      backgroundColor: "var(--editor-gutter)",
      color: "var(--editor-foreground)",
      boxShadow:\n        "0 10px 30px color-mix(in oklch, var(--editor-gutter) 60%, transparent)",
    },
    ".cm-tooltip-autocomplete > ul": {
      maxHeight: "15rem",
      fontFamily: "var(--font-mono)",
    },
    ".cm-tooltip-autocomplete > ul > li": {
      padding: "0.3rem 0.6rem",
    },
    ".cm-tooltip-autocomplete > ul > li[aria-selected]": {
      backgroundColor: "var(--editor-line-active)",
      color: "var(--editor-foreground)",
    },
    ".cm-completionMatchedText": {
      color: "var(--editor-property)",
      textDecoration: "none",
    },
    ".cm-completionDetail": {
      color: "var(--editor-muted)",
      fontStyle: "normal",
    },
    ".cm-css-color-swatch": {
      display: "inline-block",
      width: "0.7rem",
      height: "0.7rem",
      marginRight: "0.35rem",
      border:
        "1px solid color-mix(in oklch, var(--editor-foreground) 35%, transparent)",
      borderRadius: "0.2rem",
      verticalAlign: "-0.05rem",
      pointerEvents: "none",
    },
  },
  { dark: true },
);

const cssLabHighlightStyle = HighlightStyle.define([
  {
    tag: [
      tags.className,
      tags.typeName,
      tags.tagName,
      tags.definition(tags.typeName),
    ],
    color: "var(--editor-selector)",
  },
  {
    tag: [tags.propertyName, tags.definition(tags.propertyName)],
    color: "var(--editor-property)",
  },
  {
    tag: [
      tags.keyword,
      tags.atom,
      tags.bool,
      tags.number,
      tags.unit,
      tags.literal,
    ],
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

export const cssLabSyntaxHighlighting = syntaxHighlighting(
  cssLabHighlightStyle,
);
