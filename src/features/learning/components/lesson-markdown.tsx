import Markdown from "react-markdown";

interface LessonMarkdownProps {
  source: string;
}

export function LessonMarkdown({ source }: LessonMarkdownProps) {
  return (
    <div className="space-y-4 text-sm leading-7 text-muted-foreground">
      <Markdown
        components={{
          h1: ({ children }) => (
            <h3 className="pt-2 font-heading text-base font-semibold text-panel-foreground">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h3 className="pt-2 font-heading text-base font-semibold text-panel-foreground">
              {children}
            </h3>
          ),
          h3: ({ children }) => (
            <h4 className="pt-1 font-heading text-sm font-semibold text-panel-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => <p>{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc space-y-2 pl-5 marker:text-success">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-2 pl-5 marker:text-muted-foreground">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-panel-foreground">
              {children}
            </strong>
          ),
          code: ({ children }) => (
            <code className="rounded bg-panel-subtle px-1.5 py-0.5 font-mono text-[0.8rem] text-panel-foreground">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-xl border border-border bg-panel-subtle p-4 text-xs leading-6 text-panel-foreground">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-success pl-4">
              {children}
            </blockquote>
          ),
        }}
      >
        {source}
      </Markdown>
    </div>
  );
}
