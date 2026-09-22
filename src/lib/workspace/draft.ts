import type { ExerciseDraft, ExerciseWorkspace, WorkspacePath } from "./types";

function editableFile(workspace: ExerciseWorkspace, path: WorkspacePath) {
  const file = workspace.definition.files.find((candidate) => candidate.path === path);
  if (!file) throw new Error(`Unknown workspace path: ${path}`);
  if (!file.editable) throw new Error(`Workspace path is locked: ${path}`);
  return file;
}

export function createInitialDraft(workspace: ExerciseWorkspace): ExerciseDraft {
  return {
    files: Object.fromEntries(
      workspace.definition.files
        .filter((file) => file.editable)
        .map((file) => {
          const content = workspace.starter.files[file.path];
          if (content === undefined) throw new Error(`Missing starter content: ${file.path}`);
          return [file.path, content];
        }),
    ),
  };
}

export function updateDraftFile(workspace: ExerciseWorkspace, draft: ExerciseDraft, path: WorkspacePath, content: string): ExerciseDraft {
  editableFile(workspace, path);
  return { files: { ...draft.files, [path]: content } };
}

export function resetDraftFile(workspace: ExerciseWorkspace, draft: ExerciseDraft, path: WorkspacePath): ExerciseDraft {
  editableFile(workspace, path);
  const content = workspace.starter.files[path];
  if (content === undefined) throw new Error(`Missing starter content: ${path}`);
  return { files: { ...draft.files, [path]: content } };
}

export function resetDraft(workspace: ExerciseWorkspace): ExerciseDraft {
  return createInitialDraft(workspace);
}
