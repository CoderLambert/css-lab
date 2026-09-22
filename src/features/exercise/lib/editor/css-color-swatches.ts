import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  type EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

const COLOR_FUNCTIONS = new Set([
  "rgb",
  "rgba",
  "hsl",
  "hsla",
  "hwb",
  "lab",
  "lch",
  "oklab",
  "oklch",
  "color",
]);

const NON_STATIC_COLOR_VALUES = new Set([
  "currentcolor",
  "inherit",
  "initial",
  "unset",
  "revert",
  "revert-layer",
]);

class ColorSwatchWidget extends WidgetType {
  constructor(private readonly color: string) {
    super();
  }

  eq(other: ColorSwatchWidget): boolean {
    return other.color === this.color;
  }

  toDOM(): HTMLElement {
    const swatch = document.createElement("span");
    swatch.className = "cm-css-color-swatch";
    swatch.setAttribute("aria-hidden", "true");
    swatch.style.backgroundColor = this.color;
    return swatch;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function isStaticSupportedColor(candidate: string): boolean {
  const normalized = candidate.trim().toLowerCase();

  if (
    !normalized ||
    NON_STATIC_COLOR_VALUES.has(normalized) ||
    normalized.startsWith("var(") ||
    normalized.startsWith("env(")
  ) {
    return false;
  }

  return typeof CSS !== "undefined" && CSS.supports("color", candidate);
}

function getColorCandidate(
  view: EditorView,
  from: number,
  to: number,
  nodeName: string,
): string | null {
  const candidate = view.state.sliceDoc(from, to);

  if (nodeName === "ColorLiteral") {
    return isStaticSupportedColor(candidate) ? candidate : null;
  }

  if (nodeName === "CallExpression") {
    const openParen = candidate.indexOf("(");

    if (openParen <= 0) {
      return null;
    }

    const functionName = candidate.slice(0, openParen).trim().toLowerCase();

    return COLOR_FUNCTIONS.has(functionName) &&
      isStaticSupportedColor(candidate)
      ? candidate
      : null;
  }

  if (nodeName === "ValueName") {
    return isStaticSupportedColor(candidate) ? candidate : null;
  }

  return null;
}

function buildColorDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const decoratedRanges = new Set<string>();
  const tree = syntaxTree(view.state);

  for (const range of view.visibleRanges) {
    tree.iterate({
      from: range.from,
      to: range.to,
      enter(node) {
        if (
          node.name !== "ColorLiteral" &&
          node.name !== "CallExpression" &&
          node.name !== "ValueName"
        ) {
          return;
        }

        let parent = node.node.parent;
        let insideDeclaration = false;

        while (parent) {
          if (parent.name === "Declaration") {
            insideDeclaration = true;
            break;
          }

          parent = parent.parent;
        }

        if (!insideDeclaration) {
          return;
        }

        const candidate = getColorCandidate(
          view,
          node.from,
          node.to,
          node.name,
        );

        if (!candidate) {
          return;
        }

        const key = `${node.from}:${node.to}`;

        if (!decoratedRanges.has(key)) {
          decoratedRanges.add(key);
          decorations.push(
            Decoration.widget({
              widget: new ColorSwatchWidget(candidate),
              side: -1,
            }).range(node.from),
          );
        }

        if (node.name === "CallExpression") {
          return false;
        }
      },
    });
  }

  return Decoration.set(decorations, true);
}

export const cssColorSwatches = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildColorDecorations(view);
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildColorDecorations(update.view);
      }
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
  },
);
