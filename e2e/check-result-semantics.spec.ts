import { expect, test } from "@playwright/test";

import {
  isCheckResultFault,
  type CheckResult,
} from "../src/features/exercise/lib/check-result";

const targetMissing: CheckResult = {
  id: "missing",
  message: "missing",
  passed: false,
  reason: "target-not-found",
  expected: true,
  actual: null,
};

test("target-not-found is learner-owned when HTML is editable", () => {
  expect(
    isCheckResultFault(targetMissing, {
      hasEditableHtml: true,
    }),
  ).toBe(false);
});

test("target-not-found is a content/check fault when HTML is locked", () => {
  expect(
    isCheckResultFault(targetMissing, {
      hasEditableHtml: false,
    }),
  ).toBe(true);
});

test("checker-error is always a checker/runtime fault", () => {
  expect(
    isCheckResultFault(
      {
        ...targetMissing,
        reason: "checker-error",
      },
      { hasEditableHtml: true },
    ),
  ).toBe(true);
});
