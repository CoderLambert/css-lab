"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";

import type { BrowserRuntimeDefinition } from "@/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "@/lib/workspace/types";
import {
  BROWSER_RUNTIME_BRIDGE_VERSION,
  createBrowserDocumentFromIdentity,
  type BrowserDocumentDescriptor,
} from "../lib/browser-document";
import {
  acceptsCheckResult,
  acceptsRuntimeReady,
  browserDocumentIdentityEquals,
  createBrowserDocumentIdentity,
  planCapturedCheckDispatch,
  planCssSync,
  type BrowserCheckRequest,
  type BrowserDocumentIdentity,
} from "../lib/browser-host";
import type { CheckResultMessage } from "../lib/browser-messages";
import { deriveBrowserSnapshotModel } from "../lib/browser-security";

export interface BrowserRuntimeFrameProps {
  runtime: BrowserRuntimeDefinition;
  snapshot: ExecutionSnapshot;
  checkRequest: BrowserCheckRequest | null;
  onCheckResult: (result: CheckResultMessage) => void;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}

interface RuntimeModelState {
  identityKey: string | null;
  error: string | null;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Invalid Browser Runtime input";
}

function createIdentityState(
  runtime: BrowserRuntimeDefinition,
  snapshot: ExecutionSnapshot,
): RuntimeModelState {
  try {
    const identity = createBrowserDocumentIdentity(
      runtime,
      snapshot,
      BROWSER_RUNTIME_BRIDGE_VERSION,
    );

    return {
      identityKey: JSON.stringify(identity),
      error: null,
    };
  } catch (error) {
    return {
      identityKey: null,
      error: toErrorMessage(error),
    };
  }
}

function parseIdentity(identityKey: string): BrowserDocumentIdentity {
  return JSON.parse(identityKey) as BrowserDocumentIdentity;
}

function descriptorIdentity(
  runtime: BrowserRuntimeDefinition,
  descriptor: BrowserDocumentDescriptor,
): BrowserDocumentIdentity {
  return {
    runtimeEntry: runtime.entry,
    entryHtml: descriptor.entryHtml,
    cssTopology: descriptor.cssTopology,
    bridgeVersion: BROWSER_RUNTIME_BRIDGE_VERSION,
  };
}

export function BrowserRuntimeFrame({
  runtime,
  snapshot,
  checkRequest,
  onCheckResult,
  width = "100%",
  height = 300,
}: BrowserRuntimeFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const snapshotRef = useRef(snapshot);
  const checkRequestRef = useRef(checkRequest);
  const onCheckResultRef = useRef(onCheckResult);
  const descriptorRef = useRef<BrowserDocumentDescriptor | null>(null);
  const readyGenerationRef = useRef<string | null>(null);
  const sentCheckRequestIdRef = useRef<string | null>(null);
  const sentCssRef = useRef<Map<string, string>>(new Map());

  useLayoutEffect(() => {
    snapshotRef.current = snapshot;
    checkRequestRef.current = checkRequest;
    onCheckResultRef.current = onCheckResult;
  }, [checkRequest, onCheckResult, snapshot]);

  const modelState = useMemo(
    () => createIdentityState(runtime, snapshot),
    [runtime, snapshot],
  );
  const identity = useMemo(
    () =>
      modelState.identityKey
        ? parseIdentity(modelState.identityKey)
        : null,
    [modelState.identityKey],
  );
  const descriptor = useMemo(
    () => (identity ? createBrowserDocumentFromIdentity(identity) : null),
    [identity],
  );

  useLayoutEffect(() => {
    descriptorRef.current = descriptor;
  }, [descriptor]);

  const postMessages = useCallback(
    (iframeWindow: Window, messages: readonly unknown[]) => {
      for (const message of messages) {
        iframeWindow.postMessage(message, "*");
      }
    },
    [],
  );

  const rememberCss = useCallback((currentSnapshot: ExecutionSnapshot) => {
    const next = new Map<string, string>();

    for (const file of currentSnapshot.files) {
      if (file.language === "css") {
        next.set(file.path, file.content);
      }
    }

    sentCssRef.current = next;
  }, []);

  const sendAllLiveCss = useCallback(
    (
      iframeWindow: Window,
      currentDescriptor: BrowserDocumentDescriptor,
    ): boolean => {
      try {
        const liveIdentity = createBrowserDocumentIdentity(
          runtime,
          snapshotRef.current,
          BROWSER_RUNTIME_BRIDGE_VERSION,
        );

        if (
          !browserDocumentIdentityEquals(
            liveIdentity,
            descriptorIdentity(runtime, currentDescriptor),
          )
        ) {
          return false;
        }

        postMessages(
          iframeWindow,
          planCssSync(
            currentDescriptor.generationId,
            snapshotRef.current,
          ),
        );
        rememberCss(snapshotRef.current);
        return true;
      } catch {
        return false;
      }
    },
    [postMessages, rememberCss, runtime],
  );

  const sendPendingCheck = useCallback(
    (
      iframeWindow: Window,
      currentDescriptor: BrowserDocumentDescriptor,
    ) => {
      const request = checkRequestRef.current;

      if (
        !request ||
        sentCheckRequestIdRef.current === request.requestId
      ) {
        return;
      }

      try {
        postMessages(
          iframeWindow,
          planCapturedCheckDispatch(
            currentDescriptor.generationId,
            runtime,
            descriptorIdentity(runtime, currentDescriptor),
            request,
          ),
        );
        sentCheckRequestIdRef.current = request.requestId;
      } catch {
        // Editable changes invalidate the parent request. A request captured
        // for another document generation is intentionally not executed.
      }
    },
    [postMessages, runtime],
  );

  useLayoutEffect(() => {
    readyGenerationRef.current = null;
    sentCheckRequestIdRef.current = null;
    sentCssRef.current = new Map();
  }, [descriptor?.generationId]);

  useLayoutEffect(() => {
    const handleMessage = (event: MessageEvent<unknown>) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      const currentDescriptor = descriptorRef.current;

      if (
        !iframeWindow ||
        !currentDescriptor ||
        event.source !== iframeWindow
      ) {
        return;
      }

      if (
        acceptsRuntimeReady(
          event.data,
          currentDescriptor.generationId,
        )
      ) {
        readyGenerationRef.current = currentDescriptor.generationId;

        if (sendAllLiveCss(iframeWindow, currentDescriptor)) {
          sendPendingCheck(iframeWindow, currentDescriptor);
        }
        return;
      }

      const activeRequestId = checkRequestRef.current?.requestId ?? null;

      if (
        !acceptsCheckResult(
          event.data,
          currentDescriptor.generationId,
          activeRequestId,
        )
      ) {
        return;
      }

      onCheckResultRef.current(event.data);
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [sendAllLiveCss, sendPendingCheck]);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    const currentDescriptor = descriptorRef.current;

    if (
      !iframeWindow ||
      !currentDescriptor ||
      readyGenerationRef.current !== currentDescriptor.generationId
    ) {
      return;
    }

    let model;

    try {
      model = deriveBrowserSnapshotModel(runtime, snapshot);
    } catch {
      return;
    }

    const liveIdentity: BrowserDocumentIdentity = {
      runtimeEntry: runtime.entry,
      entryHtml: model.entryHtml,
      cssTopology: model.cssTopology,
      bridgeVersion: BROWSER_RUNTIME_BRIDGE_VERSION,
    };

    if (
      !browserDocumentIdentityEquals(
        descriptorIdentity(runtime, currentDescriptor),
        liveIdentity,
      )
    ) {
      return;
    }

    for (const file of model.cssFiles) {
      if (sentCssRef.current.get(file.path) === file.content) {
        continue;
      }

      postMessages(
        iframeWindow,
        planCssSync(currentDescriptor.generationId, {
          files: [file],
        }),
      );
      sentCssRef.current.set(file.path, file.content);
    }
  }, [postMessages, runtime, snapshot]);

  useEffect(() => {
    const iframeWindow = iframeRef.current?.contentWindow;
    const currentDescriptor = descriptorRef.current;

    if (
      !iframeWindow ||
      !currentDescriptor ||
      !checkRequest ||
      readyGenerationRef.current !== currentDescriptor.generationId
    ) {
      return;
    }

    sendPendingCheck(iframeWindow, currentDescriptor);
  }, [checkRequest, sendPendingCheck]);

  if (!descriptor || modelState.error) {
    return (
      <div
        role="alert"
        className="flex min-h-[180px] items-center justify-center bg-preview px-4 text-center text-sm text-destructive"
        style={{ width, height }}
      >
        Browser Runtime unavailable: {modelState.error ?? "invalid input"}
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title="Browser exercise preview"
      sandbox="allow-scripts"
      srcDoc={descriptor.srcDoc}
      className="block shrink-0 border-0 bg-preview"
      style={{ width, height }}
    />
  );
}
