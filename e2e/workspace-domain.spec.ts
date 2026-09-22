import { expect, test } from "@playwright/test";

import { createInitialDraft, resetDraftFile, updateDraftFile } from "../src/lib/workspace/draft";
import { createExecutionSnapshot } from "../src/lib/workspace/execution-snapshot";
import { isWorkspacePath } from "../src/lib/workspace/path";
import { WorkspaceDefinitionSchema } from "../src/lib/workspace/schemas";
import { ExerciseRecordSchema } from "../src/lib/content/schemas/exercise";
import type { ExerciseWorkspace } from "../src/lib/workspace/types";

const workspace: ExerciseWorkspace = {
  definition: { files: [
    { path: "index.html", language: "html", editable: false },
    { path: "styles/base.css", language: "css", editable: false },
    { path: "style.css", language: "css", editable: true },
  ] },
  starter: { files: { "index.html": "<main />", "styles/base.css": "base", "style.css": "starter" } },
};

const v2 = (files = workspace.definition.files, entry = "index.html") => ({
  schemaVersion: 2, id: "ex-1", revision: 1, slug: "demo", title: "Demo", prompt: "Do it", order: 1,
  status: "published", hints: [], checks: [], workspace: { files }, runtime: { type: "browser", entry },
});

test("WorkspacePath uses the documented allow-list grammar", () => {
  for (const path of ["index.html", "style.css", "main.js", "main.ts", "utils/math.ts", "styles/card.css"]) expect(isWorkspacePath(path)).toBe(true);
  for (const path of ["/index.html", "foo\\bar.css", "foo//bar.css", "./style.css", "../style.css", "foo/../style.css", "style.CSS", "a b.css", "<script>.html"]) expect(isWorkspacePath(path)).toBe(false);
});

test("workspace schema rejects duplicates, case collisions, and language mismatch while allowing zero editable", () => {
  expect(WorkspaceDefinitionSchema.safeParse({ files: [{ path: "index.html", language: "html", editable: false }] }).success).toBe(true);
  expect(WorkspaceDefinitionSchema.safeParse({ files: [{ path: "a.css", language: "css", editable: true }, { path: "a.css", language: "css", editable: true }] }).success).toBe(false);
  expect(WorkspaceDefinitionSchema.safeParse({ files: [{ path: "A.css", language: "css", editable: true }, { path: "a.css", language: "css", editable: true }] }).success).toBe(false);
  expect(WorkspaceDefinitionSchema.safeParse({ files: [{ path: "index.html", language: "css", editable: true }] }).success).toBe(false);
});

test("Exercise v2 validates Browser entry but permits JS/TS vocabulary", () => {
  expect(ExerciseRecordSchema.safeParse(v2([...workspace.definition.files, { path: "main.js", language: "javascript", editable: true }])).success).toBe(true);
  expect(ExerciseRecordSchema.safeParse(v2(workspace.definition.files, "missing.html")).success).toBe(false);
  expect(ExerciseRecordSchema.safeParse(v2(workspace.definition.files, "style.css")).success).toBe(false);
});

test("Draft helpers expose editable files only and reject locked or unknown paths", () => {
  const draft = createInitialDraft(workspace);
  expect(draft.files).toEqual({ "style.css": "starter" });
  expect(updateDraftFile(workspace, draft, "style.css", "changed").files["style.css"]).toBe("changed");
  expect(() => updateDraftFile(workspace, draft, "index.html", "bad")).toThrow(/locked/);
  expect(() => resetDraftFile(workspace, draft, "missing.css")).toThrow(/Unknown/);
});

test("ExecutionSnapshot preserves declaration order and validates malformed drafts", () => {
  const snapshot = createExecutionSnapshot(workspace, { files: { "style.css": "changed" } });
  expect(snapshot.files.map((file) => [file.path, file.content])).toEqual([
    ["index.html", "<main />"], ["styles/base.css", "base"], ["style.css", "changed"],
  ]);
  expect(() => createExecutionSnapshot(workspace, { files: {} })).toThrow(/missing editable/i);
  expect(() => createExecutionSnapshot(workspace, { files: { "style.css": "ok", "index.html": "bad" } })).toThrow(/locked/);
  expect(() => createExecutionSnapshot(workspace, { files: { "style.css": "ok", "other.css": "bad" } })).toThrow(/unknown/);
});
