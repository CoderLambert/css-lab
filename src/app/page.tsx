import Link from "next/link";
import { ArrowRight, Code2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-workspace px-5 py-10 text-workspace-foreground">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-border bg-panel px-6 py-10 shadow-[0_12px_36px_-28px_var(--foreground)] sm:px-10 sm:py-14">
        <div className="flex size-11 items-center justify-center rounded-xl bg-accent font-mono text-lg font-semibold tracking-[-0.12em] text-accent-foreground">
          {"{}"}
        </div>
        <p className="mt-8 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          A quiet place to practice
        </p>
        <h1 className="mt-3 font-heading text-4xl font-semibold tracking-[-0.05em] text-panel-foreground sm:text-5xl">
          CSS Lab
        </h1>
        <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
          Learn CSS by doing.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/learn" className={cn(buttonVariants({ size: "lg" }))}>
            <Code2 />
            进入学习
            <ArrowRight />
          </Link>
          <Link href="/studio" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            Studio
          </Link>
        </div>
      </div>
    </main>
  );
}
