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
  isCheckResultMessage,
  type CheckResultMessage,
} from "../src/features/exercise/runtime/browser/lib/browser-messages";
import {
  ExerciseRecordSchema,
  type Check,
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
): Promise<CheckResultMessage> {
  const requestId = `intrinsic-request-${++sequence}`;
  const messages = planCapturedCheckDispatch(
    mounted.generationId,
    exercise.runtime,
    mounted.identity,
    { requestId, snapshot: captured, checks },
  );
  const value = await page.evaluate(
    async ({ messages, generationId, requestId }) => {
      const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
      const target = iframe?.contentWindow;
      if (!target) throw new Error("missing runtime window");
      return new Promise<unknown>((resolve, reject) => {
        const onMessage = (event: MessageEvent) => {
          if (
            event.source === target &&
            event.data?.source === "lab-runtime" &&
            event.data?.type === "check:result" &&
            event.data?.generationId === generationId &&
            event.data?.requestId === requestId
          ) {
            window.clearTimeout(timeout);
            window.removeEventListener("message", onMessage);
            resolve(event.data);
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
    const frameElement = document.querySelector<HTMLElement>(".frame");
    const label = document.querySelector<HTMLElement>(".label");
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
      authoredVisibleText: label.textContent,
    };
  });
}

function result(response: CheckResultMessage, id: string) {
  const item = response.results.find((entry) => entry.id === id);
  if (!item) throw new Error(`missing check result: ${id}`);
  return item;
}

test("intrinsic exercise v2 keeps draft identity and source-aware checks", () => {
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
      selector: ".label",
      property: "display",
      equals: "block",
    }),
  );
  expect(exercise.checks).toContainEqual(
    expect.objectContaining({
      id: "label-width-max-content",
      type: "rule-style",
      path: "style.css",
      property: "width",
      equals: "max-content",
    }),
  );
  expect(starterCss).not.toContain("white-space");
  expect(solutionCss).not.toContain("white-space");
});

test("starter available-space sizing and solved max-content sizing are visibly different in the real iframe", async ({ page }) => {
  const mounted = await mountRuntime(page);

  const starterResult = await runChecks(page, mounted, snapshot(starterCss));
  expect(starterResult.passed).toBe(false);
  expect(result(starterResult, "label-display-block-authored").reason).toBe("matched");
  expect(result(starterResult, "label-display-block-applied").reason).toBe("matched");
  expect(result(starterResult, "label-width-max-content").reason).toBe("mismatch");
  const starterMeasure = await measure(page);
  expect(starterMeasure.display).toBe("block");
  expect(Math.abs(starterMeasure.labelWidth - starterMeasure.frameContentWidth)).toBeLessThanOrEqual(0.75);

  const solvedResult = await runChecks(page, mounted, snapshot(solutionCss));
  expect(solvedResult.passed).toBe(true);
  expect(result(solvedResult, "label-width-max-content").reason).toBe("matched");
  const solvedMeasure = await measure(page);
  expect(solvedMeasure.display).toBe("block");
  expect(solvedMeasure.labelWidth).toBeGreaterThan(starterMeasure.labelWidth + 1);
  expect(solvedMeasure.labelWidth).toBeGreaterThan(solvedMeasure.frameContentWidth + 1);
  expect(solvedMeasure.authoredVisibleText).toContain("intrinsic content");
});

test("fixed pixel substitution and display-context override do not satisfy the exercise contract", async ({ page }) => {
  const mounted = await mountRuntime(page);

  const fixedPixel = await runChecks(
    page,
    mounted,
    snapshot(".label { display:block; width:260px; }"),
  );
  expect(fixedPixel.passed).toBe(false);
  expect(result(fixedPixel, "label-width-max-content").reason).toBe("mismatch");

  const overriddenDisplay = await runChecks(
    page,
    mounted,
    snapshot(
      ".label { display:block; width:max-content; } .frame .label { display:inline; }",
    ),
  );
  expect(overriddenDisplay.passed).toBe(false);
  expect(result(overriddenDisplay, "label-display-block-authored").reason).toBe("matched");
  expect(result(overriddenDisplay, "label-display-block-applied").reason).toBe("mismatch");
});
