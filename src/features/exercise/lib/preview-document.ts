import {
  PREVIEW_MESSAGE_SOURCE,
  PREVIEW_MESSAGE_TYPE,
} from "./preview-messages";

interface PreviewDocumentInput {
  html: string;
  baseCss: string;
}

interface PreviewBridgeInput {
  html: string;
  baseCss: string;
}

function escapeStyleClosingTag(value: string): string {
  return value.replace(/<\/style/gi, "<\\/style");
}

function serializeForScript(value: string): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => {
    const codePoint = character.codePointAt(0);

    return `\\u${codePoint?.toString(16).padStart(4, "0")}`;
  });
}

function createPreviewBridgeScript({
  html,
  baseCss,
}: PreviewBridgeInput): string {
  const parentSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.parent);
  const previewSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.preview);
  const checkResultType = JSON.stringify(PREVIEW_MESSAGE_TYPE.checkResult);
  const checkRunType = JSON.stringify(PREVIEW_MESSAGE_TYPE.checkRun);
  const cssUpdateType = JSON.stringify(PREVIEW_MESSAGE_TYPE.cssUpdate);
  const readyType = JSON.stringify(PREVIEW_MESSAGE_TYPE.ready);
  const fixtureHtml = serializeForScript(html);
  const fixtureBaseCss = serializeForScript(escapeStyleClosingTag(baseCss));

  return `
(() => {
  const parentSource = ${parentSource};
  const previewSource = ${previewSource};
  const checkResultType = ${checkResultType};
  const checkRunType = ${checkRunType};
  const cssUpdateType = ${cssUpdateType};
  const readyType = ${readyType};
  const fixtureHtml = ${fixtureHtml};
  const fixtureBaseCss = ${fixtureBaseCss};
  const supportedViewportWidths = new Set([390, 768, 1280]);

  const isRecord = (value) =>
    Boolean(value) && typeof value === "object";

  const isStringArray = (value) =>
    Array.isArray(value) && value.every((item) => typeof item === "string");

  const isStyleCheck = (value) =>
    (value.type === "style" ||
      value.type === "rule-style" ||
      value.type === "viewport-style") &&
    typeof value.property === "string" &&
    typeof value.equals === "string" &&
    (value.alsoAccepts === undefined || isStringArray(value.alsoAccepts));

  const isCheck = (value) => {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.message !== "string" || typeof value.selector !== "string") {
      return false;
    }

    if (isStyleCheck(value)) {
      if (value.type === "rule-style") {
        if (value.media !== undefined && typeof value.media !== "string") {
          return false;
        }

        if (
          value.priority !== undefined &&
          value.priority !== "normal" &&
          value.priority !== "important"
        ) {
          return false;
        }

        if (
          value.afterSelector !== undefined &&
          typeof value.afterSelector !== "string"
        ) {
          return false;
        }
      }

      return value.type !== "viewport-style" ||
        (Number.isInteger(value.viewportWidth) && value.viewportWidth > 0);
    }

    if (value.type === "exists") {
      return true;
    }

    return value.type === "count" && Number.isInteger(value.equals) && value.equals >= 0;
  };

  const expectedFor = (check) => {
    if (isStyleCheck(check)) {
      const accepted = [
        check.equals,
        ...(Array.isArray(check.alsoAccepts) ? check.alsoAccepts : []),
      ];

      const expectedValue = accepted.join(" / ");

      if (check.type === "rule-style" && check.priority !== undefined) {
        return expectedValue + " [priority: " + check.priority + "]";
      }

      return expectedValue;
    }

    if (check.type === "count" && Number.isInteger(check.equals)) {
      return check.equals;
    }

    if (check.type === "exists") {
      return true;
    }

    return false;
  };

  const selectorFor = (check) =>
    typeof check.selector === "string" ? check.selector : null;

  const propertyFor = (check) =>
    isStyleCheck(check) ? check.property : null;

  const typeFor = (check) => {
    if (
      check &&
      (check.type === "style" ||
        check.type === "rule-style" ||
        check.type === "viewport-style" ||
        check.type === "exists" ||
        check.type === "count")
    ) {
      return check.type;
    }

    return "style";
  };

  const failedResult = (check, reason, actual = null) => ({
    id: typeof check.id === "string" ? check.id : "unknown-check",
    type: typeFor(check),
    message: typeof check.message === "string" ? check.message : "无法执行此检查",
    passed: false,
    expected: expectedFor(check),
    actual,
    selector: selectorFor(check),
    property: propertyFor(check),
    reason,
  });

  const completedResult = (check, passed, expected, actual) => ({
    id: check.id,
    type: check.type,
    message: check.message,
    passed,
    expected,
    actual,
    selector: check.selector,
    property: propertyFor(check),
    reason: passed ? "matched" : "mismatch",
  });

  const acceptedValuesFor = (check) => [
    check.equals,
    ...(Array.isArray(check.alsoAccepts) ? check.alsoAccepts : []),
  ];

  const normalizeMedia = (value) =>
    typeof value === "string" ? value.trim().replace(/\\s+/g, " ") : "";

  const readRuleStyle = (check) => {
    const styleElement = document.getElementById("user-css");

    if (!styleElement || !styleElement.sheet) {
      return {
        selectorFound: false,
        propertyFound: false,
        actual: null,
        priority: null,
      };
    }

    const matchingMedia = check.media === undefined
      ? null
      : normalizeMedia(check.media);
    let selectorFound = false;
    let propertyFound = false;
    let actual = null;
    let priority = null;
    let sequence = 0;
    let selectorPosition = null;
    let afterSelectorPosition = null;

    const inspectRules = (rules, insideMatchingMedia) => {
      for (const rule of Array.from(rules)) {
        if (rule instanceof CSSStyleRule) {
          if (!insideMatchingMedia && check.media !== undefined) {
            continue;
          }

          if (insideMatchingMedia || check.media === undefined) {
            sequence += 1;

            if (
              check.afterSelector !== undefined &&
              rule.selectorText === check.afterSelector
            ) {
              afterSelectorPosition = sequence;
            }

            if (rule.selectorText !== check.selector) {
              continue;
            }

            selectorFound = true;
            const value = rule.style.getPropertyValue(check.property).trim();

            if (value) {
              propertyFound = true;
              actual = value;
              selectorPosition = sequence;
              priority =
                rule.style.getPropertyPriority(check.property) === "important"
                  ? "important"
                  : "normal";
            }
          }

          continue;
        }

        if (!(rule instanceof CSSMediaRule) || check.media === undefined) {
          continue;
        }

        const mediaText = normalizeMedia(
          rule.conditionText || rule.media?.mediaText,
        );

        if (mediaText === matchingMedia) {
          inspectRules(rule.cssRules, true);
        }
      }
    };

    inspectRules(styleElement.sheet.cssRules, false);

    const orderMatches =
      check.afterSelector === undefined ||
      (selectorPosition !== null &&
        afterSelectorPosition !== null &&
        selectorPosition > afterSelectorPosition);

    return {
      selectorFound,
      propertyFound,
      actual,
      priority,
      orderMatches,
    };
  };

  const escapeStyleClosingTagInProbe = (value) =>
    value.replace(/<\\/style/gi, "<\\\\/style");

  const createProbeScript = () =>
    "<script>" +
    "(() => {" +
    "const hostSource = \\\"css-lab-probe-host\\\";" +
    "const probeSource = \\\"css-lab-probe\\\";" +
    "const styleRequestType = \\\"style\\\";" +
    "const resultType = \\\"result\\\";" +
    "const readyType = \\\"ready\\\";" +
    "const postReady = () => window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.parent.postMessage({ source: probeSource, type: readyType }, \\\"*\\\")));" +
    "window.addEventListener(\\\"message\\\", (event) => {" +
    "if (event.source !== window.parent || !event.data || event.data.source !== hostSource || event.data.type !== styleRequestType) return;" +
    "const message = event.data;" +
    "try {" +
    "const element = document.querySelector(message.selector);" +
    "const actual = element ? window.getComputedStyle(element).getPropertyValue(message.property).trim() : null;" +
    "window.parent.postMessage({ source: probeSource, type: resultType, requestId: message.requestId, found: Boolean(element), actual, error: false }, \\\"*\\\");" +
    "} catch {" +
    "window.parent.postMessage({ source: probeSource, type: resultType, requestId: message.requestId, found: false, actual: null, error: true }, \\\"*\\\");" +
    "}" +
    "});" +
    "postReady();" +
    "})();" +
    "</scr" + "ipt>";

  const createProbeDocument = (viewportWidth, userCss) => {
    const probe = document.createElement("iframe");
    probe.title = "CSS Lab viewport checker probe";
    probe.style.position = "fixed";
    probe.style.left = "-10000px";
    probe.style.top = "-10000px";
    probe.style.width = viewportWidth + "px";
    probe.style.height = "900px";
    probe.style.border = "0";
    probe.style.opacity = "0";
    probe.style.pointerEvents = "none";
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          probe.remove();
          reject(new Error("Viewport checker probe timed out"));
        }
      }, 10000);
      let readyFallback = 0;

      const settle = () => {
        if (settled) {
          return;
        }

        settled = true;
        window.clearTimeout(timeout);
        window.clearTimeout(readyFallback);
        window.removeEventListener("message", handleMessage);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() =>
            resolve({
              iframe: probe,
              readStyle: (selector, property) =>
                new Promise((resolveStyle, rejectStyle) => {
                  const requestId =
                    viewportWidth + ":" + Date.now() + ":" + Math.random();
                  let styleRetry = 0;
                  const styleTimeout = window.setTimeout(() => {
                    window.clearInterval(styleRetry);
                    window.removeEventListener("message", handleStyleMessage);
                    rejectStyle(new Error("Viewport checker style request timed out"));
                  }, 10000);
                  const handleStyleMessage = (event) => {
                    if (
                      event.source !== probe.contentWindow ||
                      !event.data ||
                      event.data.source !== "css-lab-probe" ||
                      event.data.type !== "result" ||
                      event.data.requestId !== requestId
                    ) {
                      return;
                    }

                    window.clearTimeout(styleTimeout);
                    window.clearInterval(styleRetry);
                    window.removeEventListener("message", handleStyleMessage);
                    resolveStyle(event.data);
                  };

                  const postStyleRequest = () => {
                    probe.contentWindow?.postMessage(
                      {
                        source: "css-lab-probe-host",
                        type: "style",
                        requestId,
                        selector,
                        property,
                      },
                      "*",
                    );
                  };

                  window.addEventListener("message", handleStyleMessage);
                  styleRetry = window.setInterval(postStyleRequest, 50);
                  postStyleRequest();
                }),
            }),
          );
        });
      };

      const handleMessage = (event) => {
        if (
          event.source !== probe.contentWindow ||
          !event.data ||
          event.data.source !== "css-lab-probe" ||
          event.data.type !== "ready"
        ) {
          return;
        }

        settle();
      };

      window.addEventListener("message", handleMessage);
      probe.addEventListener("load", settle, { once: true });
      readyFallback = window.setTimeout(settle, 1000);
      document.body.appendChild(probe);
      probe.srcdoc =
        "<!doctype html>" +
        "<html lang=\\\"en\\\"><head>" +
        "<meta charset=\\\"utf-8\\\">" +
        "<meta name=\\\"viewport\\\" content=\\\"width=device-width, initial-scale=1\\\">" +
        "<style id=\\\"base-css\\\">" + fixtureBaseCss + "</style>" +
        "<style id=\\\"user-css\\\">" +
        escapeStyleClosingTagInProbe(userCss) +
        "</style></head><body>" +
        fixtureHtml +
        "</body>" +
        createProbeScript() +
        "</html>";
    });
  };

  const runCheck = async (check, getProbe) => {
    if (!isCheck(check)) {
      return failedResult(check || {}, "checker-error");
    }

    try {
      if (check.type === "style") {
        const element = document.querySelector(check.selector);

        if (!element) {
          return failedResult(check, "selector-not-found");
        }

        const actual = getComputedStyle(element)
          .getPropertyValue(check.property)
          .trim();
        const accepted = acceptedValuesFor(check);

        return completedResult(
          check,
          accepted.includes(actual),
          accepted.join(" / "),
          actual,
        );
      }

      if (check.type === "rule-style") {
        const result = readRuleStyle(check);

        if (!result.selectorFound) {
          return failedResult(check, "selector-not-found");
        }

        const accepted = acceptedValuesFor(check);
        const priorityMatches =
          check.priority === undefined || result.priority === check.priority;
        const orderMatches =
          check.afterSelector === undefined || result.orderMatches;
        const expected =
          accepted.join(" / ") +
          (check.priority === undefined
            ? ""
            : " [priority: " + check.priority + "]") +
          (check.afterSelector === undefined
            ? ""
            : " [after: " + check.afterSelector + "]");
        const actual =
          result.actual === null
            ? null
            : result.actual +
              (check.priority === undefined
                ? ""
                : " [priority: " + result.priority + "]") +
              (check.afterSelector === undefined
                ? ""
                : " [after check: " +
                  (result.orderMatches ? "matched" : "mismatch") +
                  "]");

        return completedResult(
          check,
          result.propertyFound &&
            accepted.includes(result.actual) &&
            priorityMatches &&
            orderMatches,
          expected,
          actual,
        );
      }

      if (check.type === "viewport-style") {
        if (!supportedViewportWidths.has(check.viewportWidth)) {
          return failedResult(check, "checker-error");
        }

        const probe = await getProbe(check.viewportWidth);
        const result = await probe.readStyle(check.selector, check.property);

        if (result.error) {
          return failedResult(check, "checker-error");
        }

        if (!result.found) {
          return failedResult(check, "selector-not-found");
        }

        const actual = result.actual;
        const accepted = acceptedValuesFor(check);

        return completedResult(
          check,
          accepted.includes(actual),
          accepted.join(" / "),
          actual,
        );
      }

      if (check.type === "exists") {
        const actual = document.querySelector(check.selector) !== null;

        return completedResult(
          check,
          actual === true,
          true,
          actual,
        );
      }

      const actual = document.querySelectorAll(check.selector).length;

      return completedResult(
        check,
        actual === check.equals,
        check.equals,
        actual,
      );
    } catch {
      return failedResult(check, "checker-error");
    }
  };

  const runChecks = async (checks, userCss) => {
    const probes = new Map();
    const getProbe = (viewportWidth) => {
      if (!probes.has(viewportWidth)) {
        probes.set(
          viewportWidth,
          createProbeDocument(viewportWidth, userCss),
        );
      }

      return probes.get(viewportWidth);
    };

    try {
      const results = await Promise.all(
        checks.map((check) => runCheck(check, getProbe)),
      );

      return {
        passed: results.every((result) => result.passed),
        results,
      };
    } finally {
      for (const probePromise of probes.values()) {
        try {
          const probe = await probePromise;
          probe.iframe.remove();
        } catch {
          // A failed probe may already have been removed by the browser.
        }
      }
    }
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const message = event.data;

    if (!isRecord(message) || message.source !== parentSource) {
      return;
    }

    if (message.type === cssUpdateType && typeof message.css === "string") {
      const style = document.getElementById("user-css");

      if (style) {
        style.textContent = message.css;
      }

      return;
    }

    if (
      message.type !== checkRunType ||
      typeof message.requestId !== "string" ||
      !Array.isArray(message.checks)
    ) {
      return;
    }

    const userCss = document.getElementById("user-css")?.textContent ?? "";

    void runChecks(message.checks, userCss).then((checkRun) => {
      window.parent.postMessage(
        {
          source: previewSource,
          type: checkResultType,
          requestId: message.requestId,
          passed: checkRun.passed,
          results: checkRun.results,
        },
        "*",
      );
    });
  });

  window.parent.postMessage(
    {
      source: previewSource,
      type: readyType,
    },
    "*",
  );
})();
`;
}

export function createPreviewDocument({
  html,
  baseCss,
}: PreviewDocumentInput): string {
  const safeBaseCss = escapeStyleClosingTag(baseCss);
  const bridgeScript = createPreviewBridgeScript({ html, baseCss });

  // fixtureHtml is trusted course-author content. Learners cannot edit HTML.
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style id="base-css">${safeBaseCss}</style>
    <style id="user-css"></style>
  </head>
  <body>
    ${html}
    <script>${bridgeScript}</script>
  </body>
</html>`;
}
