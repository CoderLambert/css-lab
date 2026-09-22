import type {
  ExerciseDraft,
  ExerciseWorkspace,
  WorkspaceFileDefinition,
  WorkspacePath,
} from "@/lib/workspace/types";

export function editableWorkspaceFiles(
  workspace: ExerciseWorkspace,
): readonly WorkspaceFileDefinition[] {
  return workspace.definition.files.filter((file) => file.editable);
}

export function resolveActiveWorkspacePath(
  workspace: ExerciseWorkspace,
  activePath: WorkspacePath | null,
): WorkspacePath | null {
  const editable = editableWorkspaceFiles(workspace);

  if (
    activePath &&
    editable.some((file) => file.path === activePath)
  ) {
    return activePath;
  }

  return editable[0]?.path ?? null;
}

export function isWorkspaceFileDirty(
  workspace: ExerciseWorkspace,
  draft: ExerciseDraft,
  path: WorkspacePath,
): boolean {
  return draft.files[path] !== workspace.starter.files[path];
}
