"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  createCheckRunMessage,
  createCssUpdateMessage,
  isCheckResultMessage,
  isPreviewReadyMessage,
  type CheckRequest,
  type CheckResultMessage,
} from "../lib/preview-messages";
import { createPreviewDocument } from "../lib/preview-document";

export interface PreviewFrameProps {
  html: string;
  baseCss: string;
  css: string;
  checkRequest: CheckRequest | null;
  onCheckResult: (result: CheckResultMessage) => void;
}

function postCssUpdate(iframeWindow: Window, css: string): void {
  iframeWindow.postMessage(createCssUpdateMessage(css), "*");
}

export function PreviewFrame({
  html,
  baseCss,
  css,
  checkRequest,
  onCheckResult,
}: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cssRef = useRef(css);
  const checkRequestRef = useRef<CheckRequest | null>(checkRequest);
  const isReadyRef = useRef(false);
  const sentCheckRequestIdRef = useRef<string | null>(null);
  const onCheckResultRef = useRef(onCheckResult);

  const srcDoc = useMemo(
    () => createPreviewDocument({ html, baseCss }),
    [html, baseCss],
  );

  useEffect(() => {
    cssRef.current = css;
  }, [css]);

  useEffect(() => {
    checkRequestRef.current = checkRequest;
  }, [checkRequest]);

  useEffect(() => {
    onCheckResultRef.current = onCheckResult;
  }, [onCheckResult]);

  useEffect(() => {
    isReadyRef.current = false;
  }, [srcDoc]);

  const sendPendingCheck = useCallback((iframeWindow: Window): void => {
    const request = checkRequestRef.current;

    if (
      !request ||
      sentCheckRequestIdRef.current === request.requestId
    ) {
      return;
    }

    iframeWindow.postMessage(createCheckRunMessage(request), "*");
    sentCheckRequestIdRef.current = request.requestId;
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;

    if (!iframe) {
      return;
    }

    const handleMessage = (event: MessageEvent<unknown>) => {
      const iframeWindow = iframe.contentWindow;

      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      if (isPreviewReadyMessage(event.data)) {
        isReadyRef.current = true;
        postCssUpdate(iframeWindow, cssRef.current);
        sendPendingCheck(iframeWindow);
        return;
      }

      if (!isCheckResultMessage(event.data)) {
        return;
      }

      const pendingRequest = checkRequestRef.current;

      if (
        !pendingRequest ||
        pendingRequest.requestId !== event.data.requestId
      ) {
        return;
      }

      onCheckResultRef.current(event.data);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [sendPendingCheck]);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;

    if (iframeWindow) {
      postCssUpdate(iframeWindow, css);

      if (checkRequest && isReadyRef.current) {
        sendPendingCheck(iframeWindow);
      }
    }
  }, [checkRequest, css, sendPendingCheck]);

  const handleIframeLoad = () => {
    const iframeWindow = iframeRef.current?.contentWindow;

    if (iframeWindow) {
      isReadyRef.current = true;
      postCssUpdate(iframeWindow, cssRef.current);

      sendPendingCheck(iframeWindow);
    }
  };

  return (
    <iframe
      ref={iframeRef}
      title="CSS exercise preview"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      onLoad={handleIframeLoad}
      className="block h-[300px] w-full border-0 bg-preview"
    />
  );
}
