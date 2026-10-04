import { AlertTriangle, Check, X } from "lucide-react";

import type { Check as CheckDefinition } from "@/lib/content/schemas/exercise";
import {
  getBrowserCheckDiagnostic,
  isCheckResultFault,
  resolveCheckDefinition,
  type CheckResult,
} from "../lib/check-result";
import type { CheckState } from "../lib/check-state";

interface CheckResultsProps {
  state: CheckState;
  checks: readonly CheckDefinition[];
  compact?: boolean;
  hasEditableHtml?: boolean;
}

function formatValue(
  value: CheckResult["actual"] | CheckResult["expected"],
): string {
  if (value === null) return "未获得";
  return String(value);
}

function Diagnostic({
  result,
  check,
  hasEditableHtml,
}: {
  result: CheckResult;
  check: CheckDefinition | null;
  hasEditableHtml: boolean;
}) {
  if (!check) {
    return (
      <p className="mt-2 border-l-2 border-warning pl-3 text-xs leading-5 text-muted-foreground">
        无法确认此检查的来源，不能据此判断代码是否满足要求。请保留当前代码并重试，或反馈这道题。
      </p>
    );
  }
  if (result.passed) return null;

  const diagnostic = getBrowserCheckDiagnostic(result);
  const selector = check.selector;
  const isLayoutEvidence =
    check.type === "layout-contained" || check.type === "layout-max-content";
  const property =
    check.type === "style" || check.type === "rule-style"
      ? check.property
      : diagnostic?.property ?? null;

  if (result.reason === "checker-error") {
    return (
      <div className="mt-2 flex gap-2 border-l-2 border-warning pl-3 text-xs leading-5 text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        <div className="min-w-0">
          <p>
            {isLayoutEvidence
              ? "本次布局检查无法完成，不能据此判断布局是否满足要求。请保留当前代码，按具体原因检查后重试；若问题持续，可反馈这道题。"
              : "检测器执行异常。这更可能是题目检查规则或运行时的问题，而不是你的实现。可以保留当前代码并反馈这道题。"}
          </p>
          {isLayoutEvidence ? (
            <p className="mt-1 break-words">
              具体原因：{result.actual === null ? "未获得具体原因，请重试或反馈此题。" : formatValue(result.actual)}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  if (result.reason === "target-not-found") {
    if (check.type === "rule-style") {
      return (
        <p className="mt-2 border-l-2 border-border pl-3 text-xs leading-5 text-muted-foreground">
          未在 <code className="break-all font-mono text-panel-foreground">{check.path}</code> 中找到要求的{" "}
          <code className="break-all font-mono text-panel-foreground">{check.selector}</code> CSS 规则。
          {check.media ? <>请确认规则位于 <code className="break-all font-mono">@media {check.media}</code> 范围内。</> : null}
          请检查选择器和声明位置；若规则已存在，可保留代码并重试或反馈此题。
        </p>
      );
    }
    return (
      <div className={[
        "mt-2 flex gap-2 border-l-2 pl-3 text-xs leading-5 text-muted-foreground",
        hasEditableHtml ? "border-border" : "border-warning",
      ].join(" ")}>
        {!hasEditableHtml ? (
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning" aria-hidden="true" />
        ) : null}
        <p>
          {check.type === "layout-contained" ? (
            <>布局检查没有在当前 learner HTML 中同时找到目标 <code>{selector}</code> 与容器 <code>{check.within}</code>。</>
          ) : (
            <>检测器没有在当前 learner HTML 中找到 <code className="bg-panel-subtle px-1 py-0.5 font-mono text-panel-foreground">{selector}</code>。</>
          )}
          {hasEditableHtml
            ? " 本题允许编辑 HTML，请检查元素结构是否仍满足题目要求。"
            : " 本题 HTML 为锁定内容，这更可能是题目检查规则或内容配置问题。"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-l-2 border-border pl-3 text-xs leading-5">
      <span className="text-muted-foreground">检测对象</span>
      <code className="min-w-0 break-all font-mono text-panel-foreground">
        {check.type === "rule-style" ? `${check.path} · ` : ""}
        {selector}
        {check.type === "layout-contained" ? ` → ${check.within}` : property ? ` · ${property}` : ""}
      </code>
      <span className="text-muted-foreground">当前值</span>
      <code className="break-all font-mono text-destructive">{formatValue(result.actual)}</code>
      <span className="text-muted-foreground">期望值</span>
      <code className="break-all font-mono text-success">{formatValue(result.expected)}</code>
      <span className="col-span-2 mt-1 text-muted-foreground">
        检测器已正常执行；这里是当前实现与验收条件不一致，不是检测器运行失败。
      </span>
    </div>
  );
}

export function CheckResults({
  state,
  checks,
  compact = false,
  hasEditableHtml = false,
}: CheckResultsProps) {
  if (state.status === "idle") return null;

  if (state.status === "checking") {
    return (
      <section
        className={compact ? "mt-4" : "mt-7 border-t border-border pt-5"}
        aria-live="polite"
        aria-label="检查结果"
      >
        {!compact ? <p className="text-sm font-semibold text-panel-foreground">检查结果</p> : null}
        <p className={compact ? "text-sm text-muted-foreground" : "mt-3 text-sm text-muted-foreground"}>
          正在检查…
        </p>
      </section>
    );
  }

  const feedback = state.results.map((result) => ({
    result,
    check: resolveCheckDefinition(result, checks),
  }));
  const passedCount = feedback.filter(({ result, check }) => result.passed && check !== null).length;
  const hasCheckerFault = feedback.some(({ result, check }) =>
    isCheckResultFault(result, { hasEditableHtml, check }),
  );
  const passed = state.passed && !hasCheckerFault;

  return (
    <section
      className={compact ? "mt-4" : "mt-7 border-t border-border pt-5"}
      aria-live="polite"
      aria-label="检查结果"
    >
      <div className="flex items-baseline justify-between gap-3">
        <p className={passed
          ? "text-sm font-semibold text-success"
          : hasCheckerFault
            ? "text-sm font-semibold text-warning"
            : "text-sm font-semibold text-destructive"}>
          {passed ? "全部检查通过" : hasCheckerFault ? "部分检查未能完成" : "当前实现还未满足全部条件"}
        </p>
        <span className="text-xs tabular-nums text-muted-foreground">{passedCount} / {state.results.length}</span>
      </div>

      <ul className="mt-4 space-y-4">
        {feedback.map(({ result, check }, index) => (
          <li key={`${result.id}:${index}`} className="text-sm">
            <div className="flex items-start gap-2.5">
              {result.passed && check ? (
                <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <X className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
              )}
              <span className={result.passed && check ? "text-panel-foreground" : "text-muted-foreground"}>
                {check?.message ?? result.message}
              </span>
            </div>
            <div className="ml-6">
              <Diagnostic result={result} check={check} hasEditableHtml={hasEditableHtml} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
