import {
  acceptCompletion,
  completionStatus,
} from "@codemirror/autocomplete";
import { indentLess, indentMore } from "@codemirror/commands";
import { Prec, type Extension } from "@codemirror/state";
import {
  keymap,
  type Command,
  type EditorView,
} from "@codemirror/view";

function acceptCompletionOrIndent(view: EditorView): boolean {
  if (
    completionStatus(view.state) === "active" &&
    acceptCompletion(view)
  ) {
    return true;
  }

  return indentMore(view);
}

export function createCssEditorKeymap(
  runFormat: (view: EditorView) => void,
): Extension {
  const formatDocument: Command = (view) => {
    runFormat(view);
    return true;
  };

  return Prec.highest(
    keymap.of([
      {
        key: "Tab",
        run: acceptCompletionOrIndent,
      },
      {
        key: "Shift-Tab",
        run: indentLess,
      },
      {
        key: "Shift-Alt-f",
        run: formatDocument,
      },
    ]),
  );
}
