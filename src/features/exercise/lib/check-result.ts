export type CheckOutcomeReason =
  | "matched"
  | "mismatch"
  | "target-not-found"
  | "checker-error";

export interface CheckResult {
  id: string;
  message: string;
  passed: boolean;
  reason: CheckOutcomeReason;
  expected: string | number | boolean | null;
  actual: string | number | boolean | null;
}

export interface BrowserCheckDiagnostic {
  selector: string | null;
  property: string | null;
}

export interface BrowserCheckResult extends CheckResult {
  diagnostic: BrowserCheckDiagnostic | null;
}

export interface CheckResultContext {
  hasEditableHtml: boolean;
}

export function isCheckResultFault(
  result: CheckResult,
  context: CheckResultContext,
): boolean {
  if (result.reason === "checker-error") {
    return true;
  }
  return (
    result.reason === "target-not-found" &&
    !context.hasEditableHtml
  );
}

export function getBrowserCheckDiagnostic(
  result: CheckResult,
): BrowserCheckDiagnostic | null {
  if (!("diagnostic" in result)) {
    return null;
  }

  const diagnostic = (result as Partial<BrowserCheckResult>).diagnostic;
  if (
    !diagnostic ||
    (diagnostic.selector !== null &&
      typeof diagnostic.selector !== "string") ||
    (diagnostic.property !== null &&
      typeof diagnostic.property !== "string")
  ) {
    return null;
  }

  return diagnostic;
}
