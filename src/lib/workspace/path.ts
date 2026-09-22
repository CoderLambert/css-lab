import type { WorkspaceLanguage, WorkspacePath } from "./types";

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const EXTENSION_LANGUAGE: Readonly<Record<string, WorkspaceLanguage>> = {
  ".html": "html",
  ".css": "css",
  ".js": "javascript",
  ".ts": "typescript",
};

export function isWorkspacePath(value: string): value is WorkspacePath {
  if (!value || value.startsWith("/") || value.endsWith("/") || value.includes("\\")) {
    return false;
  }

  const segments = value.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || !SEGMENT_PATTERN.test(segment))) {
    return false;
  }

  return Object.keys(EXTENSION_LANGUAGE).some((extension) => value.endsWith(extension));
}

export function workspacePathLanguage(path: WorkspacePath): WorkspaceLanguage | null {
  for (const [extension, language] of Object.entries(EXTENSION_LANGUAGE)) {
    if (path.endsWith(extension)) return language;
  }
  return null;
}

export function assertWorkspacePathLanguage(path: WorkspacePath, language: WorkspaceLanguage): void {
  if (!isWorkspacePath(path) || workspacePathLanguage(path) !== language) {
    throw new Error(`Workspace path ${path} does not match language ${language}`);
  }
}
