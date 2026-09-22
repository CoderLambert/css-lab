import type { BrowserRuntimeDefinition } from "@/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "@/lib/workspace/types";
import type { BrowserDocumentIdentity } from "./browser-host";
import {
  createGenerationId,
  createRandomNonce,
  deriveBrowserSnapshotModel,
  serializeLearnerHtml,
} from "./browser-security";

export const BROWSER_RUNTIME_BRIDGE_VERSION = 1;

export interface BrowserDocumentDescriptor {
  generationId: string;
  nonce: string;
  srcDoc: string;
  entryHtml: string;
  cssTopology: readonly string[];
}

interface BrowserDocumentOptions {
  runtime: BrowserRuntimeDefinition;
  snapshot: ExecutionSnapshot;
  generationId?: string;
  nonce?: string;
}

function escapeHtmlAttribute(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function createRuntimeBridge(
  generationId: string,
  learnerHtml: string,
  cssPaths: readonly string[],
): string {
  const generationLiteral = JSON.stringify(generationId);
  const learnerHtmlLiteral = serializeLearnerHtml(learnerHtml);
  const cssPathsLiteral = JSON.stringify(cssPaths).replaceAll("<", "\\u003c");

  return `(() => {
  "use strict";

  const generationId = ${generationLiteral};
  const learnerHtml = ${learnerHtmlLiteral};
  const cssPaths = ${cssPathsLiteral};
  const hostSource = "lab-host";
  const runtimeSource = "lab-runtime";
  const learnerRoot = document.getElementById("learner-root");
  const cssSlots = new Map();

  if (!learnerRoot) {
    return;
  }

  for (const path of cssPaths) {
    const slot = document.querySelector(
      'style[data-workspace-path="' + CSS.escape(path) + '"]',
    );
    if (!(slot instanceof HTMLStyleElement)) {
      return;
    }
    cssSlots.set(path, slot);
  }

  const isRecord = (value) =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const hasOnlyKeys = (value, keys) => {
    const allowed = new Set(keys);
    return Object.keys(value).every((key) => allowed.has(key));
  };

  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  const isCheck = (value) => {
    if (
      !isRecord(value) ||
      !isNonEmptyString(value.id) ||
      !isNonEmptyString(value.message) ||
      !isNonEmptyString(value.selector)
    ) {
      return false;
    }

    if (value.type === "exists") {
      return hasOnlyKeys(value, ["id", "message", "type", "selector"]);
    }

    if (value.type === "count") {
      return (
        hasOnlyKeys(value, ["id", "message", "type", "selector", "equals"]) &&
        Number.isInteger(value.equals) &&
        value.equals >= 0
      );
    }

    if (value.type === "style") {
      return (
        hasOnlyKeys(value, [
          "id",
          "message",
          "type",
          "selector",
          "property",
          "equals",
          "alsoAccepts",
        ]) &&
        isNonEmptyString(value.property) &&
        isNonEmptyString(value.equals) &&
        (value.alsoAccepts === undefined ||
          (Array.isArray(value.alsoAccepts) &&
            value.alsoAccepts.every(isNonEmptyString)))
      );
    }

    return false;
  };

  const normalizeScheme = (value) =>
    value.replace(/[\\u0000-\\u0020\\u007f]+/g, "").toLowerCase();

  const template = document.createElement("template");
  template.innerHTML = learnerHtml;

  for (const element of template.content.querySelectorAll(
    "script,iframe,object,embed,base",
  )) {
    element.remove();
  }

  for (const meta of template.content.querySelectorAll("meta")) {
    if (
      (meta.getAttribute("http-equiv") || "").trim().toLowerCase() === "refresh"
    ) {
      meta.remove();
    }
  }

  for (const element of template.content.querySelectorAll("*")) {
    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith("on")) {
        element.removeAttribute(attribute.name);
        continue;
      }
      if (
        name === "href" ||
        name === "src" ||
        name === "xlink:href" ||
        name === "formaction"
      ) {
        if (normalizeScheme(attribute.value).startsWith("javascript:")) {
          element.removeAttribute(attribute.name);
        }
      }
    }
  }

  learnerRoot.replaceChildren(template.content);

  const preventLinkNavigation = (event) => {
    const target = event.target;

    if (
      target instanceof Element &&
      target.closest("a[href],area[href]")
    ) {
      event.preventDefault();
    }
  };

  learnerRoot.addEventListener("click", preventLinkNavigation, true);
  learnerRoot.addEventListener("auxclick", preventLinkNavigation, true);
  learnerRoot.addEventListener(
    "submit",
    (event) => event.preventDefault(),
    true,
  );

  const result = (check, passed, reason, expected, actual, property = null) => ({
    id: check.id,
    message: check.message,
    passed,
    reason,
    expected,
    actual,
    diagnostic: {
      selector: typeof check.selector === "string" ? check.selector : null,
      property,
    },
  });

  const queryOne = (selector) => {
    try {
      const element = learnerRoot.querySelector(selector);
      return {
        element: element === learnerRoot ? null : element,
        error: null,
      };
    } catch {
      return { element: null, error: "checker-error" };
    }
  };

  const countMatches = (selector) => {
    const matches = learnerRoot.querySelectorAll(selector);
    let count = 0;

    for (const element of matches) {
      if (element !== learnerRoot) {
        count += 1;
      }
    }

    return count;
  };

  const runCheck = (check) => {
    if (!isRecord(check) || typeof check.id !== "string" || typeof check.message !== "string") {
      return {
        id: typeof check?.id === "string" ? check.id : "invalid-check",
        message: typeof check?.message === "string" ? check.message : "Invalid checker rule",
        passed: false,
        reason: "checker-error",
        expected: null,
        actual: null,
        diagnostic: null,
      };
    }

    if (check.type === "count" && typeof check.selector === "string" && Number.isInteger(check.equals)) {
      try {
        const actual = countMatches(check.selector);
        return result(check, actual === check.equals, actual === check.equals ? "matched" : "mismatch", check.equals, actual);
      } catch {
        return result(check, false, "checker-error", check.equals, null);
      }
    }

    if (
      (check.type === "exists" || check.type === "style") &&
      typeof check.selector === "string"
    ) {
      const property =
        check.type === "style" && typeof check.property === "string"
          ? check.property
          : null;
      const expected =
        check.type === "exists" ? true : check.equals ?? null;
      const queried = queryOne(check.selector);

      if (queried.error) {
        return result(
          check,
          false,
          "checker-error",
          expected,
          null,
          property,
        );
      }
      if (!queried.element) {
        return result(
          check,
          false,
          "target-not-found",
          expected,
          null,
          property,
        );
      }

      if (check.type === "exists") {
        return result(check, true, "matched", true, true);
      }

      if (
        typeof check.property !== "string" ||
        typeof check.equals !== "string"
      ) {
        return result(check, false, "checker-error", null, null);
      }

      try {
        const actual = getComputedStyle(queried.element).getPropertyValue(check.property).trim();
        const accepted = [
          check.equals,
          ...(Array.isArray(check.alsoAccepts)
            ? check.alsoAccepts.filter((value) => typeof value === "string")
            : []),
        ];
        const passed = accepted.includes(actual);
        return result(
          check,
          passed,
          passed ? "matched" : "mismatch",
          accepted.join(" / "),
          actual,
          check.property,
        );
      } catch {
        return result(check, false, "checker-error", check.equals, null, check.property);
      }
    }

    return {
      id: check.id,
      message: check.message,
      passed: false,
      reason: "checker-error",
      expected: null,
      actual: null,
      diagnostic: null,
    };
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || !isRecord(event.data)) {
      return;
    }

    const message = event.data;
    if (
      message.source !== hostSource ||
      message.generationId !== generationId
    ) {
      return;
    }

    if (
      message.type === "css:update" &&
      hasOnlyKeys(message, [
        "source",
        "type",
        "generationId",
        "path",
        "content",
      ]) &&
      typeof message.path === "string" &&
      typeof message.content === "string"
    ) {
      const slot = cssSlots.get(message.path);
      if (slot) {
        slot.textContent = message.content;
      }
      return;
    }

    if (
      message.type !== "check:run" ||
      !hasOnlyKeys(message, [
        "source",
        "type",
        "generationId",
        "requestId",
        "checks",
      ]) ||
      !isNonEmptyString(message.requestId) ||
      !Array.isArray(message.checks) ||
      !message.checks.every(isCheck)
    ) {
      return;
    }

    const results = message.checks.map(runCheck);
    window.parent.postMessage(
      {
        source: runtimeSource,
        type: "check:result",
        generationId,
        requestId: message.requestId,
        passed: results.every((item) => item.passed),
        results,
      },
      "*",
    );
  });

  window.setTimeout(() => {
    window.parent.postMessage(
      {
        source: runtimeSource,
        type: "runtime:ready",
        generationId,
      },
      "*",
    );
  }, 0);
})();`;
}

export function createBrowserDocumentFromIdentity(
  identity: BrowserDocumentIdentity,
  options: { generationId?: string; nonce?: string } = {},
): BrowserDocumentDescriptor {
  if (identity.bridgeVersion !== BROWSER_RUNTIME_BRIDGE_VERSION) {
    throw new Error("Browser document identity bridge version is stale");
  }

  const generationId = options.generationId ?? createGenerationId();
  const nonce = options.nonce ?? createRandomNonce();
  const bridge = createRuntimeBridge(
    generationId,
    identity.entryHtml,
    identity.cssTopology,
  );
  const cssSlots = identity.cssTopology
    .map(
      (path) =>
        `<style data-workspace-path="${escapeHtmlAttribute(path)}"></style>`,
    )
    .join("\n    ");
  const csp = [
    "default-src 'none'",
    `script-src 'nonce-${nonce}'`,
    "style-src 'unsafe-inline'",
    "img-src data:",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "connect-src 'none'",
  ].join("; ");

  const srcDoc = `<!doctype html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Security-Policy" content="${escapeHtmlAttribute(csp)}">
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${cssSlots}
  </head>
  <body>
    <div id="learner-root"></div>
    <script nonce="${escapeHtmlAttribute(nonce)}">${bridge}</script>
  </body>
</html>`;

  return {
    generationId,
    nonce,
    srcDoc,
    entryHtml: identity.entryHtml,
    cssTopology: identity.cssTopology,
  };
}

export function createBrowserDocument(
  options: BrowserDocumentOptions,
): BrowserDocumentDescriptor {
  const model = deriveBrowserSnapshotModel(options.runtime, options.snapshot);

  return createBrowserDocumentFromIdentity(
    {
      runtimeEntry: options.runtime.entry,
      entryHtml: model.entryHtml,
      cssTopology: model.cssTopology,
      bridgeVersion: BROWSER_RUNTIME_BRIDGE_VERSION,
    },
    {
      generationId: options.generationId,
      nonce: options.nonce,
    },
  );
}
