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
  type LayoutContainedCheck,
} from "../src/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "../src/lib/workspace/types";

// Use the actual draft curriculum assets. Never publish a test-only learner route.
const exerciseRoot = resolve(process.cwd(), "content/courses/css-foundations/modules/box-model-and-flow/lessons/sizing-constraints-and-overflow/exercises/debug-fixed-width-failure");
const exercise = ExerciseRecordSchema.parse(JSON.parse(readFileSync(resolve(exerciseRoot, "exercise.json"), "utf8")));
const starterFiles = exercise.workspace.files.map((file) => ({
  path: file.path,
  language: file.language,
  content: readFileSync(resolve(exerciseRoot, "starter", file.path), "utf8"),
}));
const starterCss = readFileSync(resolve(exerciseRoot, "starter/style.css"), "utf8");
const solutionCss = readFileSync(resolve(exerciseRoot, "solution/style.css"), "utf8");
let sequence = 0;

function snapshot(css = starterCss, html?: string): ExecutionSnapshot {
  return {
    files: starterFiles.map((file) => ({
      ...file,
      content: file.path === "style.css" ? css :
        file.path === "index.html" && html !== undefined ? html : file.content,
    })),
  };
}

function layout(overrides: Partial<LayoutContainedCheck> = {}): LayoutContainedCheck {
  return {
    id: "avatar-fits-frame", type: "layout-contained", selector: ".avatar",
    within: ".frame", axis: "x", message: "头像应实际位于容器内容区内", ...overrides,
  };
}

function invalidChecks(): unknown[] {
  return [
    { ...layout(), within: undefined }, { ...layout(), within: " " },
    { ...layout(), within: null }, { ...layout(), within: [] },
    { ...layout(), selector: " " }, { ...layout(), axis: undefined },
    { ...layout(), axis: "y" }, { ...layout(), axis: ["x"] },
    { ...layout(), tolerance: 999 }, { ...layout(), viewportWidth: 390 },
    { ...layout(), equals: true }, { ...layout(), property: "width" },
    { ...layout(), path: "style.css" }, { ...layout(), alsoAccepts: [] },
    { ...layout(), id: " " }, { ...layout(), message: " " },
  ];
}

interface MountedRuntime {
  generationId: string;
  identity: BrowserDocumentIdentity;
}

async function mountRuntime(page: Page, captured = snapshot()): Promise<MountedRuntime> {
  const generationId = `layout-generation-${++sequence}`;
  const descriptor = createBrowserDocument({
    runtime: exercise.runtime, snapshot: captured, generationId,
    nonce: "00112233445566778899aabbccddeeff",
  });
  await page.setContent('<iframe id="runtime" width="800" height="600" sandbox="allow-scripts"></iframe>');
  await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing frame");
    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow && event.data?.source === "lab-runtime" &&
            event.data?.type === "runtime:ready" && event.data?.generationId === generationId) {
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
    identity: createBrowserDocumentIdentity(exercise.runtime, captured, BROWSER_RUNTIME_BRIDGE_VERSION),
  };
}

async function runChecks(
  page: Page,
  mounted: MountedRuntime,
  captured: ExecutionSnapshot,
  checks: readonly Check[] = exercise.checks,
  ignoredMessages: unknown[] = [],
): Promise<CheckResultMessage> {
  const requestId = `layout-request-${++sequence}`;
  const messages: unknown[] = [
    ...ignoredMessages,
    ...planCapturedCheckDispatch(mounted.generationId, exercise.runtime, mounted.identity, {
      requestId, snapshot: captured, checks,
    }),
  ];
  const responses = await page.evaluate(async ({ messages, requestId, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    const targetWindow = iframe?.contentWindow;
    if (!targetWindow) throw new Error("missing runtime window");
    return new Promise<unknown[]>((resolve, reject) => {
      const received: unknown[] = [];
      const onMessage = (event: MessageEvent) => {
        if (event.source !== targetWindow || event.data?.source !== "lab-runtime" ||
            event.data?.type !== "check:result" || event.data?.generationId !== generationId) return;
        received.push(event.data);
        if (event.data.requestId === requestId) {
          window.clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
          resolve(received);
        }
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("layout check timed out"));
      }, 5000);
      window.addEventListener("message", onMessage);
      for (const message of messages) targetWindow.postMessage(message, "*");
    });
  }, { messages, requestId, generationId: mounted.generationId });
  // Final valid request is a FIFO barrier; malformed packets must not emit results.
  expect(responses).toHaveLength(1);
  const response = responses[0];
  if (!isCheckResultMessage(response)) throw new Error("invalid result protocol");
  expect(acceptsCheckResult(response, mounted.generationId, requestId)).toBe(true);
  expect(acceptsCheckResult(response, "stale-generation", requestId)).toBe(false);
  expect(acceptsCheckResult(response, mounted.generationId, "stale-request")).toBe(false);
  return response;
}

function findResult(response: CheckResultMessage, id: string) {
  const found = response.results.find((item) => item.id === id);
  if (!found) throw new Error(`missing result: ${id}`);
  return found;
}

test("layout-contained has a strict schema/host contract without configurable tolerance", () => {
  expect(CheckSchema.safeParse(layout()).success).toBe(true);
  expect(isCheckRunMessage(createCheckRunMessage("generation", "request", [layout()]))).toBe(true);
  for (const check of invalidChecks()) {
    expect(CheckSchema.safeParse(check).success).toBe(false);
    expect(isCheckRunMessage({
      source: "lab-host", type: "check:run", generationId: "generation", requestId: "request", checks: [check],
    })).toBe(false);
  }
  expect(exercise.status).toBe("draft");
  expect(exercise.schemaVersion).toBe(2);
  expect(exercise.id).toBe("css.box-model-and-flow.sizing-constraints-and-overflow.debug-fixed-width-failure.001");
  expect(exercise.checks).toContainEqual(expect.objectContaining({
    id: "preferred-width-kept", type: "rule-style", path: "style.css", equals: "320px",
  }));
  expect(exercise.checks).toContainEqual(expect.objectContaining({ type: "layout-contained", axis: "x" }));
});

test("real draft starter fails and the unchanged reference solution passes captured iframe checks", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const initial = await runChecks(page, mounted, snapshot());
  expect(initial.passed).toBe(false);
  expect(findResult(initial, "preferred-width-kept").reason).toBe("matched");
  expect(findResult(initial, "avatar-fits-frame").reason).toBe("mismatch");
  const solved = await runChecks(page, mounted, snapshot(solutionCss));
  expect(solved.passed).toBe(true);
  expect(findResult(solved, "preferred-width-kept").actual).toBe("320px");
  expect(findResult(solved, "avatar-fits-frame")).toMatchObject({
    reason: "matched", diagnostic: { selector: ".avatar", property: null },
  });
  expect(findResult(solved, "avatar-fits-frame").expected).toContain("content x=");
  expect(findResult(solved, "avatar-fits-frame").actual).toContain("border x=");
  // A later preview edit must not replace the click-time snapshot supplied by the host.
  const capturedSolution = snapshot(solutionCss);
  expect((await runChecks(page, mounted, snapshot())).passed).toBe(false);
  expect((await runChecks(page, mounted, capturedSolution)).passed).toBe(true);
  expect((await runChecks(page, mounted, snapshot())).passed).toBe(false);
});

test("fixed pixel substitution and enlarging the fixture cannot certify the learning objective", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const hardCoded = await runChecks(page, mounted, snapshot(solutionCss.replace("320px", "154px")));
  expect(findResult(hardCoded, "preferred-width-kept").reason).toBe("mismatch");
  expect(hardCoded.passed).toBe(false);
  const wider = await runChecks(page, mounted, snapshot(solutionCss + ".frame { width: 500px; }"));
  expect(findResult(wider, "fixture-width-kept").reason).toBe("mismatch");
  expect(wider.passed).toBe(false);
  const differentBox = await runChecks(page, mounted, snapshot(solutionCss + ".frame { box-sizing: content-box; }"));
  expect(findResult(differentBox, "fixture-box-sizing-kept").reason).toBe("mismatch");
  expect(differentBox.passed).toBe(false);
});

test("actual edges, box sizing, zero dimensions and explicit hiding are not false positives", async ({ page }) => {
  const mounted = await mountRuntime(page);
  for (const css of [
    ".avatar { margin-left:20px; }", ".avatar { margin-left:-2px; }",
    ".avatar { box-sizing:content-box; }", ".avatar { display:none; }",
    ".avatar { width:0; padding:0; border:0; }",
    ".avatar { height:0; padding:0; border:0; aspect-ratio:auto; }",
    ".avatar { visibility:hidden; }", ".avatar { opacity:0; }",
    ".frame { opacity:0; }", ".frame { content-visibility:hidden; }",
    ".frame { width:26px; } .avatar { width:1px; padding:0; border:0; }",
  ]) {
    const response = await runChecks(page, mounted, snapshot(solutionCss + css));
    expect(findResult(response, "avatar-fits-frame").reason, css).toBe("mismatch");
    expect(response.passed, css).toBe(false);
  }
});

test("unique strict ancestors and learner-fragment selector boundaries are enforced", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const checks = [
    layout({ id: "missing", selector: ".absent" }),
    layout({ id: "missing-container", within: ".absent" }),
    layout({ id: "self", within: ".avatar" }),
    layout({ id: "reversed", selector: ".frame", within: ".avatar" }),
    layout({ id: "ambiguous", selector: ".avatar, .frame" }),
    layout({ id: "ambiguous-container", within: ".avatar, .frame" }),
    layout({ id: "invalid", selector: "[" }), layout({ id: "invalid-container", within: "[" }),
    layout({ id: "shell", within: "body" }), layout({ id: "root", within: "#learner-root" }),
    layout({ id: "slot", selector: 'style[data-workspace-path="style.css"]' }),
  ];
  const response = await runChecks(page, mounted, snapshot(solutionCss), checks);
  expect(response.results.map((item) => item.reason)).toEqual([
    "target-not-found", "target-not-found", "mismatch", "mismatch", "checker-error",
    "checker-error", "checker-error", "checker-error", "target-not-found", "target-not-found", "target-not-found",
  ]);
  const siblingHtml = '<div class="frame"></div><div class="avatar">A</div>';
  const siblings = snapshot(solutionCss, siblingHtml);
  const remounted = await mountRuntime(page, siblings);
  expect((await runChecks(page, remounted, siblings, [layout()])).results[0].reason).toBe("mismatch");
  expect(() => planCapturedCheckDispatch(mounted.generationId, exercise.runtime, mounted.identity, {
    requestId: "changed-html", snapshot: siblings, checks: [layout()],
  })).toThrow("different Browser document generation");
});

test("unsupported coordinate, scrolling, paint and moving scenes fail closed", async ({ page }) => {
  const mounted = await mountRuntime(page);
  for (const css of [
    ".avatar { transform:translateX(0); }", "body { zoom:2; }",
    ".frame { scale:1; }", ".avatar { translate:0px; }", ".avatar { rotate:0deg; }",
    ".frame { perspective:500px; }", ".avatar { writing-mode:vertical-rl; }",
    ".frame { overflow:auto; }", ".frame { overflow:hidden; }",
    ".avatar { position:fixed; }", ".avatar { position:sticky; }",
    ".frame { columns:2; }", ".frame { display:table; }",
    ".frame { content-visibility:auto; }", ".avatar { clip-path:inset(100%); }",
    ".avatar { filter:opacity(0); }",
    "@keyframes move { to { margin-left:2px; } } .avatar { animation:move 10s infinite paused; }",
  ]) {
    const response = await runChecks(page, mounted, snapshot(solutionCss + css), [layout()]);
    expect(response.results[0].reason, css).toBe("checker-error");
    expect(response.passed, css).toBe(false);
  }
});

test("fragmented inline boxes and explicitly hidden HTML are rejected without learner JS", async ({ page }) => {
  const fragmented = snapshot(".frame {width:80px} .avatar {padding:0;border:0;font:16px monospace;}",
    '<div class="frame"><span class="avatar">one two three four five six seven eight</span></div>');
  const mounted = await mountRuntime(page, fragmented);
  const response = await runChecks(page, mounted, fragmented, [layout()]);
  expect(response.results[0].reason).toBe("checker-error");
  expect(response.results[0].actual).toContain("多片段");
  const hidden = snapshot(solutionCss + ".avatar {display:block}",
    '<div class="frame"><div hidden class="avatar">A</div></div>');
  const hiddenRuntime = await mountRuntime(page, hidden);
  expect((await runChecks(page, hiddenRuntime, hidden, [layout()])).results[0].reason).toBe("mismatch");
});

test("fractional CSS pixels and either container box model use content edges rather than fixed widths", async ({ page }) => {
  const mounted = await mountRuntime(page);
  for (const [css, reason] of [
    [".avatar {margin-left:0.25px}", "matched"],
    [".avatar {margin-left:0.75px}", "mismatch"],
    [".avatar {margin-left:-0.25px}", "matched"],
    [".avatar {margin-left:-0.75px}", "mismatch"],
    [".frame {width:213.5px;padding-left:10.25px;padding-right:15.75px;}", "matched"],
    [".frame {box-sizing:content-box;width:180.5px;padding-left:10.25px;padding-right:15.75px;}", "matched"],
  ]) {
    const response = await runChecks(page, mounted, snapshot(solutionCss + css), [layout()]);
    expect(response.results[0].reason, css).toBe(reason);
  }
});

test("malformed layout packets and stale identities are ignored by the real iframe", async ({ page }) => {
  const mounted = await mountRuntime(page);
  const valid = createCheckRunMessage(mounted.generationId, "invalid", [layout()]);
  const ignored: unknown[] = invalidChecks().map((check, index) => ({
    ...valid, requestId: `invalid-${index}`, checks: [check],
  }));
  ignored.push(
    { ...valid, generationId: "stale" }, { ...valid, requestId: "" },
    { ...valid, source: "not-host" }, { ...valid, unknown: true },
  );
  const response = await runChecks(page, mounted, snapshot(solutionCss), exercise.checks, ignored);
  expect(response.passed).toBe(true);
});

test("viewport scrolling is outside the supported static contract", async ({ page }) => {
  const longDocument = snapshot(solutionCss + "body {width:2000px;height:2000px}");
  const mounted = await mountRuntime(page, longDocument);
  expect((await runChecks(page, mounted, longDocument, [layout()])).passed).toBe(true);
  const frame = page.frames().find((candidate) => candidate.parentFrame() === page.mainFrame());
  if (!frame) throw new Error("missing runtime frame");
  // Test-driver action, not a capability enabled in learner code.
  await frame.evaluate(() => window.scrollTo(10, 10));
  expect(await frame.evaluate(() => window.scrollX)).toBeGreaterThan(0);
  expect((await runChecks(page, mounted, longDocument, [layout()])).results[0].reason).toBe("checker-error");
});
