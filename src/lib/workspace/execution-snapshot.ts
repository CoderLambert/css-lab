import type { ExecutionSnapshot, ExerciseDraft, ExerciseWorkspace } from "./types";

export function createExecutionSnapshot(workspace: ExerciseWorkspace, draft: ExerciseDraft): ExecutionSnapshot {
  const declared = new Map(workspace.definition.files.map((file) => [file.path, file]));

  for (const path of Object.keys(draft.files)) {
    const file = declared.get(path);
    if (!file) throw new Error(`Draft contains unknown path: ${path}`);
    if (!file.editable) throw new Error(`Draft contains locked path: ${path}`);
  }

  return {
    files: workspace.definition.files.map((file) => {
      const starter = workspace.starter.files[file.path];
      if (starter === undefined) throw new Error(`Missing starter content: ${file.path}`);
      const content = file.editable ? draft.files[file.path] : starter;
      if (content === undefined) throw new Error(`Draft is missing editable path: ${file.path}`);
      return { path: file.path, language: file.language, content };
    }),
  };
}
