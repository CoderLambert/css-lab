import {
  PREVIEW_MESSAGE_SOURCE,
  PREVIEW_MESSAGE_TYPE,
} from "./preview-messages";

interface PreviewDocumentInput {
  html: string;
  baseCss: string;
}

function escapeStyleClosingTag(value: string): string {
  return value.replace(/<\/style/gi, "<\\/style");
}

function createPreviewBridgeScript(): string {
  const parentSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.parent);
  const previewSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.preview);
  const checkResultType = JSON.stringify(PREVIEW_MESSAGE_TYPE.checkResult);
  const checkRunType = JSON.stringify(PREVIEW_MESSAGE_TYPE.checkRun);
  const cssUpdateType = JSON.stringify(PREVIEW_MESSAGE_TYPE.cssUpdate);
  const readyType = JSON.stringify(PREVIEW_MESSAGE_TYPE.ready);

  return `
(() => {
  const parentSource = ${parentSource};
  const previewSource = ${previewSource};
  const checkResultType = ${checkResultType};
  const checkRunType = ${checkRunType};
  const cssUpdateType = ${cssUpdateType};
  const readyType = ${readyType};

  const isRecord = (value) =>
    Boolean(value) && typeof value === "object";

  const isCheck = (value) => {
    if (!isRecord(value) || typeof value.id !== "string" || typeof value.message !== "string" || typeof value.selector !== "string") {
      return false;
    }

    if (value.type === "style") {
      return typeof value.property === "string" && typeof value.equals === "string";
    }

    if (value.type === "exists") {
      return true;
    }

    return value.type === "count" && Number.isInteger(value.equals) && value.equals >= 0;
  };

  const expectedFor = (check) => {
    if (check.type === "style") {
      return check.equals;
    }

    if (check.type === "count") {
      return check.equals;
    }

    return true;
  };

  const failedResult = (check, actual = null) => ({
    id: typeof check.id === "string" ? check.id : "unknown-check",
    type: check.type === "exists" || check.type === "count" ? check.type : "style",
    message: typeof check.message === "string" ? check.message : "无法执行此检查",
    passed: false,
    expected: expectedFor(check),
    actual,
  });

  const runCheck = (check) => {
    if (!isCheck(check)) {
      return failedResult(check || {});
    }

    try {
      if (check.type === "style") {
        const element = document.querySelector(check.selector);

        if (!element) {
          return failedResult(check);
        }

        const actual = getComputedStyle(element)
          .getPropertyValue(check.property)
          .trim();

        return {
          id: check.id,
          type: check.type,
          message: check.message,
          passed: actual === check.equals,
          expected: check.equals,
          actual,
        };
      }

      if (check.type === "exists") {
        const actual = document.querySelector(check.selector) !== null;

        return {
          id: check.id,
          type: check.type,
          message: check.message,
          passed: actual === true,
          expected: true,
          actual,
        };
      }

      const actual = document.querySelectorAll(check.selector).length;

      return {
        id: check.id,
        type: check.type,
        message: check.message,
        passed: actual === check.equals,
        expected: check.equals,
        actual,
      };
    } catch {
      return failedResult(check);
    }
  };

  const runChecks = (checks) => {
    const results = checks.map(runCheck);

    return {
      passed: results.every((result) => result.passed),
      results,
    };
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

    const checkRun = runChecks(message.checks);

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
  const bridgeScript = createPreviewBridgeScript();

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
