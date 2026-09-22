import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Lightbulb,
  RotateCcw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface WorkspaceFooterProps {
  isChecking: boolean;
  isHydrated: boolean;
  previousHref: string | null;
  nextHref: string | null;
  onCheck: () => void;
  onReset: () => void;
}

export function WorkspaceFooter({
  isChecking,
  isHydrated,
  previousHref,
  nextHref,
  onCheck,
  onReset,
}: WorkspaceFooterProps) {
  const previousButton = previousHref ? (
    <Button variant="ghost" size="sm" render={<Link href={previousHref} />}>
      <ArrowLeft />
      上一题
    </Button>
  ) : (
    <Button variant="ghost" size="sm" disabled>
      <ArrowLeft />
      上一题
    </Button>
  );
  const nextButton = nextHref ? (
    <Button variant="ghost" size="sm" render={<Link href={nextHref} />}>
      下一题
      <ArrowRight />
    </Button>
  ) : (
    <Button variant="ghost" size="sm" disabled>
      下一题
      <ArrowRight />
    </Button>
  );

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {previousButton}
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          自动保存到本地 · 舒适专注模式
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled>
          <Lightbulb />
          提示
        </Button>
        <Button
          size="sm"
          disabled={isChecking || !isHydrated}
          onClick={onCheck}
        >
          <Check />
          {!isHydrated ? "准备中…" : isChecking ? "检查中…" : "检查答案"}
        </Button>
        {nextButton}
      </div>
    </footer>
  );
}
