const codeLines = [
  <><span className="text-editor-selector">.container</span> <span className="text-editor-foreground">&#123;</span></>,
  <><span className="text-editor-property">  display</span><span className="text-editor-foreground">: </span><span className="text-editor-value">flex</span><span className="text-editor-foreground">;</span></>,
  <><span className="text-editor-property">  justify-content</span><span className="text-editor-foreground">: </span><span className="text-editor-value">center</span><span className="text-editor-foreground">;</span></>,
  <><span className="text-editor-property">  align-items</span><span className="text-editor-foreground">: </span><span className="text-editor-value">center</span><span className="text-editor-foreground">;</span></>,
  <><span className="text-editor-foreground">&#125;</span></>,
  <></>,
  <><span className="text-editor-comment">{"/* Try changing the alignment values */"}</span></>,
];

export function EditorPanel() {
  return (
    <section className="flex h-full min-w-0 flex-col bg-editor text-editor-foreground" aria-labelledby="editor-title">
      <div className="flex items-center justify-between border-b border-editor-line-active px-5 py-5 sm:px-6">
        <div>
          <p id="editor-title" className="font-mono text-sm font-medium text-editor-foreground">
            style.css
          </p>
          <p className="mt-1 text-xs text-editor-muted">实时编辑</p>
        </div>
        <span className="flex items-center gap-2 text-[11px] text-editor-muted">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          synced
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto py-5 font-mono text-[13px] leading-8 sm:py-6 sm:text-sm">
        {codeLines.map((line, index) => (
          <div
            key={index}
            className={`flex min-w-max px-5 sm:px-6 ${index === 3 ? "bg-editor-line-active" : ""}`}
          >
            <span className="w-8 shrink-0 select-none pr-4 text-right text-xs tabular-nums text-editor-muted/60">
              {index + 1}
            </span>
            <code className="whitespace-pre">{line}</code>
          </div>
        ))}
      </div>

      <div className="border-t border-editor-line-active px-5 py-3 text-[11px] text-editor-muted sm:px-6">
        CSS · UTF-8 · 7 lines
      </div>
    </section>
  );
}
