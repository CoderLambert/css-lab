import { Check, Lightbulb, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WorkspaceFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-panel px-5 py-3 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="ghost" size="sm">
          <RotateCcw />
          Reset
        </Button>
        <span className="hidden text-xs text-muted-foreground sm:inline">
          自动保存到本地 · 舒适专注模式
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-1 hidden items-center gap-1 text-[11px] text-muted-foreground md:flex">
          <kbd className="rounded border border-border bg-panel-subtle px-1.5 py-0.5 font-mono text-[10px]">⌘</kbd>
          <kbd className="rounded border border-border bg-panel-subtle px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
          检查
        </span>
        <Button variant="outline" size="sm">
          <Lightbulb />
          提示
        </Button>
        <Button size="sm">
          <Check />
          检查答案
        </Button>
      </div>
    </footer>
  );
}
