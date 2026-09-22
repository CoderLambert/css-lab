import Link from "next/link";
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
    <aside className="rounded-xl border border-border bg-panel-subtle p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Mental model
      </p>
      <p className="mt-2 font-heading text-sm font-semibold text-panel-foreground">
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
    <section className="grid gap-3 sm:grid-cols-2" aria-label="属性对比">
      {items.map((item) => (
        <article
          key={item.title}
          className="rounded-xl border border-border bg-panel-subtle p-4"
        >
          <p className="font-heading text-sm font-semibold text-panel-foreground">
            {item.title}
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-editor p-3 text-xs leading-6 text-editor-foreground">
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
    <article className="rounded-xl border border-border bg-panel-subtle p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Exercise
      </p>
      <p className="mt-2 font-heading text-sm font-semibold text-panel-foreground">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{goal}</p>
      <Link
        href={href}
        className="mt-4 inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
      >
        打开练习
      </Link>
    </article>
  );
}
