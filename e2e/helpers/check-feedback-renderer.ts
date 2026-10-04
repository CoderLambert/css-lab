import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import type { CheckResults } from "../../src/features/exercise/components/check-results";

type FeedbackProps = ComponentProps<typeof CheckResults>;

/** Compile only these trusted repository modules, never learner CSS/HTML/code. */
export function createCheckFeedbackRenderer() {
  const directory = mkdtempSync(join(tmpdir(), "css-lab-feedback-"));
  const dispose = () => rmSync(directory, { recursive: true, force: true });
  try {
    // Playwright's JSX transform emits serializable objects, not React nodes.
    // Give the real React renderer ordinary precompiled JS, without changing
    // production source, the test runner configuration, or runtime permissions.
    writeFileSync(join(directory, "package.json"), '{"type":"commonjs"}\n');
    symlinkSync(resolve(process.cwd(), "node_modules"), join(directory, "node_modules"), "junction");
    for (const [source, output] of [
      ["src/features/exercise/components/check-results.tsx", "components/check-results.js"],
      ["src/features/exercise/lib/check-result.ts", "lib/check-result.js"],
    ]) {
      const compiled = ts.transpileModule(readFileSync(resolve(process.cwd(), source), "utf8"), {
        fileName: source,
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2017 },
        reportDiagnostics: true,
      });
      if (compiled.diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
        throw new Error(`Cannot compile feedback component: ${source}`);
      }
      const destination = join(directory, output);
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, compiled.outputText);
    }
    const requireCompiled = createRequire(join(directory, "package.json"));
    const component = requireCompiled("./components/check-results.js") as { CheckResults: typeof CheckResults };
    if (typeof component.CheckResults !== "function") throw new Error("Missing compiled CheckResults export");
    return {
      render: (props: FeedbackProps) => renderToStaticMarkup(createElement(component.CheckResults, props)),
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
