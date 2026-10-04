import { expect, test } from "@playwright/test";

import {
  isCheckResultFault,
  resolveCheckDefinition,
  type CheckResult,
} from "../src/features/exercise/lib/check-result";
import type { Check, RuleStyleCheck } from "../src/lib/content/schemas/exercise";

const targetMissing: CheckResult = {
  id: "missing", message: "missing", passed: false,
  reason: "target-not-found", expected: true, actual: null,
};
const dom: Check = { id: "missing", type: "exists", selector: ".target", message: "DOM target" };
const source: RuleStyleCheck = {
  id: "missing", type: "rule-style", path: "style.css", selector: ".target",
  property: "width", equals: "320px", message: "Authored width",
};

test("target-not-found is learner-owned when HTML is editable", () => {
  expect(isCheckResultFault(targetMissing, { hasEditableHtml: true, check: dom })).toBe(false);
});

test("target-not-found is a content/check fault when HTML is locked", () => {
  expect(isCheckResultFault(targetMissing, { hasEditableHtml: false, check: dom })).toBe(true);
});

test("checker-error is always a checker/runtime fault", () => {
  for (const check of [dom, source]) {
    expect(isCheckResultFault({ ...targetMissing, reason: "checker-error" }, {
      hasEditableHtml: true, check,
    })).toBe(true);
  }
});

test("missing CSS rule is not mislabeled as missing locked HTML", () => {
  for (const hasEditableHtml of [true, false]) {
    expect(isCheckResultFault(targetMissing, { hasEditableHtml, check: source })).toBe(false);
  }
});

test("definition resolution is by unique host-owned ID, never array order or result text", () => {
  const other = { ...dom, id: "other" };
  expect(resolveCheckDefinition(targetMissing, [other, source])).toBe(source);
  expect(resolveCheckDefinition({ id: "absent" }, [source])).toBeNull();
  expect(resolveCheckDefinition(targetMissing, [source, dom])).toBeNull();
  for (const check of [null, other]) {
    expect(isCheckResultFault(targetMissing, { hasEditableHtml: true, check })).toBe(true);
  }
});
