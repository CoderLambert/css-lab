import type { Exercise } from "@/lib/content/types";

export interface LegacyCssExerciseInputs {
  html: string;
  baseCss: string;
  starterCss: string;
}

// Temporary M6A bridge. Task 03 removes Progress legacy CSS input,
// Task 04 removes CSS-only editor state, and Task 05 deletes this bridge.
export function deriveLegacyCssExerciseInputs(exercise: Exercise): LegacyCssExerciseInputs {
  const expected = [
    ["index.html", "html", false],
    ["base.css", "css", false],
    ["style.css", "css", true],
  ] as const;
  const files = exercise.workspace.definition.files;
  if (
    exercise.runtime.type !== "browser" ||
    exercise.runtime.entry !== "index.html" ||
    files.length !== expected.length ||
    expected.some(([path, language, editable], index) => {
      const file = files[index];
      return !file || file.path !== path || file.language !== language || file.editable !== editable;
    })
  ) {
    throw new Error("Exercise is outside the temporary M6A CSS compatibility topology");
  }

  const starter = exercise.workspace.starter.files;
  const html = starter["index.html"];
  const baseCss = starter["base.css"];
  const starterCss = starter["style.css"];
  if (html === undefined || baseCss === undefined || starterCss === undefined) {
    throw new Error("Exercise starter workspace is incomplete");
  }
  return { html, baseCss, starterCss };
}
