import { expect, test } from "@playwright/test";

import { createBrowserDocument } from "../src/features/exercise/runtime/browser/lib/browser-document";
import {
  createCheckRunMessage,
  createCssUpdateMessage,
  isCheckResultMessage,
  isRuntimeReadyMessage,
} from "../src/features/exercise/runtime/browser/lib/browser-messages";
import { deriveBrowserSnapshotModel } from "../src/features/exercise/runtime/browser/lib/browser-security";
import type { BrowserRuntimeDefinition } from "../src/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "../src/lib/workspace/types";

const runtime: BrowserRuntimeDefinition = {
  type: "browser",
  entry: "index.html",
};

function snapshot(
  html = '<div class="target">Target</div>',
  css = ".target { color: rgb(1, 2, 3); }",
): ExecutionSnapshot {
  return {
    files: [
      { path: "index.html", language: "html", content: html },
      { path: "base.css", language: "css", content: "" },
      { path: "style.css", language: "css", content: css },
    ],
  };
}

test("Browser Runtime topology accepts one HTML plus CSS and rejects extra HTML or JS", () => {
  expect(deriveBrowserSnapshotModel(runtime, snapshot()).cssTopology).toEqual([
    "base.css",
    "style.css",
  ]);

  expect(() =>
    deriveBrowserSnapshotModel(runtime, {
      files: [
        ...snapshot().files,
        { path: "other.html", language: "html", content: "" },
      ],
    }),
  ).toThrow(/exactly one HTML/);

  expect(() =>
    deriveBrowserSnapshotModel(runtime, {
      files: [
        ...snapshot().files,
        { path: "main.js", language: "javascript", content: "alert(1)" },
      ],
    }),
  ).toThrow(/HTML and CSS only/);
});

test("srcDoc identity excludes CSS content and safely embeds learner HTML", () => {
  const first = createBrowserDocument({
    runtime,
    snapshot: snapshot("<div>one</div>", ".target { color: red }"),
    generationId: "generation-a",
    nonce: "00112233445566778899aabbccddeeff",
  });
  const cssOnly = createBrowserDocument({
    runtime,
    snapshot: snapshot("<div>one</div>", ".target { color: blue }"),
    generationId: "generation-a",
    nonce: "00112233445566778899aabbccddeeff",
  });

  expect(cssOnly.srcDoc).toBe(first.srcDoc);
  expect(first.srcDoc).not.toContain(".target { color: red }");
  expect(first.srcDoc).toContain("data-runtime-workspace-path=\"base.css\"");
  expect(first.srcDoc).toContain("connect-src 'none'");
  expect(first.srcDoc).not.toContain("<div>one</div>");
});

test("typed protocol requires source, type and generation id", () => {
  const css = createCssUpdateMessage("generation-a", "style.css", "body{}");
  expect(css.generationId).toBe("generation-a");

  const run = createCheckRunMessage("generation-a", "request-1", []);
  expect(run.generationId).toBe("generation-a");

  expect(
    isRuntimeReadyMessage({
      source: "lab-runtime",
      type: "runtime:ready",
      generationId: "generation-a",
    }),
  ).toBe(true);
  expect(
    isRuntimeReadyMessage({
      source: "lab-runtime",
      type: "runtime:ready",
    }),
  ).toBe(false);
  expect(
    isCheckResultMessage({
      source: "lab-runtime",
      type: "check:result",
      generationId: "generation-a",
      requestId: "request-1",
      passed: true,
      results: [],
    }),
  ).toBe(true);
});

test("isolated runtime strips executable HTML, scopes checker, and ignores wrong generation", async ({
  page,
}) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(
      [
        '<div id="learner-root"></div>',
        '<style data-runtime-workspace-path="style.css"></style>',
        '<script>window.__learnerScript = true</script>',
        '<button class="target" onclick="window.__clicked = true">Target</button>',
      ].join(""),
    ),
    generationId: "generation-a",
    nonce: "00112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate((srcDoc) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");
    iframe.srcdoc = srcDoc;
  }, descriptor.srcDoc);

  await page.waitForFunction(() => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    return Boolean(iframe?.contentWindow);
  });

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();
  await expect(frame!.locator(".target")).toHaveCount(1);
  expect(await frame!.evaluate(() => Boolean((window as Window & { __learnerScript?: boolean }).__learnerScript))).toBe(false);

  await page.evaluate(() => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    iframe?.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId: "wrong-generation",
        path: "style.css",
        content: ".target { color: rgb(9, 9, 9) }",
      },
      "*",
    );
  });

  await expect(frame!.locator(".target")).not.toHaveCSS("color", "rgb(9, 9, 9)");
});
