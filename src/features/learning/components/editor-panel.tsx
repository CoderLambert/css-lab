import { CssEditor } from "@/features/exercise/components/css-editor";

interface EditorPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorPanel({ value, onChange }: EditorPanelProps) {
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

      <div className="min-h-0 flex-1">
        <CssEditor value={value} onChange={onChange} />
      </div>

      <div className="border-t border-editor-line-active px-5 py-3 text-[11px] text-editor-muted sm:px-6">
        CSS · UTF-8
      </div>
    </section>
  );
}
