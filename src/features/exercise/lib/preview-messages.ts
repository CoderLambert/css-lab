export const PREVIEW_MESSAGE_SOURCE = {
  parent: "css-lab-parent",
  preview: "css-lab-preview",
} as const;

export const PREVIEW_MESSAGE_TYPE = {
  cssUpdate: "css:update",
  ready: "ready",
} as const;

export interface CssUpdateMessage {
  source: typeof PREVIEW_MESSAGE_SOURCE.parent;
  type: typeof PREVIEW_MESSAGE_TYPE.cssUpdate;
  css: string;
}

export interface PreviewReadyMessage {
  source: typeof PREVIEW_MESSAGE_SOURCE.preview;
  type: typeof PREVIEW_MESSAGE_TYPE.ready;
}

export type ParentToPreviewMessage = CssUpdateMessage;
export type PreviewToParentMessage = PreviewReadyMessage;

export function createCssUpdateMessage(css: string): CssUpdateMessage {
  return {
    source: PREVIEW_MESSAGE_SOURCE.parent,
    type: PREVIEW_MESSAGE_TYPE.cssUpdate,
    css,
  };
}

export function isCssUpdateMessage(value: unknown): value is CssUpdateMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<CssUpdateMessage>;

  return (
    message.source === PREVIEW_MESSAGE_SOURCE.parent &&
    message.type === PREVIEW_MESSAGE_TYPE.cssUpdate &&
    typeof message.css === "string"
  );
}

export function isPreviewReadyMessage(
  value: unknown,
): value is PreviewReadyMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Partial<PreviewReadyMessage>;

  return (
    message.source === PREVIEW_MESSAGE_SOURCE.preview &&
    message.type === PREVIEW_MESSAGE_TYPE.ready
  );
}
