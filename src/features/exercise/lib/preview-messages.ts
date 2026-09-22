import type { Check } from "@/lib/content/schemas/exercise";

export const PREVIEW_MESSAGE_SOURCE = {
  parent: "css-lab-parent",
  preview: "css-lab-preview",
} as const;

export const PREVIEW_MESSAGE_TYPE = {
  checkResult: "check:result",
  checkRun: "check:run",
  cssUpdate: "css:update",
  ready: "ready",
} as const;

export interface CssUpdateMessage {
  source: typeof PREVIEW_MESSAGE_SOURCE.parent;
  type: typeof PREVIEW_MESSAGE_TYPE.cssUpdate;
  css: string;
}

export interface PreviewReadyMessage {
  source: typeof PREVIEW_MESSAGE_SOURCE.preview;
  type: typeof PREVIEW_MESSAGE_TYPE.ready;
}

export interface CheckRequest {
  requestId: string;
  checks: Check[];
}

export interface CheckRunMessage extends CheckRequest {
  source: typeof PREVIEW_MESSAGE_SOURCE.parent;
  type: typeof PREVIEW_MESSAGE_TYPE.checkRun;
}

export interface CheckResult {
  id: string;
  type: Check["type"];
  message: string;
  passed: boolean;
  expected: string | number | boolean;
  actual: string | number | boolean | null;
}

export interface CheckResultMessage {
  source: typeof PREVIEW_MESSAGE_SOURCE.preview;
  type: typeof PREVIEW_MESSAGE_TYPE.checkResult;
  requestId: string;
  passed: boolean;
  results: CheckResult[];
}

export type ParentToPreviewMessage = CssUpdateMessage | CheckRunMessage;
export type PreviewToParentMessage = PreviewReadyMessage | CheckResultMessage;

export function createCssUpdateMessage(css: string): CssUpdateMessage {
  return {
    source: PREVIEW_MESSAGE_SOURCE.parent,
    type: PREVIEW_MESSAGE_TYPE.cssUpdate,
    css,
  };
}

export function createCheckRunMessage(
  request: CheckRequest,
): CheckRunMessage {
  return {
    source: PREVIEW_MESSAGE_SOURCE.parent,
    type: PREVIEW_MESSAGE_TYPE.checkRun,
    requestId: request.requestId,
    checks: request.checks,
  };
}

export function isCssUpdateMessage(value: unknown): value is CssUpdateMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<CssUpdateMessage>;

  return (
    message.source === PREVIEW_MESSAGE_SOURCE.parent &&
    message.type === PREVIEW_MESSAGE_TYPE.cssUpdate &&
    typeof message.css === "string"
  );
}

export function isPreviewReadyMessage(
  value: unknown,
): value is PreviewReadyMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<PreviewReadyMessage>;

  return (
    message.source === PREVIEW_MESSAGE_SOURCE.preview &&
    message.type === PREVIEW_MESSAGE_TYPE.ready
  );
}

function isCheckType(value: unknown): value is Check["type"] {
  return value === "style" || value === "exists" || value === "count";
}

function isCheckResult(value: unknown): value is CheckResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = value as Partial<CheckResult>;
  const actualType = typeof result.actual;
  const expectedType = typeof result.expected;

  return (
    typeof result.id === "string" &&
    isCheckType(result.type) &&
    typeof result.message === "string" &&
    typeof result.passed === "boolean" &&
    (expectedType === "string" ||
      expectedType === "number" ||
      expectedType === "boolean") &&
    (result.actual === null ||
      actualType === "string" ||
      actualType === "number" ||
      actualType === "boolean")
  );
}

export function isCheckResultMessage(
  value: unknown,
): value is CheckResultMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<CheckResultMessage>;

  return (
    message.source === PREVIEW_MESSAGE_SOURCE.preview &&
    message.type === PREVIEW_MESSAGE_TYPE.checkResult &&
    typeof message.requestId === "string" &&
    typeof message.passed === "boolean" &&
    Array.isArray(message.results) &&
    message.results.every(isCheckResult)
  );
}
