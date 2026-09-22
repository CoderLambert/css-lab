import { Settings2, SunMedium } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface WorkspaceHeaderProps {
  courseTitle: string;
  moduleTitle: string;
  currentExerciseNumber: number;
  totalExercises: number;
  progressPercent: number;
  isProgressHydrated: boolean;
}

export function WorkspaceHeader({
  courseTitle,
  moduleTitle,
  currentExerciseNumber,
  totalExercises,
  progressPercent,
  isProgressHydrated,
}: WorkspaceHeaderProps) {
  const displayedProgress = isProgressHydrated
    ? Math.round(progressPercent)
    : 0;

  return (
    <header className="flex h-16 shrink-0 items-center gap-5 border-b border-border bg-panel px-4 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-accent font-mono text-sm font-semibold tracking-[-0.1em] text-accent-foreground">
          {"{}"}
        </div>
        <div className="min-w-0">
          <p className="truncate font-heading text-sm font-semibold text-panel-foreground">
            {courseTitle}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {moduleTitle}
          </p>
        </div>
      </div>

      <div className="hidden w-[min(32vw,360px)] shrink-0 items-center gap-3 min-[720px]:flex">
        <Progress
          value={displayedProgress}
          aria-label="课程完成进度"
          className="min-w-0 flex-1"
        />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {isProgressHydrated ? `${displayedProgress}%` : "—"}
        </span>
      </div>

      <div className="hidden shrink-0 text-right min-[960px]:block">
        <p className="text-xs font-medium text-panel-foreground">
          Exercise {currentExerciseNumber} / {totalExercises}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          自动保存
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="切换主题"
          title="切换主题（暂未开放）"
          disabled
        >
          <SunMedium />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="打开设置"
          title="打开设置（暂未开放）"
          disabled
        >
          <Settings2 />
        </Button>
      </div>
    </header>
  );
}
