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
  hintCount: number;
  revealedHintCount: number;
  onCheck: () => void;
  onReset: () => void;
  onRevealHint: () => void;
}

export function WorkspaceFooter({
  isChecking,
  isHydrated,
  previousHref,
  nextHref,
  hintCount,
  revealedHintCount,
  onCheck,
  onReset,
  onRevealHint,
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

  const allHintsRevealed =
    hintCount === 0 || revealedHintCount >= hintCount;

  return (
    <footer className="flex h-14 shrink-0 items-center justify-between gap-3 border-t border-border bg-panel px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-1">
        {previousButton}
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={allHintsRevealed}
          onClick={onRevealHint}
        >
          <Lightbulb />
          <span>
            {revealedHintCount > 0
              ? `提示 ${revealedHintCount}/${hintCount}`
              : "提示"}
          </span>
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
