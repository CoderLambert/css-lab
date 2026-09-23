import { expect, test } from "@playwright/test";

test("studio audits the full content tree and exposes published learner entries", async ({
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
  await expect(page.getByText("0 warnings")).toBeVisible();

  await expect(
    page.getByRole("heading", { level: 2, name: "Content Catalog" }),
  ).toBeVisible();
  // Draft module skeletons without a lessons directory must not break the
  // full-tree read; they still appear in the catalog.
  await expect(page.getByText("盒模型与常规流")).toBeVisible();

  const learnerLinks = page.getByRole("link", { name: "打开 learner" });
  await expect(learnerLinks).toHaveCount(100);
  await expect(
    page.locator(
      'a[href="/learn/css-foundations/box-model-and-flow/sizing-constraints-and-overflow/observe-intrinsic-content"]',
    ),
  ).toBeVisible();
  await expect(
    page.locator(
      'a[href="/learn/css-foundations/integration-and-debugging/responsive-component-capstone/build-responsive-profile"]',
    ),
  ).toBeVisible();
});
