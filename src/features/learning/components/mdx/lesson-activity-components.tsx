import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

interface ConceptActivityProps {
  title: string;
  children: ReactNode;
}

export function ConceptActivity({
  title,
  children,
}: ConceptActivityProps) {
  return (
    <aside className="border-l-2 border-success bg-panel-subtle/60 py-4 pl-4 pr-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Mental model
      </p>
      <p className="mt-2 font-heading text-base font-semibold text-panel-foreground">
        {title}
      </p>
      <div className="mt-3 space-y-3 text-sm leading-7 text-muted-foreground">
        {children}
      </div>
    </aside>
  );
}

interface PropertyCompareActivityProps {
  leftTitle: string;
  leftCode: string;
  leftMeaning: string;
  rightTitle: string;
  rightCode: string;
  rightMeaning: string;
}

export function PropertyCompareActivity({
  leftTitle,
  leftCode,
  leftMeaning,
  rightTitle,
  rightCode,
  rightMeaning,
}: PropertyCompareActivityProps) {
  const items = [
    {
      title: leftTitle,
      code: leftCode,
      meaning: leftMeaning,
    },
    {
      title: rightTitle,
      code: rightCode,
      meaning: rightMeaning,
    },
  ];

  return (
    <section
      className="grid overflow-hidden border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-border"
      aria-label="属性对比"
    >
      {items.map((item) => (
        <article key={item.title} className="py-5 sm:px-5 sm:first:pl-0 sm:last:pr-0">
          <p className="font-heading text-sm font-semibold text-panel-foreground">
            {item.title}
          </p>
          <pre className="mt-3 overflow-x-auto bg-editor px-3 py-2.5 text-xs leading-6 text-editor-foreground">
            <code>{item.code}</code>
          </pre>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {item.meaning}
          </p>
        </article>
      ))}
    </section>
  );
}

interface ExerciseActivityProps {
  href: string;
  title: string;
  goal: string;
}

export function ExerciseActivity({
  href,
  title,
  goal,
}: ExerciseActivityProps) {
  return (
    <Link
      href={href}
      className="group flex items-start justify-between gap-4 border-t border-border py-4 last:border-b"
    >
      <div className="min-w-0">
        <p className="font-heading text-sm font-semibold text-panel-foreground transition-colors group-hover:text-foreground">
          {title}
        </p>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          {goal}
        </p>
      </div>
      <ArrowUpRight
        className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-panel-foreground"
        aria-hidden="true"
      />
    </Link>
  );
}
