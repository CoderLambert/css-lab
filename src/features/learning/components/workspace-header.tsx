import { Settings2, SunMedium } from "lucide-react";

import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export function WorkspaceHeader() {
  return (
    <header className="flex min-h-[78px] items-center justify-between gap-4 border-b border-border bg-panel px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent font-mono text-lg font-semibold tracking-[-0.12em] text-accent-foreground">
          {"{}"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold tracking-[-0.01em] text-panel-foreground">
            CSS Lab
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Calm practice, clear focus
          </p>
        </div>
      </div>

      <div className="hidden min-w-0 items-center gap-4 min-[800px]:flex">
        <div className="text-right">
          <p className="text-xs font-medium text-panel-foreground">专注学习中</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Flexbox · 3 / 8
          </p>
        </div>
        <Progress value={38} className="w-44 gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <ProgressLabel className="text-[11px] text-muted-foreground">
              Progress
            </ProgressLabel>
            <ProgressValue className="text-[11px] text-panel-foreground">
              {() => "38%"}
            </ProgressValue>
          </div>
        </Progress>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" aria-label="切换主题" title="切换主题">
          <SunMedium />
        </Button>
        <Button variant="ghost" size="icon" aria-label="打开设置" title="打开设置">
          <Settings2 />
        </Button>
      </div>
    </header>
  );
}
