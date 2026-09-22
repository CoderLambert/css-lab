import type { BrowserRuntimeDefinition } from "@/lib/content/schemas/exercise";
import type {
  ExecutionFile,
  ExecutionSnapshot,
  WorkspacePath,
} from "@/lib/workspace/types";

export interface BrowserSnapshotModel {
  entryHtml: string;
  cssFiles: readonly ExecutionFile[];
  cssTopology: readonly WorkspacePath[];
}

export function createRandomNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function createGenerationId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export function deriveBrowserSnapshotModel(
  runtime: BrowserRuntimeDefinition,
  snapshot: ExecutionSnapshot,
): BrowserSnapshotModel {
  if (runtime.type !== "browser") {
    throw new Error("Unsupported runtime type");
  }

  const seen = new Set<string>();
  for (const file of snapshot.files) {
    if (seen.has(file.path)) {
      throw new Error("Browser Runtime snapshot contains duplicate path");
    }
    seen.add(file.path);

    if (
      file.language !== "html" &&
      file.language !== "css"
    ) {
      throw new Error("Browser Runtime supports HTML and CSS only");
    }
  }

  const htmlFiles = snapshot.files.filter((file) => file.language === "html");
  if (htmlFiles.length !== 1) {
    throw new Error("Browser Runtime requires exactly one HTML file");
  }

  const entry = snapshot.files.find((file) => file.path === runtime.entry);
  if (!entry || entry.language !== "html" || entry !== htmlFiles[0]) {
    throw new Error("Browser Runtime entry must be the unique HTML file");
  }

  const cssFiles = snapshot.files.filter((file) => file.language === "css");
  return {
    entryHtml: entry.content,
    cssFiles,
    cssTopology: cssFiles.map((file) => file.path),
  };
}

export function serializeLearnerHtml(value: string): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
