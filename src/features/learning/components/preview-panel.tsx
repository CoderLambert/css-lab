"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Lightbulb } from "lucide-react";

import { CheckResults } from "@/features/exercise/components/check-results";
import { BrowserRuntimeFrame } from "@/features/exercise/runtime/browser/components/browser-runtime-frame";
import type { CheckState } from "@/features/exercise/lib/check-state";
import type { BrowserCheckRequest } from "@/features/exercise/runtime/browser/lib/browser-host";
import type { CheckResultMessage } from "@/features/exercise/runtime/browser/lib/browser-messages";
import type { BrowserRuntimeDefinition } from "@/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "@/lib/workspace/types";

type ViewportPresetId = "responsive" | "small" | "tablet" | "desktop";

interface ViewportPreset {
  id: ViewportPresetId;
  label: string;
  width: number | null;
  height: number | null;
}

const VIEWPORT_PRESETS: readonly ViewportPreset[] = [
  {
    id: "responsive",
    label: "Auto",
    width: null,
    height: null,
  },
  {
    id: "small",
    label: "390",
    width: 390,
    height: 300,
  },
  {
    id: "tablet",
    label: "768",
    width: 768,
    height: 480,
  },
  {
    id: "desktop",
    label: "1280",
    width: 1280,
    height: 720,
  },
];

const BROWSER_CHROME_HEIGHT = 32;

interface PreviewPanelProps {
  runtime: BrowserRuntimeDefinition;
  snapshot: ExecutionSnapshot;
  checkRequest: BrowserCheckRequest | null;
  checkState: CheckState;
  hints: string[];
  revealedHintCount: number;
  hasEditableHtml: boolean;
  onCheckResult: (result: CheckResultMessage) => void;
}

export function PreviewPanel({
  runtime,
  snapshot,
  checkRequest,
  checkState,
  hints,
  revealedHintCount,
  hasEditableHtml,
  onCheckResult,
}: PreviewPanelProps) {
  const [viewportPresetId, setViewportPresetId] =
    useState<ViewportPresetId>("responsive");
  const [canvasWidth, setCanvasWidth] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const updateCanvasWidth = () => {
      setCanvasWidth(canvas.clientWidth);
    };

    updateCanvasWidth();

    const observer = new ResizeObserver(updateCanvasWidth);
    observer.observe(canvas);

    return () => {
      observer.disconnect();
    };
  }, []);

  const viewportPreset = useMemo(
    () =>
      VIEWPORT_PRESETS.find((preset) => preset.id === viewportPresetId) ??
      VIEWPORT_PRESETS[0],
    [viewportPresetId],
  );

  const availableFrameWidth = Math.max(canvasWidth - 32, 0);
  const presetScale =
    viewportPreset.width && availableFrameWidth > 0
      ? Math.min(1, availableFrameWidth / viewportPreset.width)
      : 1;
  const revealedHints = hints.slice(0, revealedHintCount);
  const viewportLabel =
    viewportPreset.width && viewportPreset.height
      ? `${viewportPreset.width} × ${viewportPreset.height}`
      : "Responsive";

  const previewFrame = (
    <BrowserRuntimeFrame
      runtime={runtime}
      snapshot={snapshot}
      checkRequest={checkRequest}
      onCheckResult={onCheckResult}
      width={viewportPreset.width ?? "100%"}
      height={viewportPreset.height ?? "100%"}
    />
  );

  return (
    <section
      className="flex h-full min-w-0 flex-col bg-panel"
      aria-labelledby="preview-title"
    >
      <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 sm:px-5">
        <div className="flex min-w-0 items-baseline gap-2">
          <h2
            id="preview-title"
            className="font-heading text-sm font-semibold text-panel-foreground"
          >
            Preview
          </h2>
          <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Live
          </span>
          <span className="truncate text-[11px] tabular-nums text-muted-foreground">
            {viewportLabel}
          </span>
        </div>

        <div
          className="flex shrink-0 items-center border border-border bg-background p-0.5"
          aria-label="预览视口宽度"
        >
          {VIEWPORT_PRESETS.map((preset) => {
            const active = preset.id === viewportPresetId;

            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                title={
                  preset.width && preset.height
                    ? `${preset.width} × ${preset.height}`
                    : "跟随当前 Preview 面板尺寸"
                }
                onClick={() => setViewportPresetId(preset.id)}
                className={[
                  "h-6 px-2 text-[10px] font-medium tabular-nums transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-panel-subtle hover:text-panel-foreground",
                ].join(" ")}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        ref={canvasRef}
        className="h-[clamp(300px,42vh,520px)] shrink-0 overflow-auto border-b border-border bg-workspace p-4"
      >
        {viewportPreset.id === "responsive" ? (
          <div className="mx-auto flex h-full w-full min-w-0 flex-col overflow-hidden border border-border bg-panel shadow-sm">
            <BrowserChrome />
            <div className="min-h-0 flex-1">{previewFrame}</div>
          </div>
        ) : viewportPreset.width && viewportPreset.height ? (
          <div
            className="mx-auto"
            style={{
              width: viewportPreset.width * presetScale,
              height:
                (viewportPreset.height + BROWSER_CHROME_HEIGHT) * presetScale,
            }}
          >
            <div
              className="flex origin-top-left flex-col overflow-hidden border border-border bg-panel shadow-sm"
              style={{
                width: viewportPreset.width,
                height: viewportPreset.height + BROWSER_CHROME_HEIGHT,
                transform: `scale(${presetScale})`,
              }}
            >
              <BrowserChrome />
              {previewFrame}
            </div>
          </div>
        ) : null}
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
            修改代码后点击底部“检查答案”。失败时会显示检测器读取到的实际值和期望值。
          </p>
        ) : (
          <CheckResults
            state={checkState}
            compact
            hasEditableHtml={hasEditableHtml}
          />
        )}

        {revealedHints.length > 0 ? (
          <section className="mt-6 border-t border-border pt-5" aria-label="提示">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-warning" aria-hidden="true" />
                <p className="text-sm font-semibold text-panel-foreground">
                  提示
                </p>
              </div>
              <span className="text-[11px] tabular-nums text-muted-foreground">
                {revealedHints.length} / {hints.length}
              </span>
            </div>
            <ol className="mt-3 space-y-3">
              {revealedHints.map((hint, index) => (
                <li
                  key={`${index}:${hint}`}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-sm leading-6 text-muted-foreground"
                >
                  <span className="font-mono text-xs text-warning">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{hint}</span>
                </li>
              ))}
            </ol>
            {revealedHints.length < hints.length ? (
              <p className="mt-3 text-xs leading-5 text-muted-foreground">
                仍然卡住的话，再点一次底部“提示”查看下一层线索。
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </section>
  );
}

function BrowserChrome() {
  return (
    <div
      className="flex h-8 shrink-0 items-center gap-1.5 border-b border-border bg-panel-subtle px-3"
      aria-hidden="true"
    >
      <span className="size-2 rounded-full bg-muted-foreground/25" />
      <span className="size-2 rounded-full bg-muted-foreground/25" />
      <span className="size-2 rounded-full bg-muted-foreground/25" />
    </div>
  );
}
