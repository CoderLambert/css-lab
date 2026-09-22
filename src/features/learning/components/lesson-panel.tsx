import { Badge } from "@/components/ui/badge";

export function LessonPanel() {
  return (
    <section className="flex h-full min-w-0 flex-col bg-panel" aria-labelledby="lesson-title">
      <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-sm font-semibold tabular-nums text-accent-foreground">
            03
          </span>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Lesson
            </p>
            <h2 id="lesson-title" className="mt-1 font-heading text-base font-semibold text-panel-foreground">
              Flexbox 基础
            </h2>
          </div>
        </div>
        <span className="shrink-0 pt-1 text-xs text-muted-foreground">8 min</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-6">
        <Badge variant="secondary" className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground">
          Flexbox Alignment
        </Badge>

        <h1 className="mt-5 max-w-[22rem] font-heading text-[clamp(1.45rem,2.5vw,1.85rem)] font-semibold leading-tight tracking-[-0.035em] text-panel-foreground">
          让元素稳定地居中
        </h1>
        <p className="mt-4 max-w-[30rem] text-sm leading-7 text-muted-foreground">
          通过 Flexbox 的主轴与交叉轴对齐能力，将内容放置在容器中央。这种方式简单、稳定，也很适合构建现代组件布局。
        </p>

        <div className="mt-7 border-l-2 border-lesson-highlight-border bg-lesson-highlight px-4 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-foreground">
            核心概念
          </p>
          <p className="mt-2 text-sm leading-6 text-panel-foreground">
            <code className="font-mono text-[0.92em] text-accent-foreground">justify-content</code>{" "}
            控制主轴上的对齐方式，
            <code className="font-mono text-[0.92em] text-accent-foreground">align-items</code>{" "}
            控制交叉轴上的对齐方式。
          </p>
        </div>

        <div className="mt-7">
          <p className="text-sm font-semibold text-panel-foreground">本题任务</p>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            修改中间的 CSS，让右侧预览中的绿色方块同时在容器的水平与垂直方向都居中。
          </p>
        </div>

        <div className="mt-7 border-t border-border pt-5">
          <p className="text-sm font-semibold text-panel-foreground">提示</p>
          <ul className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
            <li className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
              <span>先确认容器已经进入 flex 布局上下文。</span>
            </li>
            <li className="flex gap-2.5">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-success" aria-hidden="true" />
              <span>再分别处理主轴和交叉轴的对齐。</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
