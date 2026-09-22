import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { readStudioContentHealth } from "@/features/studio/lib/content-health";
import { FileContentReader } from "@/lib/content/file/file-content-reader";
import { cn } from "@/lib/utils";

const contentReader = new FileContentReader();

function statusClasses(status: "draft" | "published"): string {
  return status === "published"
    ? "bg-accent text-accent-foreground"
    : "border border-border bg-background text-muted-foreground";
}

export default async function StudioPage() {
  try {
    const report = await readStudioContentHealth(contentReader);

    return (
      <main className="min-h-screen bg-workspace px-4 py-6 text-workspace-foreground sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl">
          <header className="flex flex-col gap-5 rounded-[1.75rem] border border-border bg-panel px-6 py-7 shadow-[0_12px_36px_-28px_var(--foreground)] sm:flex-row sm:items-end sm:justify-between sm:px-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                CSS Lab
              </p>
              <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.04em] text-panel-foreground">
                CSS Lab Studio
              </h1>
              <p className="mt-3 max-w-2xl leading-7 text-muted-foreground">
                只读内容健康面板。这里验证跨文件约束与发布链，不承担内容编辑或 learner runtime 职责。
              </p>
            </div>
            <Link
              href="/learn"
              className={cn(buttonVariants({ variant: "outline" }), "shrink-0")}
            >
              返回学习 Workspace
            </Link>
          </header>

          <section
            className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            aria-label="Content counts"
          >
            {[
              ["Courses", report.counts.courses],
              ["Modules", report.counts.modules],
              ["Lessons", report.counts.lessons],
              ["Exercises", report.counts.exercises],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-2xl border border-border bg-panel px-5 py-4"
              >
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  {label}
                </p>
                <p className="mt-2 font-heading text-2xl font-semibold tabular-nums text-panel-foreground">
                  {value}
                </p>
              </div>
            ))}
          </section>

          <section
            className="mt-5 rounded-[1.5rem] border border-border bg-panel px-6 py-6 sm:px-7"
            aria-labelledby="content-health-title"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Validation
                </p>
                <h2
                  id="content-health-title"
                  className="mt-2 font-heading text-xl font-semibold text-panel-foreground"
                >
                  Content Health
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {report.counts.publishedExercises} 个 exercise 当前可进入 published learner chain。
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 font-medium",
                    report.errorCount === 0
                      ? "bg-accent text-accent-foreground"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {report.errorCount} blocking issues
                </span>
                <span className="rounded-full bg-warning/20 px-3 py-1.5 font-medium text-warning-foreground">
                  {report.warningCount} warnings
                </span>
              </div>
            </div>

            {report.issues.length === 0 ? (
              <p className="mt-5 rounded-xl bg-accent px-4 py-3 text-sm text-accent-foreground">
                全部内容健康检查通过。
              </p>
            ) : (
              <ul className="mt-5 space-y-3">
                {report.issues.map((issue, index) => (
                  <li
                    key={`${issue.code}:${issue.location}:${index}`}
                    className="rounded-xl border border-border bg-panel-subtle px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em]",
                          issue.severity === "error"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/20 text-warning-foreground",
                        )}
                      >
                        {issue.severity}
                      </span>
                      <code className="text-xs text-muted-foreground">
                        {issue.code}
                      </code>
                    </div>
                    <p className="mt-2 text-sm font-medium text-panel-foreground">
                      {issue.message}
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      {issue.location}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="mt-5 space-y-4" aria-labelledby="catalog-title">
            <div className="px-1">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Catalog
              </p>
              <h2
                id="catalog-title"
                className="mt-2 font-heading text-xl font-semibold text-panel-foreground"
              >
                Content Catalog
              </h2>
            </div>

            {report.courses.map(({ course, modules }) => (
              <article
                key={course.id}
                className="rounded-[1.5rem] border border-border bg-panel px-5 py-5 sm:px-7"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-heading text-lg font-semibold text-panel-foreground">
                    {course.title}
                  </h3>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px] font-medium",
                      statusClasses(course.status),
                    )}
                  >
                    {course.status}
                  </span>
                  <code className="text-xs text-muted-foreground">
                    {course.id}
                  </code>
                </div>

                <div className="mt-5 space-y-4">
                  {modules.map(({ module, lessons }) => (
                    <div
                      key={module.id}
                      className="rounded-xl border border-border bg-panel-subtle px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-panel-foreground">
                          {module.title}
                        </h4>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[11px] font-medium",
                            statusClasses(module.status),
                          )}
                        >
                          {module.status}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {lessons.map(({ lesson, exercises }) => (
                          <div
                            key={lesson.id}
                            className="rounded-lg border border-border bg-panel px-4 py-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium text-panel-foreground">
                                {lesson.title}
                              </p>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  statusClasses(lesson.status),
                                )}
                              >
                                {lesson.status}
                              </span>
                            </div>

                            <ul className="mt-3 space-y-2">
                              {exercises.map(({ exercise, learnerHref }) => (
                                <li
                                  key={exercise.id}
                                  className="flex flex-col gap-2 rounded-lg bg-panel-subtle px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-sm text-panel-foreground">
                                        {exercise.title}
                                      </span>
                                      <span
                                        className={cn(
                                          "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                          statusClasses(exercise.status),
                                        )}
                                      >
                                        {exercise.status}
                                      </span>
                                    </div>
                                    <code className="mt-1 block truncate text-[11px] text-muted-foreground">
                                      {exercise.id} · rev {exercise.revision}
                                    </code>
                                  </div>

                                  {learnerHref ? (
                                    <Link
                                      href={learnerHref}
                                      className={cn(
                                        buttonVariants({
                                          variant: "ghost",
                                          size: "sm",
                                        }),
                                        "self-start sm:self-auto",
                                      )}
                                    >
                                      打开 learner
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      不在 published chain
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        </div>
      </main>
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown content loading error";

    return (
      <main className="flex min-h-screen items-center justify-center bg-workspace px-5 py-10 text-workspace-foreground">
        <div className="w-full max-w-2xl rounded-[1.75rem] border border-destructive/30 bg-panel px-6 py-8 sm:px-8">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-destructive">
            Content load failed
          </p>
          <h1 className="mt-3 font-heading text-2xl font-semibold text-panel-foreground">
            CSS Lab Studio
          </h1>
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            ContentReader 无法完成全库读取。修复文件或 schema 错误后，此页面会恢复为健康报告。
          </p>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-panel-subtle p-4 text-xs leading-6 text-destructive">
            {message}
          </pre>
        </div>
      </main>
    );
  }
}
