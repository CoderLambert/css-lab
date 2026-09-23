import { expect, test } from "@playwright/test";

test("studio audits the full M6B content tree and exposes only published learner entries", async ({
  page,
}) => {
  await page.goto("/studio");

  await expect(
    page.getByRole("heading", { level: 1, name: "CSS Lab Studio" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Content Health" }),
  ).toBeVisible();
  await expect(page.getByText("0 blocking issues")).toBeVisible();
  await expect(page.getByText("3 个 exercise 当前可进入 published learner chain。")).toBeVisible();

  const counts = page.getByRole("region", { name: "Content counts" });
  for (const [label, value] of [
    ["Courses", "1"],
    ["Modules", "9"],
    ["Lessons", "32"],
    ["Exercises", "100"],
  ] as const) {
    const card = counts.locator("div").filter({ hasText: label }).first();
    await expect(card.getByText(label, { exact: true })).toBeVisible();
    await expect(card.getByText(value, { exact: true })).toBeVisible();
  }

  const warningBadge = page.getByText("13 warnings", { exact: true });
  await expect(warningBadge).toBeVisible();
  const warningCodes = page.locator("li").filter({ hasText: "warning" }).locator("code");
  await expect(warningCodes).toHaveCount(13);
  const codes = await warningCodes.allTextContents();
  expect(new Set(codes)).toEqual(new Set(["exercise-without-checks"]));

  for (const forbiddenCode of [
    "published-child-hidden",
    "workspace-zero-editable",
    "browser-unsupported-language",
    "browser-multiple-html",
    "undeclared-starter-file",
    "missing-solution-file",
    "unexpected-solution-file",
    "exercise-source-inspection-failed",
    "published-lesson-empty",
    "published-module-empty",
    "published-course-empty",
  ]) {
    await expect(page.getByText(forbiddenCode, { exact: true })).toHaveCount(0);
  }

  const learnerLinks = page.getByRole("link", { name: "打开 learner" });
  await expect(learnerLinks).toHaveCount(3);
  await expect(learnerLinks.first()).toHaveAttribute(
    "href",
    "/learn/css-foundations/flexbox/flexbox-alignment/center-box",
  );
});

test("draft M6B curriculum remains fail-closed on learner routes", async ({
  page,
}) => {
  const response = await page.goto(
    "/learn/css-foundations/css-language-and-selection/css-rules-and-declarations/style-a-heading",
  );

  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /not found/i })).toBeVisible();
});
