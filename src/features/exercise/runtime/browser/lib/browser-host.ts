import type { BrowserRuntimeDefinition, Check } from "@/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "@/lib/workspace/types";
import {
  createCheckRunMessage,
  createCssUpdateMessage,
  isCheckResultMessage,
  isRuntimeReadyMessage,
  type CheckResultMessage,
  type HostToRuntimeMessage,
  type RuntimeReadyMessage,
} from "./browser-messages";
import {
  deriveBrowserSnapshotModel,
} from "./browser-security";

export interface BrowserDocumentIdentity {
  runtimeEntry: string;
  entryHtml: string;
  cssTopology: readonly string[];
  bridgeVersion: number;
}

export interface CapturedBrowserCheckRequest {
  requestId: string;
  checks: readonly Check[];
  snapshot: ExecutionSnapshot;
}

export function createBrowserDocumentIdentity(
  runtime: BrowserRuntimeDefinition,
  snapshot: ExecutionSnapshot,
  bridgeVersion: number,
): BrowserDocumentIdentity {
  const model = deriveBrowserSnapshotModel(runtime, snapshot);
  return {
    runtimeEntry: runtime.entry,
    entryHtml: model.entryHtml,
    cssTopology: model.cssTopology,
    bridgeVersion,
  };
}

export function browserDocumentIdentityEquals(
  left: BrowserDocumentIdentity,
  right: BrowserDocumentIdentity,
): boolean {
  return (
    left.runtimeEntry === right.runtimeEntry &&
    left.entryHtml === right.entryHtml &&
    left.bridgeVersion === right.bridgeVersion &&
    left.cssTopology.length === right.cssTopology.length &&
    left.cssTopology.every((path, index) => path === right.cssTopology[index])
  );
}

export function planCssSync(
  generationId: string,
  snapshot: ExecutionSnapshot,
): HostToRuntimeMessage[] {
  return snapshot.files
    .filter((file) => file.language === "css")
    .map((file) =>
      createCssUpdateMessage(generationId, file.path, file.content),
    );
}

export function planCapturedCheckDispatch(
  generationId: string,
  runtime: BrowserRuntimeDefinition,
  currentIdentity: BrowserDocumentIdentity,
  request: CapturedBrowserCheckRequest,
): HostToRuntimeMessage[] {
  const capturedIdentity = createBrowserDocumentIdentity(
    runtime,
    request.snapshot,
    currentIdentity.bridgeVersion,
  );

  if (!browserDocumentIdentityEquals(currentIdentity, capturedIdentity)) {
    throw new Error(
      "Captured check snapshot requires a different Browser document generation",
    );
  }

  return [
    ...planCssSync(generationId, request.snapshot),
    createCheckRunMessage(generationId, request.requestId, request.checks),
  ];
}

export function acceptsRuntimeReady(
  value: unknown,
  currentGenerationId: string,
): value is RuntimeReadyMessage {
  return (
    isRuntimeReadyMessage(value) &&
    value.generationId === currentGenerationId
  );
}

export function acceptsCheckResult(
  value: unknown,
  currentGenerationId: string,
  activeRequestId: string | null,
): value is CheckResultMessage {
  return (
    activeRequestId !== null &&
    isCheckResultMessage(value) &&
    value.generationId === currentGenerationId &&
    value.requestId === activeRequestId
  );
}
