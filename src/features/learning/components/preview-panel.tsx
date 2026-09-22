import { CheckResults } from "@/features/exercise/components/check-results";
import { PreviewFrame } from "@/features/exercise/components/preview-frame";
import type { CheckState } from "@/features/exercise/lib/check-state";
import type {
  CheckRequest,
  CheckResultMessage,
} from "@/features/exercise/lib/preview-messages";

interface PreviewPanelProps {
  html: string;
  baseCss: string;
  css: string;
  checkRequest: CheckRequest | null;
  checkState: CheckState;
  onCheckResult: (result: CheckResultMessage) => void;
}

export function PreviewPanel({
  html,
  baseCss,
  css,
  checkRequest,
  checkState,
  onCheckResult,
}: PreviewPanelProps) {
  return (
    <section
      className="flex h-full min-w-0 flex-col bg-panel"
      aria-labelledby="preview-title"
    >
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4 sm:px-5">
        <div className="flex items-baseline gap-2">
          <h2
            id="preview-title"
            className="font-heading text-sm font-semibold text-panel-foreground"
          >
            Preview
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Live
          </span>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">
          390 × 300
        </span>
      </div>

      <div className="shrink-0 border-b border-border bg-workspace p-4 sm:p-5">
        <div className="mx-auto w-full max-w-[390px] overflow-hidden border border-border bg-panel shadow-sm">
          <div
            className="flex h-8 items-center gap-1.5 border-b border-border bg-panel-subtle px-3"
            aria-hidden="true"
          >
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
            <span className="size-2 rounded-full bg-muted-foreground/25" />
          </div>
          <PreviewFrame
            html={html}
            baseCss={baseCss}
            css={css}
            checkRequest={checkRequest}
            onCheckResult={onCheckResult}
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-panel-foreground">
            Check results
          </p>
          <span className="text-[11px] text-muted-foreground">
            {checkState.status === "idle"
              ? "等待检查"
              : checkState.status === "checking"
                ? "检查中"
                : checkState.passed
                  ? "已通过"
                  : "需要调整"}
          </span>
        </div>

        {checkState.status === "idle" ? (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            修改代码后点击底部“检查答案”，这里会显示每条验收条件的结果。
          </p>
        ) : (
          <CheckResults state={checkState} compact />
        )}
      </div>
    </section>
  );
}
