import { Check, X } from "lucide-react";

import type { CheckState } from "../lib/check-state";

interface CheckResultsProps {
  state: CheckState;
}

export function CheckResults({ state }: CheckResultsProps) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "checking") {
    return (
      <section
        className="mt-7 border-t border-border pt-5"
        aria-live="polite"
        aria-label="检查结果"
      >
        <p className="text-sm font-semibold text-panel-foreground">检查结果</p>
        <p className="mt-3 text-sm text-muted-foreground">正在检查…</p>
      </section>
    );
  }

  const passedCount = state.results.filter((result) => result.passed).length;

  return (
    <section
      className="mt-7 border-t border-border pt-5"
      aria-live="polite"
      aria-label="检查结果"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={
            state.passed
              ? "text-sm font-semibold text-success"
              : "text-sm font-semibold text-destructive"
          }
        >
          {state.passed ? "全部检查通过" : "还有需要调整的地方"}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {passedCount} / {state.results.length}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {state.results.map((result) => (
          <li key={result.id} className="flex items-start gap-2.5 text-sm">
            {result.passed ? (
              <Check
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden="true"
              />
            ) : (
              <X
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
            )}
            <span
              className={
                result.passed ? "text-panel-foreground" : "text-muted-foreground"
              }
            >
              {result.message}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
