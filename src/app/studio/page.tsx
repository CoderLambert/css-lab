import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function StudioPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-workspace px-5 py-10 text-workspace-foreground">
      <div className="w-full max-w-xl rounded-[1.75rem] border border-border bg-panel px-6 py-10 shadow-[0_12px_36px_-28px_var(--foreground)] sm:px-10 sm:py-14">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          CSS Lab
        </p>
        <h1 className="mt-4 font-heading text-3xl font-semibold tracking-[-0.04em] text-panel-foreground">
          CSS Lab Studio
        </h1>
        <p className="mt-4 leading-7 text-muted-foreground">
          Content authoring workspace coming next.
        </p>
        <Link href="/learn" className={cn(buttonVariants({ variant: "outline" }), "mt-8")}>
          返回学习 Workspace
        </Link>
      </div>
    </main>
  );
}
