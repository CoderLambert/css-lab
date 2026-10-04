import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

import {
  BROWSER_RUNTIME_BRIDGE_VERSION,
  createBrowserDocument,
} from "../src/features/exercise/runtime/browser/lib/browser-document";
import {
  acceptsCheckResult,
  createBrowserDocumentIdentity,
  planCapturedCheckDispatch,
  type BrowserDocumentIdentity,
} from "../src/features/exercise/runtime/browser/lib/browser-host";
import {
  createCheckRunMessage,
  isCheckResultMessage,
  isCheckRunMessage,
  type CheckResultMessage,
} from "../src/features/exercise/runtime/browser/lib/browser-messages";
import {
  CheckSchema,
  ExerciseRecordSchema,
  type Check,
  type LayoutMaxContentCheck,
} from "../src/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "../src/lib/workspace/types";

const root = resolve(process.cwd(), "content/courses/css-foundations/modules/box-model-and-flow/lessons/sizing-constraints-and-overflow/exercises/observe-intrinsic-content");
const exercise = ExerciseRecordSchema.parse(JSON.parse(readFileSync(resolve(root, "exercise.json"), "utf8")));
const starterFiles = exercise.workspace.files.map((file) => ({
  path: file.path,
  language: file.language,
  content: readFileSync(resolve(root, "starter", file.path), "utf8"),
}));
const starterCss = readFileSync(resolve(root, "starter/style.css"), "utf8");
const solutionCss = readFileSync(resolve(root, "solution/style.css"), "utf8");
let sequence = 0;

function snapshot(css = starterCss): ExecutionSnapshot {
  return {
    files: starterFiles.map((file) =>
      file.path === "style.css" ? { ...file, content: css } : file,
    ),
  };
}

function maxContentCheck(overrides: Partial<LayoutMaxContentCheck> = {}): LayoutMaxContentCheck {
  return {
    id: "label-max-content-applied",
    type: "layout-max-content",
    selector: "#intrinsic-demo .label",
    axis: "x",
    message: "实际 inline size 应与 max-content 参考尺寸一致",
    ...overrides,
  };
}

interface MountedRuntime {
  generationId: string;
  identity: BrowserDocumentIdentity;
}

async function mountRuntime(page: Page): Promise<MountedRuntime> {
  const captured = snapshot();
  const generationId = `intrinsic-generation-${++sequence}`;
  const descriptor = createBrowserDocument({
    runtime: exercise.runtime,
    snapshot: captured,
    generationId,
    nonce: "00112233445566778899aabbccddeeff",
  });
  await page.setContent('<iframe id="runtime" width="800" height="600" sandbox="allow-scripts"></iframe>');
  await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing runtime frame");
    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "runtime:ready" &&
          event.data?.generationId === generationId
        ) {
          window.clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
          resolve();
        }
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("runtime ready timed out"));
      }, 5000);
      window.addEventListener("message", onMessage);
      iframe.srcdoc = srcDoc;
    });
  }, descriptor);
  return {
    generationId,
    identity: createBrowserDocumentIdentity(
      exercise.runtime,
      captured,
      BROWSER_RUNTIME_BRIDGE_VERSION,
    ),
  };
}

async function runChecks(
  page: Page,
  mounted: MountedRuntime,
  captured: ExecutionSnapshot,
  checks: readonly Check[] = exercise.checks,
  ignoredMessages: unknown[] = [],
): Promise<CheckResultMessage> {
  const requestId = `intrinsic-request-${++sequence}`;
  const messages = [
    ...ignoredMessages,
    ...planCapturedCheckDispatch(
      mounted.generationId,
      exercise.runtime,
      mounted.identity,
      { requestId, snapshot: captured, checks },
    ),
  ];
  const values = await page.evaluate(
    async ({ messages, generationId, requestId }) => {
      const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
      const target = iframe?.contentWindow;
      if (!target) throw new Error("missing runtime window");
      return new Promise<unknown[]>((resolve, reject) => {
        const received: unknown[] = [];
        const onMessage = (event: MessageEvent) => {
          if (
            event.source !== target ||
            event.data?.source !== "lab-runtime" ||
            event.data?.type !== "check:result" ||
            event.data?.generationId !== generationId
          ) return;
          received.push(event.data);
          if (event.data?.requestId === requestId) {
            window.clearTimeout(timeout);
            window.removeEventListener("message", onMessage);
            resolve(received);
          }
        };
        const timeout = window.setTimeout(() => {
          window.removeEventListener("message", onMessage);
          reject(new Error("check result timed out"));
        }, 5000);
        window.addEventListener("message", onMessage);
        for (const message of messages) target.postMessage(message, "*");
      });
    },
    { messages, generationId: mounted.generationId, requestId },
  );
  expect(values).toHaveLength(1);
  const value = values[0];
  if (!isCheckResultMessage(value)) throw new Error("invalid check result");
  expect(acceptsCheckResult(value, mounted.generationId, requestId)).toBe(true);
  return value;
}

async function measure(page: Page) {
  const frame = page.frames().find(
    (candidate) => candidate.parentFrame() === page.mainFrame(),
  );
  if (!frame) throw new Error("missing runtime iframe");
  return frame.evaluate(() => {
    const frameElement = document.querySelector<HTMLElement>("#intrinsic-demo");
    const label = document.querySelector<HTMLElement>("#intrinsic-demo .label");
    if (!frameElement || !label) throw new Error("missing intrinsic fixture");
    const frameRect = frameElement.getBoundingClientRect();
    const labelRect = label.getBoundingClientRect();
    const frameStyle = getComputedStyle(frameElement);
    const borderX =
      Number.parseFloat(frameStyle.borderLeftWidth) +
      Number.parseFloat(frameStyle.borderRightWidth);
    const paddingX =
      Number.parseFloat(frameStyle.paddingLeft) +
      Number.parseFloat(frameStyle.paddingRight);
    return {
      frameContentWidth: frameRect.width - borderX - paddingX,
      labelWidth: labelRect.width,
      labelHeight: labelRect.height,
      display: getComputedStyle(label).display,
      visibility: getComputedStyle(label).visibility,
      opacity: getComputedStyle(label).opacity,
      authoredVisibleText: label.textContent,
    };
  });
}

function result(response: CheckResultMessage, id: string) {
  const item = response.results.find((entry) => entry.id === id);
  if (!item) throw new Error(`missing check result: ${id}`);
  return item;
}

test("intrinsic exercise v2 keeps draft identity and source/layout evidence boundaries", () => {
  expect(exercise.status).toBe("draft");
  expect(exercise.revision).toBe(2);
  expect(exercise.id).toBe(
    "css.box-model-and-flow.sizing-constraints-and-overflow.observe-intrinsic-content.001",
  );
  expect(exercise.checks).toContainEqual(
    expect.objectContaining({
      id: "label-display-block-authored",
      type: "rule-style",
      path: "style.css",
      selector: "#intrinsic-demo .label",
      property: "display",
      equals: "block",
    }),
  );
  expect(exercise.checks).toContainEqual(
    expect.objectContaining({
      id: "label-width-max-content",
      type: "rule-style",
      path: "style.css",
      selector: "#intrinsic-demo .label",
      property: "width",
      equals: "max-content",
    }),
  );
  expect(exercise.checks).toContainEqual(
    expect.objectContaining({
      id: "label-max-content-applied",
      type: "layout-max-content",
      selector: "#intrinsic-demo .label",
      axis: "x",
    }),
  );
  expect(exercise.checks).toContainEqual(
    expect.objectContaining({
      id: "label-visible-and-contained",
      type: "layout-contained",
      selector: "#intrinsic-demo .label",
      within: "#intrinsic-demo",
      axis: "x",
    }),
  );
  expect(starterCss).not.toContain("white-space");
  expect(solutionCss).not.toContain("white-space");
});

test("starter available-space sizing visibly shrinks to max-content in the real iframe", async ({ page }) => {
  const mounted = await mountRuntime(page);

  const starterResult = await runChecks(page, mounted, snapshot(starterCss));
  expect(starterResult.passed).toBe(false);
  expect(result(starterResult, "label-display-block-authored").reason).toBe("matched");
  expect(result(starterResult, "label-display-block-applied").reason).toBe("matched");
  expect(result(starterResult, "label-width-max-content").reason).toBe("mismatch");
  expect(result(starterResult, "label-max-content-applied").reason).toBe("mismatch");
  expect(result(starterResult, "label-visible-and-contained").reason).toBe("matched");
  const starterMeasure = await measure(page);
  expect(starterMeasure.display).toBe("block");
  expect(Math.abs(starterMeasure.labelWidth - starterMeasure.frameContentWidth)).toBeLessThanOrEqual(0.75);

  const solvedResult = await runChecks(page, mounted, snapshot(solutionCss));
  expect(solvedResult.passed).toBe(true);
  expect(result(solvedResult, "label-width-max-content").reason).toBe("matched");
  expect(result(solvedResult, "label-max-content-applied").reason).toBe("matched");
  expect(result(solvedResult, "label-visible-and-contained").reason).toBe("matched");
  const solvedMeasure = await measure(page);
  expect(solvedMeasure.display).toBe("block");
  expect(solvedMeasure.visibility).toBe("visible");
  expect(solvedMeasure.opacity).toBe("1");
  expect(solvedMeasure.labelHeight).toBeGreaterThan(0);
  expect(solvedMeasure.labelWidth).toBeLessThan(starterMeasure.labelWidth - 1);
  expect(solvedMeasure.labelWidth).toBeLessThan(solvedMeasure.frameContentWidth - 1);
  expect(solvedMeasure.authoredVisibleText).toContain("intrinsic content");
});

test("direct fixed pixels and same-selector fixed-width overrides fail authored evidence", async ({ page }) => {
  const mounted = await mountRuntime(page);

  for (const css of [
    "#intrinsic-demo .label { display:block; width:260px; }",
    solutionCss + "#intrinsic-demo .label { width:260px; }",
  ]) {
    const response = await runChecks(page, mounted, snapshot(css));
    expect(response.passed, css).toBe(false);
    expect(result(response, "label-width-max-content").reason, css).toBe("mismatch");
  }
});

test("common lower-specificity width overrides cannot displace the intended max-content rule", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const baseline = await runChecks(page, mounted, snapshot(solutionCss));
  expect(baseline.passed).toBe(true);
  const baselineMeasure = await measure(page);

  for (const css of [
    solutionCss + ".frame .label { width:260px; }",
    solutionCss + "body .label { width:260px; }",
    solutionCss + ".label:first-child { width:260px; }",
    solutionCss + "* > .label { width:260px; }",
  ]) {
    const response = await runChecks(page, mounted, snapshot(css));
    expect(response.passed, css).toBe(true);
    const current = await measure(page);
    expect(Math.abs(current.labelWidth - baselineMeasure.labelWidth), css).toBeLessThanOrEqual(0.75);
  }
});


test("higher-specificity same-property width overrides cannot preserve a false pass", async ({ page }) => {
  const mounted = await mountRuntime(page);

  for (const css of [
    solutionCss + "body #intrinsic-demo .label { width:auto; }",
    solutionCss + "body #intrinsic-demo .label { width:260px; }",
    solutionCss + "body #intrinsic-demo .label { inline-size:auto; }",
    solutionCss + "body #intrinsic-demo .label { max-width:100px; }",
  ]) {
    const response = await runChecks(page, mounted, snapshot(css));
    expect(result(response, "label-width-max-content").reason, css).toBe("matched");
    expect(result(response, "label-max-content-applied").reason, css).toBe("mismatch");
    expect(response.passed, css).toBe(false);
  }
});

test("layout-max-content schema, host and iframe validation stay strict", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const valid = maxContentCheck();
  expect(CheckSchema.safeParse(valid).success).toBe(true);
  expect(isCheckRunMessage(createCheckRunMessage("generation", "request", [valid]))).toBe(true);

  const invalid: unknown[] = [
    { ...valid, axis: "y" },
    { ...valid, axis: undefined },
    { ...valid, selector: " " },
    { ...valid, tolerance: 10 },
    { ...valid, equals: "max-content" },
  ];
  for (const check of invalid) {
    expect(CheckSchema.safeParse(check).success).toBe(false);
    expect(isCheckRunMessage({
      source: "lab-host",
      type: "check:run",
      generationId: "generation",
      requestId: "request",
      checks: [check],
    })).toBe(false);
  }

  const base = createCheckRunMessage(mounted.generationId, "ignored", [valid]);
  const ignored = invalid.map((check, index) => ({
    ...base,
    requestId: `invalid-max-content-${index}`,
    checks: [check],
  }));
  const response = await runChecks(
    page,
    mounted,
    snapshot(solutionCss),
    [valid],
    ignored,
  );
  expect(response.passed).toBe(true);
  expect(result(response, valid.id).reason).toBe("matched");
});

test("display-context, hidden, transform, zero-size and fixture rewrites do not preserve a false pass", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const cases: Array<[string, string, "mismatch" | "checker-error"]> = [
    [
      solutionCss + "body #intrinsic-demo .label { display:inline; }",
      "label-display-block-applied",
      "mismatch",
    ],
    [
      solutionCss + "#intrinsic-demo .label { visibility:hidden; }",
      "label-visible-and-contained",
      "mismatch",
    ],
    [
      solutionCss + "#intrinsic-demo .label { opacity:0; }",
      "label-visible-and-contained",
      "mismatch",
    ],
    [
      solutionCss + "#intrinsic-demo .label { transform:scale(1); }",
      "label-visible-and-contained",
      "checker-error",
    ],
    [
      solutionCss + "#intrinsic-demo .label { width:max-content; height:0; overflow:hidden; }",
      "label-visible-and-contained",
      "mismatch",
    ],
    [
      solutionCss + "#intrinsic-demo { width:700px; }",
      "fixture-width-kept",
      "mismatch",
    ],
    [
      solutionCss + "#intrinsic-demo { box-sizing:content-box; }",
      "fixture-box-sizing-kept",
      "mismatch",
    ],
  ];
  for (const [css, id, reason] of cases) {
    const response = await runChecks(page, mounted, snapshot(css));
    expect(response.passed, css).toBe(false);
    expect(result(response, id).reason, css).toBe(reason);
  }
});
