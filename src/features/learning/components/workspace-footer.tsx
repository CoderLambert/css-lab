import { Check, Lightbulb, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface WorkspaceFooterProps {
  isChecking: boolean;
  onCheck: () => void;
  onReset: () => void;
}

export function WorkspaceFooter({
  isChecking,
  onCheck,
  onReset,
}: WorkspaceFooterProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          实时预览 · 舒适专注模式
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled>
          <Lightbulb />
          提示
        </Button>
        <Button size="sm" disabled={isChecking} onClick={onCheck}>
          <Check />
          {isChecking ? "检查中…" : "检查答案"}
        </Button>
      </div>
    </footer>
  );
}
