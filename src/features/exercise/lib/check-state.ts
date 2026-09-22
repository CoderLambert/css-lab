import type { CheckResult } from "./check-result";

export type CheckState =
  | { status: "idle" }
  | {
      status: "checking";
      requestId: string;
    }
  | {
      status: "complete";
      requestId: string;
      passed: boolean;
      results: readonly CheckResult[];
    };
