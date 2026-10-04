import type { Check } from "@/lib/content/schemas/exercise";

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
  check: Check | null;
}

/** Only current host-owned definitions may determine a result's evidence kind. */
export function resolveCheckDefinition(
  result: Pick<CheckResult, "id">,
  checks: readonly Check[],
): Check | null {
  const matches = checks.filter((check) => check.id === result.id);
  return matches.length === 1 ? matches[0] : null;
}

export function isCheckResultFault(
  result: CheckResult,
  context: CheckResultContext,
): boolean {
  if (result.reason === "checker-error") {
    return true;
  }
  if (!context.check || context.check.id !== result.id) {
    return true;
  }
  return (
    result.reason === "target-not-found" &&
    context.check.type !== "rule-style" &&
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
