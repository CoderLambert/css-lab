"use client";

import { useEffect, useMemo, useRef } from "react";

import { createCssUpdateMessage, isPreviewReadyMessage } from "../lib/preview-messages";
import { createPreviewDocument } from "../lib/preview-document";

interface PreviewFrameProps {
  html: string;
  baseCss: string;
  css: string;
}

export function PreviewFrame({ html, baseCss, css }: PreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const cssRef = useRef(css);

  const srcDoc = useMemo(
    () => createPreviewDocument({ html, baseCss }),
    [html, baseCss],
  );

  useEffect(() => {
    cssRef.current = css;
  }, [css]);

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
        iframeWindow.postMessage(createCssUpdateMessage(cssRef.current), "*");
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;

    if (iframeWindow) {
      iframeWindow.postMessage(createCssUpdateMessage(css), "*");
    }
  }, [css]);

  const handleIframeLoad = () => {
    const iframeWindow = iframeRef.current?.contentWindow;

    if (iframeWindow) {
      iframeWindow.postMessage(createCssUpdateMessage(cssRef.current), "*");
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
