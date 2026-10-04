import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test, type Page } from "@playwright/test";

import { CheckResults } from "../src/features/exercise/components/check-results";
import { BROWSER_RUNTIME_BRIDGE_VERSION, createBrowserDocument } from "../src/features/exercise/runtime/browser/lib/browser-document";
import { acceptsCheckResult, createBrowserDocumentIdentity, planCapturedCheckDispatch } from "../src/features/exercise/runtime/browser/lib/browser-host";
import { isCheckResultMessage, type CheckResultMessage } from "../src/features/exercise/runtime/browser/lib/browser-messages";
import { ExerciseRecordSchema, type Check, type RuleStyleCheck } from "../src/lib/content/schemas/exercise";
import type { ExecutionSnapshot } from "../src/lib/workspace/types";

const root = resolve(process.cwd(), "content/courses/css-foundations/modules/box-model-and-flow/lessons/sizing-constraints-and-overflow/exercises/debug-fixed-width-failure");
const exercise = ExerciseRecordSchema.parse(JSON.parse(readFileSync(resolve(root, "exercise.json"), "utf8")));
const solution = readFileSync(resolve(root, "solution/style.css"), "utf8");
const files = exercise.workspace.files.map((file) => ({
  path: file.path, language: file.language,
  content: readFileSync(resolve(root, "starter", file.path), "utf8"),
}));
const generationId = "feedback-generation";
let sequence = 0;

function snapshot(css: string): ExecutionSnapshot {
  return { files: files.map((file) => file.path === "style.css" ? { ...file, content: css } : file) };
}

async function mount(page: Page) {
  const descriptor = createBrowserDocument({
    runtime: exercise.runtime, snapshot: snapshot(solution), generationId,
    nonce: "00112233445566778899aabbccddeeff",
  });
  await page.setContent('<iframe id="runtime" width="800" height="600" sandbox="allow-scripts"></iframe><div id="feedback"></div>');
  await page.evaluate(async ({ srcDoc, generationId }) => {
    const frame = document.querySelector<HTMLIFrameElement>("#runtime");
    if (!frame) throw new Error("missing iframe");
    await new Promise<void>((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        if (event.source === frame.contentWindow && event.data?.source === "lab-runtime" &&
            event.data?.type === "runtime:ready" && event.data?.generationId === generationId) {
          clearTimeout(timeout);
          window.removeEventListener("message", listener);
          resolve();
        }
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", listener);
        reject(new Error("runtime ready timeout"));
      }, 5000);
      window.addEventListener("message", listener);
      frame.srcdoc = srcDoc;
    });
  }, descriptor);
}

async function run(page: Page, css: string, checks: readonly Check[] = exercise.checks) {
  const captured = snapshot(css);
  const requestId = `feedback-${++sequence}`;
  const identity = createBrowserDocumentIdentity(exercise.runtime, captured, BROWSER_RUNTIME_BRIDGE_VERSION);
  const messages = planCapturedCheckDispatch(generationId, exercise.runtime, identity, {
    requestId, checks, snapshot: captured,
  });
  const value = await page.evaluate(async ({ messages, requestId, generationId }) => {
    const frame = document.querySelector<HTMLIFrameElement>("#runtime");
    const target = frame?.contentWindow;
    if (!target) throw new Error("missing runtime window");
    return new Promise<unknown>((resolve, reject) => {
      const listener = (event: MessageEvent) => {
        if (event.source === target && event.data?.source === "lab-runtime" &&
            event.data?.type === "check:result" && event.data?.generationId === generationId &&
            event.data?.requestId === requestId) {
          clearTimeout(timeout);
          window.removeEventListener("message", listener);
          resolve(event.data);
        }
      };
      const timeout = window.setTimeout(() => {
        window.removeEventListener("message", listener);
        reject(new Error("check result timeout"));
      }, 5000);
      window.addEventListener("message", listener);
      for (const message of messages) target.postMessage(message, "*");
    });
  }, { messages, requestId, generationId });
  if (!isCheckResultMessage(value)) throw new Error("invalid runtime result");
  expect(acceptsCheckResult(value, generationId, requestId)).toBe(true);
  return value;
}

async function show(page: Page, response: CheckResultMessage, checks: readonly Check[] = exercise.checks, hasEditableHtml = false) {
  // Render the production React feedback component from real runtime output.
  // This is component+iframe integration, not a published learner-route test.
  const markup = renderToStaticMarkup(createElement(CheckResults, {
    state: { status: "complete", requestId: response.requestId, passed: response.passed, results: response.results },
    checks, hasEditableHtml,
  }));
  await page.locator("#feedback").evaluate((node, markup) => { node.innerHTML = markup; }, markup);
  return page.locator("#feedback");
}

function sourceCheck(): RuleStyleCheck {
  const found = exercise.checks.find((check) => check.id === "preferred-width-kept");
  if (!found || found.type !== "rule-style") throw new Error("missing source check");
  return found;
}

test("real missing CSS rules display source feedback while the HTML target still exists", async ({ page }) => {
  await mount(page);
  const response = await run(page, "");
  expect(response.passed).toBe(false);
  expect(response.results.find((item) => item.id === "preferred-width-kept")?.reason).toBe("target-not-found");
  await expect(page.frameLocator("#runtime").locator(".avatar")).toHaveCount(1);
  const feedback = await show(page, response);
  await expect(feedback).toContainText("style.css");
  await expect(feedback).toContainText("CSS 规则");
  await expect(feedback).toContainText("请检查选择器和声明位置");
  await expect(feedback).toContainText("当前实现还未满足全部条件");
  await expect(feedback).not.toContainText("当前 learner HTML");
  await expect(feedback).not.toContainText("内容配置问题");
  const solved = await run(page, solution);
  expect(solved.passed).toBe(true);
  await show(page, solved);
  await expect(feedback).toContainText("全部检查通过");
  await expect(feedback).not.toContainText("请检查选择器和声明位置");
});

test("layout errors expose their actual reason without claiming the learner or platform is broken", async ({ page }) => {
  await mount(page);
  const response = await run(page, solution + ".avatar {transform:scale(1)}");
  const result = response.results.find((item) => item.id === "avatar-fits-frame");
  expect(result?.reason).toBe("checker-error");
  expect(typeof result?.actual).toBe("string");
  const feedback = await show(page, response);
  await expect(feedback).toContainText("本次布局检查无法完成");
  await expect(feedback).toContainText(String(result?.actual));
  await expect(feedback).toContainText("部分检查未能完成");
  await expect(feedback).not.toContainText("这更可能是题目检查规则或运行时的问题");
  await expect(feedback).not.toContainText("全部检查通过");
  expect((await run(page, solution)).passed).toBe(true);
});

test("real DOM absence retains the locked/editable HTML distinction", async ({ page }) => {
  await mount(page);
  const checks: Check[] = [{ id: "missing-dom", type: "exists", selector: ".absent", message: "DOM requirement" }];
  const response = await run(page, solution, checks);
  expect(response.results[0].reason).toBe("target-not-found");
  const feedback = await show(page, response, checks);
  await expect(feedback).toContainText("本题 HTML 为锁定内容");
  await expect(feedback).toContainText("内容配置问题");
  await expect(feedback).toContainText("部分检查未能完成");
  await show(page, response, checks, true);
  await expect(feedback).toContainText("本题允许编辑 HTML");
  await expect(feedback).toContainText("当前实现还未满足全部条件");
  await expect(feedback).not.toContainText("内容配置问题");
});

test("missing layout container names both targets rather than claiming the avatar is missing", async ({ page }) => {
  await mount(page);
  const checks: Check[] = [{ id: "missing-layout", type: "layout-contained", selector: ".avatar", within: ".absent", axis: "x", message: "Layout requirement" }];
  const response = await run(page, solution, checks);
  const feedback = await show(page, response, checks);
  await expect(feedback).toContainText("目标 .avatar 与容器 .absent");
  await expect(feedback).toContainText("本题 HTML 为锁定内容");
});

test("source media scope is explained and invalid selectors remain checker errors", async ({ page }) => {
  await mount(page);
  const scoped = { ...sourceCheck(), media: "(min-width: 5000px)" };
  const missing = await run(page, solution, [scoped]);
  expect(missing.results[0].reason).toBe("target-not-found");
  const feedback = await show(page, missing, [scoped]);
  await expect(feedback).toContainText("@media (min-width: 5000px)");
  const invalid = { ...sourceCheck(), selector: "[" };
  const error = await run(page, solution, [invalid]);
  expect(error.results[0].reason).toBe("checker-error");
  await show(page, error, [invalid]);
  await expect(feedback).toContainText("检测器执行异常");
  await expect(feedback).toContainText("部分检查未能完成");
  await expect(feedback).not.toContainText("当前实现还未满足全部条件");
});

test("unknown or ambiguous check IDs do not guess source type from diagnostic text", async ({ page }) => {
  await mount(page);
  const check = sourceCheck();
  const response = await run(page, "", [check]);
  for (const definitions of [[], [check, { ...check }], [{ ...check, id: "different" }]]) {
    const feedback = await show(page, response, definitions, true);
    await expect(feedback).toContainText("无法确认此检查的来源");
    await expect(feedback).not.toContainText("当前 learner HTML");
    await expect(feedback).not.toContainText("中找到要求的");
    await expect(feedback).toContainText("部分检查未能完成");
  }
});

test("layout detail is escaped as text and missing detail has an honest fallback", async ({ page }) => {
  await mount(page);
  const check = exercise.checks.find((check) => check.type === "layout-contained");
  if (!check) throw new Error("missing layout definition");
  const response = await run(page, solution + ".avatar {transform:scale(1)}", [check]);
  const injected = '<img src=x onerror="document.body.dataset.injected=1">';
  const feedback = await show(page, { ...response, results: [{ ...response.results[0], actual: injected }] }, [check]);
  await expect(feedback).toContainText(injected);
  await expect(feedback.locator("img")).toHaveCount(0);
  await show(page, { ...response, results: [{ ...response.results[0], actual: null }] }, [check]);
  await expect(feedback).toContainText("未获得具体原因");
  await expect(feedback).not.toContainText("全部检查通过");
});
