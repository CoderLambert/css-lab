import { expect, test, type Page } from "@playwright/test";

import { createBrowserDocument } from "../src/features/exercise/runtime/browser/lib/browser-document";
import {
  createCheckRunMessage,
  createCssUpdateMessage,
  isCheckResultMessage,
  isCheckRunMessage,
} from "../src/features/exercise/runtime/browser/lib/browser-messages";
import {
  CheckSchema,
  ExerciseRecordSchema,
  type Check,
  type RuleStyleCheck,
} from "../src/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "../src/lib/workspace/types";

const generationId = "rule-style-generation";
let requestSequence = 0;

function rule(overrides: Partial<RuleStyleCheck> = {}): RuleStyleCheck {
  return {
    id: "source",
    type: "rule-style",
    path: "style.css",
    selector: ".target",
    property: "width",
    equals: "2rem",
    message: "请在 style.css 中使用要求的规则和值",
    ...overrides,
  };
}

function invalidChecks(): unknown[] {
  return [
    { ...rule(), unexpected: true },
    { ...rule(), viewportWidth: 390 },
    { ...rule(), path: undefined },
    { ...rule(), path: "../style.css" },
    { ...rule(), path: "/style.css" },
    { ...rule(), path: "styles//style.css" },
    { ...rule(), path: "styles/../style.css" },
    { ...rule(), path: "index.html" },
    { ...rule(), path: "style.CSS" },
    { ...rule(), path: "" },
    { ...rule(), selector: " " },
    { ...rule(), property: " " },
    { ...rule(), equals: " " },
    { ...rule(), equals: 2 },
    { ...rule(), alsoAccepts: [null] },
    { ...rule(), alsoAccepts: "2rem" },
    { ...rule(), media: " " },
    { ...rule(), media: 390 },
    { ...rule(), priority: "!important" },
    { ...rule(), priority: null },
    { ...rule(), afterSelector: " " },
    { ...rule(), afterSelector: [] },
    { id: "style", message: "style", type: "style", selector: ".target", property: "width", equals: "32px", path: "style.css" },
  ];
}

async function sendChecks(
  page: Page,
  checks: readonly Check[],
  updates: Record<string, string> = {},
  ignoredMessages: unknown[] = [],
) {
  const requestId = `rule-style-${++requestSequence}`;
  const messages = [
    ...ignoredMessages,
    ...Object.entries(updates).map(([path, content]) =>
      createCssUpdateMessage(generationId, path, content),
    ),
    createCheckRunMessage(generationId, requestId, checks),
  ];
  const responses = await page.evaluate(async ({ messages, generationId, requestId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe?.contentWindow) throw new Error("missing runtime frame");
    return new Promise<unknown[]>((resolve, reject) => {
      const received: unknown[] = [];
      const onMessage = (event: MessageEvent) => {
        if (event.source !== iframe.contentWindow ||
            event.data?.source !== "lab-runtime" ||
            event.data?.type !== "check:result" ||
            event.data?.generationId !== generationId) return;
        received.push(event.data);
        if (event.data.requestId === requestId) {
          window.clearTimeout(timeout);
          window.removeEventListener("message", onMessage);
          resolve(received);
        }
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", onMessage);
        reject(new Error("rule-style check timed out"));
      }, 5000);
      window.addEventListener("message", onMessage);
      for (const message of messages) iframe.contentWindow!.postMessage(message, "*");
    });
  }, { messages, generationId, requestId });

  // The final valid packet is a FIFO barrier: malformed packets must emit no result.
  expect(responses).toHaveLength(1);
  const response = responses[0];
  expect(isCheckResultMessage(response)).toBe(true);
  if (!isCheckResultMessage(response)) throw new Error("invalid result protocol");
  expect(response.requestId).toBe(requestId);
  expect(response.generationId).toBe(generationId);
  return response;
}

async function mountRuntime(
  page: Page,
  css: string,
  options: { html?: string; baseCss?: string; otherCss?: string } = {},
) {
  const snapshot: ExecutionSnapshot = {
    files: [
      { path: "index.html", language: "html", content: options.html ?? '<div class="target">Target</div>' },
      { path: "base.css", language: "css", content: options.baseCss ?? "html { font-size: 16px; }" },
      { path: "style.css", language: "css", content: css },
      { path: "other.css", language: "css", content: options.otherCss ?? "" },
    ],
  };
  const descriptor = createBrowserDocument({
    runtime: { type: "browser", entry: "index.html" },
    snapshot,
    generationId,
    nonce: "00112233445566778899aabbccddeeff",
  });
  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing runtime frame");
    await new Promise<void>((resolve, reject) => {
      const onMessage = (event: MessageEvent) => {
        if (event.source === iframe.contentWindow &&
            event.data?.source === "lab-runtime" &&
            event.data?.type === "runtime:ready" &&
            event.data?.generationId === generationId) {
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
  await sendChecks(page, [], Object.fromEntries(
    snapshot.files.filter((file) => file.language === "css").map((file) => [file.path, file.content]),
  ));
}

test("rule-style schema and host guard accept the same strict contract", () => {
  expect(CheckSchema.options.map((schema) => schema.shape.type.value)).toEqual([
    "style", "rule-style", "layout-contained", "exists", "count",
  ]);
  const valid = [
    rule(),
    rule({ path: "styles/source.css", alsoAccepts: ["32px"], media: "(min-width: 768px)", priority: "normal", afterSelector: ".earlier" }),
    rule({ priority: "important" }),
  ];
  for (const check of [...valid, ...invalidChecks()]) {
    const expected = valid.includes(check as RuleStyleCheck);
    expect(CheckSchema.safeParse(check).success).toBe(expected);
    expect(isCheckRunMessage({
      source: "lab-host", type: "check:run", generationId, requestId: "contract", checks: [check],
    })).toBe(expected);
  }
});

test("Exercise v2 rejects locked, missing and non-CSS rule-style sources", () => {
  const exercise = {
    schemaVersion: 2, id: "test.rule-style.001", slug: "rule-style", order: 1,
    status: "draft", revision: 1, title: "Source checks", prompt: "Write a rule", hints: [],
    workspace: { files: [
      { path: "index.html", language: "html", editable: false },
      { path: "base.css", language: "css", editable: false },
      { path: "style.css", language: "css", editable: true },
    ] },
    runtime: { type: "browser", entry: "index.html" }, checks: [rule()],
  };
  expect(ExerciseRecordSchema.safeParse(exercise).success).toBe(true);
  for (const path of ["base.css", "missing.css", "index.html"]) {
    const parsed = ExerciseRecordSchema.safeParse({ ...exercise, checks: [rule({ path })] });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((issue) => issue.path.join(".") === "checks.0.path")).toBe(true);
    }
  }
});

test("authored source checks preserve diagnostics and existing computed/structural checks", async ({ page }) => {
  await mountRuntime(page, ".target { width: 1rem; } .target { width: 2rem; } .target:hover { width: 4rem; }");
  const response = await sendChecks(page, [
    rule(),
    rule({ id: "old", equals: "1rem" }),
    rule({ id: "alias", equals: "3rem", alsoAccepts: ["2rem"] }),
    rule({ id: "hover", selector: ".target:hover", equals: "4rem" }),
    rule({ id: "missing", selector: ".missing" }),
    rule({ id: "property", property: "padding-left" }),
    rule({ id: "invalid", selector: "[" }),
    rule({ id: "invalid-reference", afterSelector: "[" }),
    { id: "computed", type: "style", selector: ".target", property: "width", equals: "32px", message: "computed" },
    { id: "exists", type: "exists", selector: ".target", message: "exists" },
    { id: "count", type: "count", selector: ".target", equals: 1, message: "count" },
  ]);
  expect(response.results.map((item) => item.reason)).toEqual([
    "matched", "mismatch", "matched", "matched", "target-not-found", "mismatch",
    "checker-error", "checker-error", "matched", "matched", "matched",
  ]);
  expect(response.results[0]).toMatchObject({ actual: "2rem", diagnostic: { selector: ".target", property: "width" } });
});

test("rule-style reads only the selected slot and sees CSS-only updates without stale rules", async ({ page }) => {
  await mountRuntime(page, "", {
    html: '<div class="target" style="width:2rem"></div><style data-workspace-path="style.css">.target { width: 2rem; }</style>',
    baseCss: ".target { width: 2rem; }",
    otherCss: ".target { width: 2rem; }",
  });
  const missing = await sendChecks(page, [rule(), rule({ id: "unknown-file", path: "missing.css" })]);
  expect(missing.results.map((item) => item.reason)).toEqual(["target-not-found", "target-not-found"]);
  const wrong = await sendChecks(page, [rule()], { "style.css": ".target { width: 3rem; }" });
  expect(wrong.results[0]).toMatchObject({ reason: "mismatch", actual: "3rem" });
  const correct = await sendChecks(page, [rule()], { "style.css": ".target { width: 2rem; }" });
  expect(correct.results[0].reason).toBe("matched");
});

test("media, priority and afterSelector inspect source facts, not active layout", async ({ page }) => {
  await mountRuntime(page, `
    .earlier { color: red; }
    .target { width: 2rem !important; }
    .target { height: 3rem; }
    .later { color: blue; }
    @media (min-width: 5000px) {
      .earlier { color: red; }
      .target { width: 5rem; }
      .media-only { width: 2rem; }
    }
    @supports (display: grid) { .supports-only { width: 2rem; } }
    @media (min-width: 1px) { @media (min-width: 5000px) { .nested { width: 2rem; } } }
  `);
  const response = await sendChecks(page, [
    rule({ id: "priority", priority: "important" }),
    rule({ id: "normal", priority: "normal" }),
    rule({ id: "after", afterSelector: ".earlier" }),
    rule({ id: "before", afterSelector: ".later" }),
    rule({ id: "missing-reference", afterSelector: ".absent" }),
    rule({ id: "media", media: "(min-width: 5000px)", equals: "5rem", priority: "normal", afterSelector: ".earlier" }),
    rule({ id: "wrong-media", media: "(min-width: 4999px)", equals: "5rem" }),
    rule({ id: "not-top-level", selector: ".media-only" }),
    rule({ id: "supports", selector: ".supports-only" }),
    rule({ id: "nested", selector: ".nested", media: "(min-width: 5000px)" }),
  ]);
  expect(response.results.map((item) => item.reason)).toEqual([
    "matched", "mismatch", "matched", "mismatch", "mismatch", "matched",
    "target-not-found", "target-not-found", "target-not-found", "target-not-found",
  ]);
  expect(response.results[1].actual).toContain("priority: important");
  expect(response.results[3].actual).toContain("after: false");
  const reversed = await sendChecks(page, [rule({ afterSelector: ".earlier" })], {
    "style.css": ".earlier {} .target {width:2rem} .earlier {color:red}",
  });
  expect(reversed.results[0].reason).toBe("mismatch");
});

test("source syntax retains authored units/functions and does not claim cascade victory", async ({ page }) => {
  await mountRuntime(page, `
    .target { width: 1rem !important; }
    .target { width: 2rem; }
    .units { padding-left: 2em; height: 50%; width: calc(100% - 2rem); }
    .tokens { --gap: 2rem; gap: var(--gap); grid-template-columns: 1fr 2fr; }
  `);
  const response = await sendChecks(page, [
    rule({ priority: "normal" }),
    { id: "cascade", type: "style", selector: ".target", property: "width", equals: "16px", message: "cascade" },
    rule({ id: "em", selector: ".units", property: "padding-left", equals: "2em" }),
    rule({ id: "percent", selector: ".units", property: "height", equals: "50%" }),
    rule({ id: "calc", selector: ".units", equals: "calc(100% - 2rem)" }),
    rule({ id: "var", selector: ".tokens", property: "gap", equals: "var(--gap)" }),
    rule({ id: "fr", selector: ".tokens", property: "grid-template-columns", equals: "1fr 2fr" }),
  ]);
  expect(response.passed).toBe(true);
});

test("sandbox ignores malformed rule-style packets and wrong message identities", async ({ page }) => {
  await mountRuntime(page, ".target { width: 2rem; }");
  const valid = createCheckRunMessage(generationId, "ignored", [rule()]);
  const ignored: unknown[] = invalidChecks().map((check, index) => ({
    ...valid, requestId: `invalid-${index}`, checks: [check],
  }));
  ignored.push(
    { ...valid, generationId: "stale" },
    { ...valid, source: "not-the-host" },
    { ...valid, unexpected: true },
  );
  const response = await sendChecks(page, [rule()], {}, ignored);
  expect(response.passed).toBe(true);
});
