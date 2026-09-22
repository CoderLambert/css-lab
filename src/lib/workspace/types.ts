export type WorkspaceLanguage = "html" | "css" | "javascript" | "typescript";

export type WorkspacePath = string;

export interface WorkspaceFileDefinition {
  readonly path: WorkspacePath;
  readonly language: WorkspaceLanguage;
  readonly editable: boolean;
}

export interface WorkspaceDefinition {
  readonly files: readonly WorkspaceFileDefinition[];
}

export interface StarterWorkspace {
  readonly files: Readonly<Record<WorkspacePath, string>>;
}

export interface ExerciseWorkspace {
  readonly definition: WorkspaceDefinition;
  readonly starter: StarterWorkspace;
}

export interface ExerciseDraft {
  readonly files: Readonly<Record<WorkspacePath, string>>;
}

export interface ExecutionFile {
  readonly path: WorkspacePath;
  readonly language: WorkspaceLanguage;
  readonly content: string;
}

export interface ExecutionSnapshot {
  readonly files: readonly ExecutionFile[];
}
