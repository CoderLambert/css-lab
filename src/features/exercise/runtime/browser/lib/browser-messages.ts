import type { Check } from "@/lib/content/schemas/exercise";
import { isWorkspacePath, workspacePathLanguage } from "@/lib/workspace/path";
import type { WorkspacePath } from "@/lib/workspace/types";

export const LAB_MESSAGE_SOURCE = {
  host: "lab-host",
  runtime: "lab-runtime",
} as const;

export const LAB_MESSAGE_TYPE = {
  runtimeReady: "runtime:ready",
  cssUpdate: "css:update",
  checkRun: "check:run",
  checkResult: "check:result",
} as const;

export type BrowserCheckOutcomeReason =
  | "matched"
  | "mismatch"
  | "target-not-found"
  | "checker-error";

export interface BrowserCheckDiagnostic {
  selector: string | null;
  property: string | null;
}

export interface BrowserCheckResult {
  id: string;
  message: string;
  passed: boolean;
  reason: BrowserCheckOutcomeReason;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
  diagnostic: BrowserCheckDiagnostic | null;
}

export interface RuntimeReadyMessage {
  source: typeof LAB_MESSAGE_SOURCE.runtime;
  type: typeof LAB_MESSAGE_TYPE.runtimeReady;
  generationId: string;
}

export interface CssUpdateMessage {
  source: typeof LAB_MESSAGE_SOURCE.host;
  type: typeof LAB_MESSAGE_TYPE.cssUpdate;
  generationId: string;
  path: WorkspacePath;
  content: string;
}

export interface CheckRunMessage {
  source: typeof LAB_MESSAGE_SOURCE.host;
  type: typeof LAB_MESSAGE_TYPE.checkRun;
  generationId: string;
  requestId: string;
  checks: readonly Check[];
}

export interface CheckResultMessage {
  source: typeof LAB_MESSAGE_SOURCE.runtime;
  type: typeof LAB_MESSAGE_TYPE.checkResult;
  generationId: string;
  requestId: string;
  passed: boolean;
  results: readonly BrowserCheckResult[];
}

export type HostToRuntimeMessage = CssUpdateMessage | CheckRunMessage;
export type RuntimeToHostMessage = RuntimeReadyMessage | CheckResultMessage;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isGenerationId(value: unknown): value is string {
  return isNonEmptyString(value);
}

function isScalarOrNull(
  value: unknown,
): value is string | number | boolean | null {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isCheck(value: unknown): value is Check {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isNonEmptyString(value.id) ||
    !isNonEmptyString(value.message) ||
    !isNonEmptyString(value.selector)
  ) {
    return false;
  }

  if (value.type === "exists") {
    return hasOnlyKeys(value, ["id", "message", "type", "selector"]);
  }

  if (value.type === "count") {
    return (
      hasOnlyKeys(value, ["id", "message", "type", "selector", "equals"]) &&
      Number.isInteger(value.equals) &&
      typeof value.equals === "number" &&
      value.equals >= 0
    );
  }

  if (value.type === "style") {
    return (
      hasOnlyKeys(value, [
        "id",
        "message",
        "type",
        "selector",
        "property",
        "equals",
        "alsoAccepts",
      ]) &&
      isNonEmptyString(value.property) &&
      isNonEmptyString(value.equals) &&
      (value.alsoAccepts === undefined ||
        (Array.isArray(value.alsoAccepts) &&
          value.alsoAccepts.every(isNonEmptyString)))
    );
  }

  return false;
}

function isOutcome(value: unknown): value is BrowserCheckOutcomeReason {
  return (
    value === "matched" ||
    value === "mismatch" ||
    value === "target-not-found" ||
    value === "checker-error"
  );
}

function isDiagnostic(value: unknown): value is BrowserCheckDiagnostic | null {
  if (value === null) {
    return true;
  }
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["selector", "property"]) &&
    (value.selector === null || typeof value.selector === "string") &&
    (value.property === null || typeof value.property === "string")
  );
}

function isBrowserCheckResult(value: unknown): value is BrowserCheckResult {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "id",
      "message",
      "passed",
      "reason",
      "expected",
      "actual",
      "diagnostic",
    ]) &&
    typeof value.id === "string" &&
    typeof value.message === "string" &&
    typeof value.passed === "boolean" &&
    isOutcome(value.reason) &&
    isScalarOrNull(value.expected) &&
    isScalarOrNull(value.actual) &&
    isDiagnostic(value.diagnostic)
  );
}

export function createCssUpdateMessage(
  generationId: string,
  path: WorkspacePath,
  content: string,
): CssUpdateMessage {
  return {
    source: LAB_MESSAGE_SOURCE.host,
    type: LAB_MESSAGE_TYPE.cssUpdate,
    generationId,
    path,
    content,
  };
}

export function createCheckRunMessage(
  generationId: string,
  requestId: string,
  checks: readonly Check[],
): CheckRunMessage {
  return {
    source: LAB_MESSAGE_SOURCE.host,
    type: LAB_MESSAGE_TYPE.checkRun,
    generationId,
    requestId,
    checks,
  };
}

export function isRuntimeReadyMessage(
  value: unknown,
): value is RuntimeReadyMessage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ["source", "type", "generationId"]) &&
    value.source === LAB_MESSAGE_SOURCE.runtime &&
    value.type === LAB_MESSAGE_TYPE.runtimeReady &&
    isGenerationId(value.generationId)
  );
}

export function isCheckResultMessage(
  value: unknown,
): value is CheckResultMessage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "source",
      "type",
      "generationId",
      "requestId",
      "passed",
      "results",
    ]) &&
    value.source === LAB_MESSAGE_SOURCE.runtime &&
    value.type === LAB_MESSAGE_TYPE.checkResult &&
    isGenerationId(value.generationId) &&
    isNonEmptyString(value.requestId) &&
    typeof value.passed === "boolean" &&
    Array.isArray(value.results) &&
    value.results.every(isBrowserCheckResult)
  );
}

export function isCssUpdateMessage(
  value: unknown,
): value is CssUpdateMessage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "source",
      "type",
      "generationId",
      "path",
      "content",
    ]) &&
    value.source === LAB_MESSAGE_SOURCE.host &&
    value.type === LAB_MESSAGE_TYPE.cssUpdate &&
    isGenerationId(value.generationId) &&
    typeof value.path === "string" &&
    isWorkspacePath(value.path) &&
    workspacePathLanguage(value.path) === "css" &&
    typeof value.content === "string"
  );
}

export function isCheckRunMessage(
  value: unknown,
): value is CheckRunMessage {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, [
      "source",
      "type",
      "generationId",
      "requestId",
      "checks",
    ]) &&
    value.source === LAB_MESSAGE_SOURCE.host &&
    value.type === LAB_MESSAGE_TYPE.checkRun &&
    isGenerationId(value.generationId) &&
    isNonEmptyString(value.requestId) &&
    Array.isArray(value.checks) &&
    value.checks.every(isCheck)
  );
}
