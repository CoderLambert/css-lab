import { AlertTriangle, Check, X } from "lucide-react";

import type { BrowserCheckResult } from "../runtime/browser/lib/browser-messages";
import type { CheckState } from "../lib/check-state";

interface CheckResultsProps {
  state: CheckState;
  compact?: boolean;
}

function formatValue(value: BrowserCheckResult["actual"] | BrowserCheckResult["expected"]): string {
  if (value === null) {
    return "未获得";
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value);
}

function Diagnostic({ result }: { result: BrowserCheckResult }) {
  if (result.passed) {
    return null;
  }

  if (result.reason === "checker-error") {
    return (
      <div className="mt-2 flex gap-2 border-l-2 border-warning pl-3 text-xs leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        <p>
          检测器执行异常。这更可能是题目检查规则的问题，而不是你的 CSS。可以保留当前代码并反馈这道题。
        </p>
      </div>
    );
  }

  if (result.reason === "target-not-found") {
    return (
      <div className="mt-2 flex gap-2 border-l-2 border-warning pl-3 text-xs leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        <p>
          检测器没有找到
          {" "}
          <code className="bg-panel-subtle px-1 py-0.5 font-mono text-panel-foreground">
            {result.diagnostic?.selector ?? "目标元素"}
          </code>
          。如果本题没有要求你修改 HTML，这可能是题目配置问题。
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-l-2 border-border pl-3 text-xs leading-5">
      <span className="text-muted-foreground">检测对象</span>
      <code className="min-w-0 break-all font-mono text-panel-foreground">
        {result.diagnostic?.selector ?? "—"}
        {result.diagnostic?.property ? ` · ${result.diagnostic.property}` : ""}
      </code>
      <span className="text-muted-foreground">当前值</span>
      <code className="break-all font-mono text-destructive">
        {formatValue(result.actual)}
      </code>
      <span className="text-muted-foreground">期望值</span>
      <code className="break-all font-mono text-success">
        {formatValue(result.expected)}
      </code>
      <span className="col-span-2 mt-1 text-muted-foreground">
        检测器已正常执行；这里是当前实现与验收条件不一致，不是检测器运行失败。
      </span>
    </div>
  );
}

export function CheckResults({
  state,
  compact = false,
}: CheckResultsProps) {
  if (state.status === "idle") {
    return null;
  }

  if (state.status === "checking") {
    return (
      <section
        className={compact ? "mt-4" : "mt-7 border-t border-border pt-5"}
        aria-live="polite"
        aria-label="检查结果"
      >
        {!compact ? (
          <p className="text-sm font-semibold text-panel-foreground">检查结果</p>
        ) : null}
        <p
          className={
            compact
              ? "text-sm text-muted-foreground"
              : "mt-3 text-sm text-muted-foreground"
          }
        >
          正在检查…
        </p>
      </section>
    );
  }

  const passedCount = state.results.filter((result) => result.passed).length;
  const hasCheckerError = state.results.some(
    (result) =>
      result.reason === "checker-error" ||
      result.reason === "target-not-found",
  );

  return (
    <section
      className={compact ? "mt-4" : "mt-7 border-t border-border pt-5"}
      aria-live="polite"
      aria-label="检查结果"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={
            state.passed
              ? "text-sm font-semibold text-success"
              : hasCheckerError
                ? "text-sm font-semibold text-warning"
                : "text-sm font-semibold text-destructive"
          }
        >
          {state.passed
            ? "全部检查通过"
            : hasCheckerError
              ? "检测规则需要检查"
              : "当前实现还未满足全部条件"}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">
          {passedCount} / {state.results.length}
        </span>
      </div>

      <ul className="mt-4 space-y-4">
        {state.results.map((result) => (
          <li key={result.id} className="text-sm">
            <div className="flex items-start gap-2.5">
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
                  result.passed
                    ? "text-panel-foreground"
                    : "text-muted-foreground"
                }
              >
                {result.message}
              </span>
            </div>
            <div className="ml-6">
              <Diagnostic result={result} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
