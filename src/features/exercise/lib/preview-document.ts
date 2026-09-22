import {
  PREVIEW_MESSAGE_SOURCE,
  PREVIEW_MESSAGE_TYPE,
} from "./preview-messages";

interface PreviewDocumentInput {
  html: string;
  baseCss: string;
}

function escapeClosingTag(value: string, tagName: string): string {
  return value.replace(new RegExp(`</${tagName}`, "gi"), `<\\/${tagName}`);
}

function createPreviewBridgeScript(): string {
  const parentSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.parent);
  const previewSource = JSON.stringify(PREVIEW_MESSAGE_SOURCE.preview);
  const cssUpdateType = JSON.stringify(PREVIEW_MESSAGE_TYPE.cssUpdate);
  const readyType = JSON.stringify(PREVIEW_MESSAGE_TYPE.ready);

  return `
(() => {
  const parentSource = ${parentSource};
  const previewSource = ${previewSource};
  const cssUpdateType = ${cssUpdateType};
  const readyType = ${readyType};

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) {
      return;
    }

    const message = event.data;

    if (
      !message ||
      typeof message !== "object" ||
      message.source !== parentSource ||
      message.type !== cssUpdateType ||
      typeof message.css !== "string"
    ) {
      return;
    }

    const style = document.getElementById("user-css");

    if (style) {
      style.textContent = message.css;
    }
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

export function createPreviewDocument({ html, baseCss }: PreviewDocumentInput): string {
  const safeBaseCss = escapeClosingTag(baseCss, "style");
  const safeFixtureHtml = escapeClosingTag(html, "script");
  const bridgeScript = createPreviewBridgeScript();

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style id="base-css">${safeBaseCss}</style>
    <style id="user-css"></style>
  </head>
  <body>
    ${safeFixtureHtml}
    <script>${bridgeScript}</script>
  </body>
</html>`;
}
