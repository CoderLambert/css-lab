import { expect, test } from "@playwright/test";

import { createBrowserDocument } from "../src/features/exercise/runtime/browser/lib/browser-document";
import {
  acceptsCheckResult,
  acceptsRuntimeReady,
  browserDocumentIdentityEquals,
  createBrowserDocumentIdentity,
  planCapturedCheckDispatch,
} from "../src/features/exercise/runtime/browser/lib/browser-host";
import {
  createCheckRunMessage,
  createCssUpdateMessage,
  isCheckResultMessage,
  isCheckRunMessage,
  isCssUpdateMessage,
  isRuntimeReadyMessage,
} from "../src/features/exercise/runtime/browser/lib/browser-messages";
import {
  createRandomNonce,
  deriveBrowserSnapshotModel,
  serializeLearnerHtml,
} from "../src/features/exercise/runtime/browser/lib/browser-security";
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
  expect(first.srcDoc).toContain("data-workspace-path=\"base.css\"");
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
    isCheckRunMessage({
      source: "lab-host",
      type: "check:run",
      generationId: "generation-a",
      requestId: "request-1",
      checks: [
        {
          id: "exists",
          type: "exists",
          selector: ".target",
          message: "exists",
          unexpected: true,
        },
      ],
    }),
  ).toBe(false);

  expect(
    isCheckRunMessage({
      source: "lab-host",
      type: "check:run",
      generationId: "generation-a",
      requestId: "",
      checks: [],
    }),
  ).toBe(false);
  expect(
    isCssUpdateMessage({
      source: "lab-host",
      type: "css:update",
      generationId: "generation-a",
      path: "../style.css",
      content: "body{}",
    }),
  ).toBe(false);
  expect(
    isCssUpdateMessage({
      source: "lab-host",
      type: "css:update",
      generationId: "generation-a",
      path: "index.html",
      content: "<main></main>",
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
        '<style data-workspace-path="style.css"></style>',
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


test("checker scope excludes runtime shell and reports invalid/missing selectors distinctly", async ({
  page,
}) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot('<div class="target"></div>'),
    generationId: "generation-scope",
    nonce: "10112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  const result = await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");

    const ready = new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "runtime:ready" &&
          event.data?.generationId === generationId
        ) {
          window.removeEventListener("message", onMessage);
          resolve();
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.srcdoc = srcDoc;
    await ready;

    const resultPromise = new Promise<unknown>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "check:result" &&
          event.data?.generationId === generationId &&
          event.data?.requestId === "scope-check"
        ) {
          window.removeEventListener("message", onMessage);
          resolve(event.data);
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "check:run",
        generationId,
        requestId: "scope-check",
        checks: [
          { id: "slot", type: "exists", selector: "style", message: "slot" },
          { id: "wrapper", type: "exists", selector: "#learner-root", message: "wrapper" },
          { id: "scope", type: "exists", selector: ":scope", message: "scope" },
          { id: "scope-count", type: "count", selector: ":scope", equals: 0, message: "scope count" },
          { id: "count", type: "count", selector: "div", equals: 1, message: "count" },
          { id: "invalid", type: "exists", selector: "[", message: "invalid" },
        ],
      },
      "*",
    );

    return resultPromise;
  }, { srcDoc: descriptor.srcDoc, generationId: descriptor.generationId });

  expect(isCheckResultMessage(result)).toBe(true);
  if (!isCheckResultMessage(result)) return;

  expect(result.results.find((item) => item.id === "slot")?.reason).toBe(
    "target-not-found",
  );
  expect(result.results.find((item) => item.id === "wrapper")?.reason).toBe(
    "target-not-found",
  );
  expect(result.results.find((item) => item.id === "scope")?.reason).toBe(
    "target-not-found",
  );
  expect(result.results.find((item) => item.id === "scope-count")).toMatchObject({
    passed: true,
    actual: 0,
  });
  expect(result.results.find((item) => item.id === "count")).toMatchObject({
    passed: true,
    actual: 1,
  });
  expect(result.results.find((item) => item.id === "invalid")?.reason).toBe(
    "checker-error",
  );
});

test("CSP blocks learner HTML and CSS HTTP(S) egress", async ({ page }) => {
  let egressRequests = 0;
  page.on("request", (request) => {
    if (request.url().startsWith("https://m6a-egress.invalid/")) {
      egressRequests += 1;
    }
  });

  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(
      '<img class="target" src="https://m6a-egress.invalid/image.png">',
    ),
    generationId: "generation-egress",
    nonce: "20112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");

    const ready = new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "runtime:ready" &&
          event.data?.generationId === generationId
        ) {
          window.removeEventListener("message", onMessage);
          resolve();
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.srcdoc = srcDoc;
    await ready;
    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "style.css",
        content:
          '@import url("https://m6a-egress.invalid/import.css"); .target { background-image: url("https://m6a-egress.invalid/bg.png"); }',
      },
      "*",
    );
  }, { srcDoc: descriptor.srcDoc, generationId: descriptor.generationId });

  await page.waitForTimeout(100);
  expect(egressRequests).toBe(0);
});


test("document identity ignores CSS content but changes for HTML or topology", () => {
  const first = createBrowserDocumentIdentity(runtime, snapshot("<div>A</div>", "a{}"), 1);
  const cssEdit = createBrowserDocumentIdentity(runtime, snapshot("<div>A</div>", "b{}"), 1);
  const htmlEdit = createBrowserDocumentIdentity(runtime, snapshot("<div>B</div>", "b{}"), 1);
  const topologyEdit = createBrowserDocumentIdentity(
    runtime,
    {
      files: [
        { path: "index.html", language: "html", content: "<div>A</div>" },
        { path: "style.css", language: "css", content: "a{}" },
      ],
    },
    1,
  );

  expect(browserDocumentIdentityEquals(first, cssEdit)).toBe(true);
  expect(browserDocumentIdentityEquals(first, htmlEdit)).toBe(false);
  expect(browserDocumentIdentityEquals(first, topologyEdit)).toBe(false);
});

test("captured check dispatch synchronizes every captured CSS file before check:run", () => {
  const captured = snapshot("<div>A</div>", ".target { color: red }");
  const identity = createBrowserDocumentIdentity(runtime, captured, 1);
  const messages = planCapturedCheckDispatch(
    "generation-a",
    runtime,
    identity,
    {
      requestId: "request-1",
      checks: [
        {
          id: "color",
          type: "style",
          selector: ".target",
          property: "color",
          equals: "rgb(255, 0, 0)",
          message: "red",
        },
      ],
      snapshot: captured,
    },
  );

  expect(messages.map((message) => message.type)).toEqual([
    "css:update",
    "css:update",
    "check:run",
  ]);
  expect(messages[0]).toMatchObject({
    generationId: "generation-a",
    path: "base.css",
  });
  expect(messages[1]).toMatchObject({
    generationId: "generation-a",
    path: "style.css",
    content: ".target { color: red }",
  });
});

test("captured check refuses a stale document identity", () => {
  const current = createBrowserDocumentIdentity(runtime, snapshot("<div>A</div>"), 1);

  expect(() =>
    planCapturedCheckDispatch(
      "generation-a",
      runtime,
      current,
      {
        requestId: "request-1",
        checks: [],
        snapshot: snapshot("<div>B</div>"),
      },
    ),
  ).toThrow(/different Browser document generation/);
});

test("ready and result acceptance reject stale generation and stale request ids", () => {
  expect(
    acceptsRuntimeReady(
      {
        source: "lab-runtime",
        type: "runtime:ready",
        generationId: "old",
      },
      "current",
    ),
  ).toBe(false);

  const result = {
    source: "lab-runtime",
    type: "check:result",
    generationId: "current",
    requestId: "request-1",
    passed: true,
    results: [],
  };

  expect(acceptsCheckResult(result, "current", "request-1")).toBe(true);
  expect(acceptsCheckResult(result, "old", "request-1")).toBe(false);
  expect(acceptsCheckResult(result, "current", "request-2")).toBe(false);
});


test("DOM policy neutralizes executable markup, navigation surfaces, and clobbering attempts", async ({
  page,
}) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(
      [
        '<div id="learner-root"></div>',
        '<style data-workspace-path="style.css"></style>',
        '<script>window.__scriptRan = true</script>',
        '<iframe srcdoc="<script>parent.__frameRan=true<\\/script>"></iframe>',
        '<object data="https://m6a-egress.invalid/object"></object>',
        '<embed src="https://m6a-egress.invalid/embed">',
        '<meta http-equiv="refresh" content="0;url=https://m6a-egress.invalid/refresh">',
        '<a class="javascript-link" href="javascript:window.__javascriptUrl=true">go</a>',
        '<button class="handler" onclick="window.__handlerRan=true">click</button>',
        '<div class="target">target</div>',
      ].join(""),
    ),
    generationId: "generation-policy",
    nonce: "30112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate((srcDoc) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");
    iframe.srcdoc = srcDoc;
  }, descriptor.srcDoc);

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();

  await expect(frame!.locator("script")).toHaveCount(1);
  await expect(frame!.locator("iframe, object, embed")).toHaveCount(0);
  await expect(frame!.locator('meta[http-equiv="refresh" i]')).toHaveCount(0);
  await expect(frame!.locator(".javascript-link")).not.toHaveAttribute(
    "href",
    /javascript:/i,
  );
  await expect(frame!.locator(".handler")).not.toHaveAttribute("onclick");

  await frame!.locator(".handler").click();
  expect(
    await frame!.evaluate(() => ({
      script: Boolean((window as Window & { __scriptRan?: boolean }).__scriptRan),
      handler: Boolean((window as Window & { __handlerRan?: boolean }).__handlerRan),
      javascriptUrl: Boolean(
        (window as Window & { __javascriptUrl?: boolean }).__javascriptUrl,
      ),
    })),
  ).toEqual({
    script: false,
    handler: false,
    javascriptUrl: false,
  });

  await page.evaluate((generationId) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    iframe?.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "style.css",
        content: ".target { color: rgb(7, 8, 9) }",
      },
      "*",
    );
  }, descriptor.generationId);

  await expect(frame!.locator(".target")).toHaveCSS("color", "rgb(7, 8, 9)");
  await expect(
    frame!.locator('style[data-workspace-path="style.css"]'),
  ).toHaveCount(2);
});

test("unknown CSS path is ignored and cannot create a runtime slot", async ({ page }) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(),
    generationId: "generation-unknown-css",
    nonce: "40112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate((srcDoc) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");
    iframe.srcdoc = srcDoc;
  }, descriptor.srcDoc);

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();

  await page.evaluate((generationId) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    iframe?.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "unknown.css",
        content: ".target { color: rgb(9, 9, 9) }",
      },
      "*",
    );
  }, descriptor.generationId);

  await expect(
    frame!.locator('style[data-workspace-path="unknown.css"]'),
  ).toHaveCount(0);
  await expect(frame!.locator(".target")).not.toHaveCSS("color", "rgb(9, 9, 9)");
});


test("production nonce uses at least 128 bits and learner HTML serialization cannot close the bridge script", () => {
  const first = createRandomNonce();
  const second = createRandomNonce();

  expect(first).toMatch(/^[a-f0-9]{32}$/);
  expect(second).toMatch(/^[a-f0-9]{32}$/);
  expect(second).not.toBe(first);

  const serialized = serializeLearnerHtml(
    '</script><script>window.__escaped = true</script>\u2028\u2029',
  );
  expect(serialized).not.toContain("</script>");
  expect(serialized).toContain("\\u003c/script>");
  expect(serialized).toContain("\\u2028");
  expect(serialized).toContain("\\u2029");
});


test("CSS slots preserve declaration order and style checker accepts semantic alternatives", async ({
  page,
}) => {
  const orderedSnapshot: ExecutionSnapshot = {
    files: [
      {
        path: "index.html",
        language: "html",
        content: '<div class="target">Target</div>',
      },
      {
        path: "first.css",
        language: "css",
        content: "",
      },
      {
        path: "second.css",
        language: "css",
        content: "",
      },
    ],
  };
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: orderedSnapshot,
    generationId: "generation-order",
    nonce: "50112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  const result = await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");

    const ready = new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "runtime:ready" &&
          event.data?.generationId === generationId
        ) {
          window.removeEventListener("message", onMessage);
          resolve();
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.srcdoc = srcDoc;
    await ready;

    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "first.css",
        content: ".target { display: flex; color: rgb(1, 2, 3); }",
      },
      "*",
    );
    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "second.css",
        content: ".target { color: rgb(4, 5, 6); align-items: end; }",
      },
      "*",
    );

    const resultPromise = new Promise<unknown>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "check:result" &&
          event.data?.generationId === generationId &&
          event.data?.requestId === "order-check"
        ) {
          window.removeEventListener("message", onMessage);
          resolve(event.data);
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "check:run",
        generationId,
        requestId: "order-check",
        checks: [
          {
            id: "cascade-order",
            type: "style",
            selector: ".target",
            property: "color",
            equals: "rgb(4, 5, 6)",
            message: "later CSS slot wins",
          },
          {
            id: "semantic-alternative",
            type: "style",
            selector: ".target",
            property: "align-items",
            equals: "flex-end",
            alsoAccepts: ["end"],
            message: "semantic alternative remains accepted",
          },
        ],
      },
      "*",
    );

    return resultPromise;
  }, { srcDoc: descriptor.srcDoc, generationId: descriptor.generationId });

  expect(isCheckResultMessage(result)).toBe(true);
  if (!isCheckResultMessage(result)) return;

  expect(result.passed).toBe(true);
  expect(result.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: "cascade-order",
        passed: true,
        actual: "rgb(4, 5, 6)",
      }),
      expect.objectContaining({
        id: "semantic-alternative",
        passed: true,
      }),
    ]),
  );
});

test("runtime shell selectors never count as learner matches", async ({ page }) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot('<section class="target"></section>'),
    generationId: "generation-shell",
    nonce: "60112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  const result = await page.evaluate(async ({ srcDoc, generationId }) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");

    const ready = new Promise<void>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "runtime:ready" &&
          event.data?.generationId === generationId
        ) {
          window.removeEventListener("message", onMessage);
          resolve();
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.srcdoc = srcDoc;
    await ready;

    const resultPromise = new Promise<unknown>((resolve) => {
      const onMessage = (event: MessageEvent) => {
        if (
          event.source === iframe.contentWindow &&
          event.data?.source === "lab-runtime" &&
          event.data?.type === "check:result" &&
          event.data?.generationId === generationId &&
          event.data?.requestId === "shell-check"
        ) {
          window.removeEventListener("message", onMessage);
          resolve(event.data);
        }
      };
      window.addEventListener("message", onMessage);
    });

    iframe.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "check:run",
        generationId,
        requestId: "shell-check",
        checks: [
          { id: "html", type: "exists", selector: "html", message: "html" },
          { id: "head", type: "exists", selector: "head", message: "head" },
          { id: "body", type: "exists", selector: "body", message: "body" },
          {
            id: "runtime-slot",
            type: "exists",
            selector: "[data-workspace-path]",
            message: "runtime slot",
          },
        ],
      },
      "*",
    );

    return resultPromise;
  }, { srcDoc: descriptor.srcDoc, generationId: descriptor.generationId });

  expect(isCheckResultMessage(result)).toBe(true);
  if (!isCheckResultMessage(result)) return;

  for (const item of result.results) {
    expect(item).toMatchObject({
      passed: false,
      reason: "target-not-found",
    });
  }
});


test("link, area and form guards prevent learner navigation", async ({
  page,
}) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(
      [
        '<a class="nav-link" href="https://m6a-egress.invalid/link">link</a>',
        '<map name="nav-map"><area class="nav-area" href="https://m6a-egress.invalid/area"></map>',
        '<form class="nav-form" action="https://m6a-egress.invalid/form"><button>submit</button></form>',
      ].join(""),
    ),
    generationId: "generation-navigation",
    nonce: "70112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate((srcDoc) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");
    iframe.srcdoc = srcDoc;
  }, descriptor.srcDoc);

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();

  const beforeUrl = frame!.url();
  await frame!.locator(".nav-link").click();
  expect(frame!.url()).toBe(beforeUrl);

  const prevented = await frame!.evaluate(() => {
    const area = document.querySelector(".nav-area");
    const form = document.querySelector(".nav-form");
    if (!(area instanceof Element) || !(form instanceof HTMLFormElement)) {
      throw new Error("missing navigation fixtures");
    }

    const auxClick = new MouseEvent("auxclick", {
      bubbles: true,
      cancelable: true,
      button: 1,
    });
    const submit = new Event("submit", {
      bubbles: true,
      cancelable: true,
    });

    return {
      area: !area.dispatchEvent(auxClick),
      form: !form.dispatchEvent(submit),
    };
  });

  expect(prevented).toEqual({ area: true, form: true });
});

test("runtime ignores forged source and malformed host messages", async ({
  page,
}) => {
  const descriptor = createBrowserDocument({
    runtime,
    snapshot: snapshot(),
    generationId: "generation-forged",
    nonce: "80112233445566778899aabbccddeeff",
  });

  await page.setContent('<iframe id="runtime" sandbox="allow-scripts"></iframe>');
  await page.evaluate((srcDoc) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!iframe) throw new Error("missing iframe");
    iframe.srcdoc = srcDoc;
  }, descriptor.srcDoc);

  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  expect(frame).toBeTruthy();

  await page.evaluate((generationId) => {
    const iframe = document.querySelector<HTMLIFrameElement>("#runtime");
    iframe?.contentWindow?.postMessage(
      {
        source: "forged-host",
        type: "css:update",
        generationId,
        path: "style.css",
        content: ".target { color: rgb(11, 12, 13) }",
      },
      "*",
    );
    iframe?.contentWindow?.postMessage(
      {
        source: "lab-host",
        type: "css:update",
        generationId,
        path: "style.css",
        content: ".target { color: rgb(21, 22, 23) }",
        unexpected: true,
      },
      "*",
    );
  }, descriptor.generationId);

  await expect(frame!.locator(".target")).not.toHaveCSS(
    "color",
    "rgb(11, 12, 13)",
  );
  await expect(frame!.locator(".target")).not.toHaveCSS(
    "color",
    "rgb(21, 22, 23)",
  );
});
