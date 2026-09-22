import type { CheckResult } from "./preview-messages";

export type CheckState =
  | {
      status: "idle";
    }
  | {
      status: "checking";
      requestId: string;
    }
  | {
      status: "complete";
      requestId: string;
      passed: boolean;
      results: CheckResult[];
    };
