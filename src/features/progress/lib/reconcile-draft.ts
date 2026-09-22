import type {
  ExerciseDraft,
  ExerciseWorkspace,
} from "@/lib/workspace/types";
import { createInitialDraft } from "@/lib/workspace/draft";

export function reconcileDraft(
  workspace: ExerciseWorkspace,
  savedFiles: Readonly<Record<string, string>>,
): ExerciseDraft {
  const initialDraft = createInitialDraft(workspace);
  const files: Record<string, string> = {};

  for (const file of workspace.definition.files) {
    if (!file.editable) {
      continue;
    }

    const saved = savedFiles[file.path];
    files[file.path] =
      typeof saved === "string"
        ? saved
        : initialDraft.files[file.path] ?? "";
  }

  return { files };
}
