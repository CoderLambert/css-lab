import type { BrowserCheckResult } from "../runtime/browser/lib/browser-messages";

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
      results: BrowserCheckResult[];
    };
