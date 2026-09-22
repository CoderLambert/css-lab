import { PreviewFrame } from "@/features/exercise/components/preview-frame";
import type {
  CheckRequest,
  CheckResultMessage,
} from "@/features/exercise/lib/preview-messages";

interface PreviewPanelProps {
  html: string;
  baseCss: string;
  css: string;
  checkRequest: CheckRequest | null;
  onCheckResult: (result: CheckResultMessage) => void;
}

export function PreviewPanel({
  html,
  baseCss,
  css,
  checkRequest,
  onCheckResult,
}: PreviewPanelProps) {
  return (
    <section
      className="flex h-full min-w-0 flex-col bg-panel"
      aria-labelledby="preview-title"
    >
      <div className="flex items-center justify-between border-b border-border px-5 py-5 sm:px-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Live
          </p>
          <h2
            id="preview-title"
            className="mt-1 font-heading text-base font-semibold text-panel-foreground"
          >
            Preview
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">390 × 300</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-preview px-5 py-7 sm:px-6">
        <div className="flex min-h-full items-center justify-center">
          <div className="w-full max-w-[390px] overflow-hidden rounded-2xl border border-border bg-panel shadow-sm">
            <div
              className="flex h-9 items-center gap-1.5 border-b border-border bg-panel-subtle px-4"
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
      </div>
    </section>
  );
}
