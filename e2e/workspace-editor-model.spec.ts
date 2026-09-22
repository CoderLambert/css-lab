import { expect, test } from "@playwright/test";

import { formatHtml } from "../src/features/exercise/lib/editor/format-html";
import {
  editableWorkspaceFiles,
  isWorkspaceFileDirty,
  resolveActiveWorkspacePath,
} from "../src/features/exercise/workspace/editor/workspace-editor-model";
import {
  createInitialDraft,
  updateDraftFile,
} from "../src/lib/workspace/draft";
import type { ExerciseWorkspace } from "../src/lib/workspace/types";

const workspace: ExerciseWorkspace = {
  definition: {
    files: [
      { path: "index.html", language: "html", editable: true },
      { path: "base.css", language: "css", editable: false },
      { path: "styles/style.css", language: "css", editable: true },
    ],
  },
  starter: {
    files: {
      "index.html": "<main></main>",
      "base.css": "body {}",
      "styles/style.css": ".box {}",
    },
  },
};

test("workspace editor exposes editable declaration order and active fallback", () => {
  expect(
    editableWorkspaceFiles(workspace).map((file) => file.path),
  ).toEqual(["index.html", "styles/style.css"]);
  expect(resolveActiveWorkspacePath(workspace, null)).toBe(
    "index.html",
  );
  expect(
    resolveActiveWorkspacePath(workspace, "styles/style.css"),
  ).toBe("styles/style.css");
  expect(
    resolveActiveWorkspacePath(workspace, "base.css"),
  ).toBe("index.html");
});

test("multi-file draft keeps HTML and CSS edits independently", () => {
  const initial = createInitialDraft(workspace);
  const htmlDraft = updateDraftFile(
    workspace,
    initial,
    "index.html",
    "<main><p>Hello</p></main>",
  );
  const cssDraft = updateDraftFile(
    workspace,
    htmlDraft,
    "styles/style.css",
    ".box { display: flex; }",
  );

  expect(cssDraft.files).toEqual({
    "index.html": "<main><p>Hello</p></main>",
    "styles/style.css": ".box { display: flex; }",
  });
  expect(
    isWorkspaceFileDirty(workspace, cssDraft, "index.html"),
  ).toBe(true);
  expect(
    isWorkspaceFileDirty(
      workspace,
      cssDraft,
      "styles/style.css",
    ),
  ).toBe(true);
});

test("HTML formatter keeps embedded source unformatted", async () => {
  const result = await formatHtml(
    '<main><style>.x{color:red}</style><div class="x">A</div></main>',
    0,
  );

  expect(result.formatted).toContain("<main>");
  expect(result.formatted).toContain(
    "<style>.x{color:red}</style>",
  );
  expect(result.formatted).toContain(
    '<div class="x">A</div>',
  );
});
