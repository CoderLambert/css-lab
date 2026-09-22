import type { MDXComponents } from "mdx/types";

import {
  ConceptActivity,
  ExerciseActivity,
  PropertyCompareActivity,
} from "@/features/learning/components/mdx/lesson-activity-components";
import { PredictActivity } from "@/features/learning/components/mdx/predict-activity";

const components = {
  h1: ({ children }) => (
    <h2 className="font-heading text-lg font-semibold tracking-tight text-panel-foreground">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h3 className="pt-3 font-heading text-base font-semibold text-panel-foreground">
      {children}
    </h3>
  ),
  h3: ({ children }) => (
    <h4 className="pt-2 font-heading text-sm font-semibold text-panel-foreground">
      {children}
    </h4>
  ),
  p: ({ children }) => <p className="text-sm leading-7">{children}</p>,
  ul: ({ children }) => (
    <ul className="list-disc space-y-2 pl-5 marker:text-success">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal space-y-2 pl-5 marker:text-muted-foreground">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-panel-foreground">{children}</strong>
  ),
  code: ({ children }) => (
    <code className="rounded bg-panel-subtle px-1.5 py-0.5 font-mono text-[0.8rem] text-panel-foreground">
      {children}
    </code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-success pl-4">{children}</blockquote>
  ),
  Concept: ConceptActivity,
  Predict: PredictActivity,
  Compare: PropertyCompareActivity,
  Exercise: ExerciseActivity,
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
